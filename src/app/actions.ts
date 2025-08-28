
'use server';

import { generateAIPersona } from '@/ai/flows/generate-ai-persona';
import { guideOrderingWithAI, GuideOrderingWithAIOutput } from '@/ai/flows/guide-ordering-with-ai';
import { findClientByPhone, createClient as createClientInDb, updateClient as updateClientInDb } from '@/lib/firebase/clients';
import { getAllProducts, getAllCategories } from '@/lib/firebase/menu';
import { createOrder } from '@/lib/firebase/orders';
import { DynamicComponentData, Message, Order, OrderItem, UserDetails, Client, Menu, ConversationState } from '@/lib/types';
import { unstable_cache } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';


function serializeClient(client: Client): Client {
    const serializeTimestamp = (timestamp: any): Date => {
        if (timestamp instanceof Timestamp) {
            return timestamp.toDate();
        }
        if (timestamp.toDate) { // Handle client-side timestamp objects
            return timestamp.toDate();
        }
        return new Date(timestamp);
    };

    const clientData: any = { ...client };

    if (clientData.createdAt) {
        clientData.createdAt = serializeTimestamp(clientData.createdAt);
    }
    if (clientData.lastOrderAt) {
        clientData.lastOrderAt = serializeTimestamp(clientData.lastOrderAt);
    }

    return clientData as Client;
}


export async function findOrCreateClient(data: UserDetails): Promise<Client> {
    console.log(`Buscando ou criando cliente com telefone: ${data.phone}`);
    const existingClient = await findClientByPhone(data.phone);

    if (existingClient) {
        console.log("Cliente encontrado:", existingClient.id);
        return serializeClient(existingClient);
    }

    console.log("Cliente não encontrado, criando novo...");
    const newClientData: Partial<Client> = {
        ...data,
        createdAt: Timestamp.now() as any, // Cast to any to avoid type mismatch
        lastOrderAt: Timestamp.now() as any,
    };
    const { success, id } = await createClientInDb(newClientData);
    
    if (!success || !id) {
        throw new Error("Failed to create client in DB");
    }

    console.log("Novo cliente criado com ID:", id);

    const clientWithId = { ...newClientData, id: id };
    return serializeClient(clientWithId as Client);
}


export async function getInitialGreeting(clientName?: string): Promise<string> {
    if (clientName) {
        return `Olá, ${clientName}! 👋 Bem-vindo(a) de volta ao SatiZap! Sou seu consultor especialista. Vamos montar um orçamento hoje?`;
    }
  const persona = await generateAIPersona({});
  return persona.greeting;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<{success: boolean, error?: string}> {
    return updateClientInDb(id, data);
}

// "Rule of Gold": Cache the knowledge base to be read only once per session/defined interval.
export const getKnowledgeBase = unstable_cache(
    async (): Promise<Menu> => {
        console.log("Fetching knowledge base (from Firestore)...");
        const categories = await getAllCategories();
        const products = await getAllProducts();

        // Create a map for quick category lookup
        const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

        // Enrich products with the category name
        const enrichedItems = products.map(product => ({
            ...product,
            category: categoryMap.get(product.categoryId) || 'Sem categoria' // Get category name
        }));

        return { categories, items: enrichedItems };
    },
    ['knowledge-base'], // Cache key
    { revalidate: 300 } // Revalidate every 5 minutes
);


function mapAiComponentsToAppComponents(aiComponents: GuideOrderingWithAIOutput['components']): DynamicComponentData[] {
  if (!aiComponents) return [];

  return aiComponents.map(comp => {
    if (!comp || !comp.type) return null;
    
    switch (comp.type) {
      case 'productCard':
        return {
          type: 'productCard',
          productId: comp.productId,
          imageUrl: comp.imageUrl || 'https://placehold.co/600x400.png',
          name: comp.name,
          description: comp.description,
          price: comp.price,
        };
      case 'quickReplyButton':
        return {
          type: 'quickReplyButton',
          label: comp.label,
          payload: comp.payload
        };
      case 'orderSummaryCard':
        return {
            type: 'orderSummaryCard',
            summary: comp.summary,
            total: comp.total,
        };
      case 'orderControlButtons':
        return {
            type: 'orderControlButtons'
        };
      default:
        // This will catch any unexpected component types from the AI
        console.warn('Unknown component type received from AI:', comp);
        return null;
    }
  }).filter((c): c is DynamicComponentData => c !== null);
}


export async function getAiResponse(
  history: Message[],
  currentOrder: OrderItem[],
  client: Client,
  currentState: ConversationState
): Promise<{ text: string; components?: DynamicComponentData[] }> {
    
  const knowledgeBase = await getKnowledgeBase();
  const aiHistory = history.map(msg => ({ role: msg.role, content: msg.content }));
  
  const response = await guideOrderingWithAI({
      history: aiHistory,
      knowledgeBase: JSON.stringify(knowledgeBase),
      currentOrder: JSON.stringify(currentOrder),
      client: JSON.stringify(client),
      currentState,
  });
  
  const components = mapAiComponentsToAppComponents(response.components || []);

  return { text: response.text, components };
}

export async function submitOrder(client: Client, orderItems: OrderItem[]): Promise<{ success: boolean; orderId?: string }> {
  console.log("Submitting order to Firestore...");
  
  const total = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const newOrder: Omit<Order, 'id'> = {
    clientId: client.id!,
    clientInfo: {
        name: client.name,
        phone: client.phone,
        address: client.address,
    },
    items: orderItems.map(item => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price
    })),
    totalAmount: total,
    status: 'Recebido',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const orderId = await createOrder(newOrder);
    console.log(`Order created successfully with ID: ${orderId}`);
    return { success: true, orderId };
  } catch (error) {
    console.error("Failed to submit order to Firestore:", error);
    return { success: false };
  }
}

    