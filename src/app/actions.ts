
'use server';

import { generateAIPersona } from '@/ai/flows/generate-ai-persona';
import { guideOrderingWithAI, GuideOrderingWithAIOutput } from '@/ai/flows/guide-ordering-with-ai';
import { findClientByPhone, createClient as createClientInDb, updateClient as updateClientInDb } from '@/lib/services/client.service';
import { getAllProducts, getAllCategories } from '@/lib/services/menu.service';
import { createOrder } from '@/lib/services/order.service';
import { DynamicComponentData, Message, Order, OrderItem, UserDetails, Client, Menu, ConversationState } from '@/lib/types';
import { unstable_cache } from 'next/cache';
import { Client as PrismaClient, Address as PrismaAddress } from '@prisma/client';

function serializeClient(client: (PrismaClient & { address: PrismaAddress | null }) | null): Client | null {
    if (!client) return null;
    
    // Converte os dados do Prisma para o tipo da aplicação
    const appClient: Client = {
        id: client.id,
        name: client.name,
        phone: client.phone,
        isActive: client.isActive,
        createdAt: client.createdAt,
        lastOrderAt: client.lastOrderAt,
        address: client.address ? {
            street: client.address.street || undefined,
            number: client.address.number || undefined,
            neighborhood: client.address.neighborhood || undefined,
            city: client.address.city || undefined,
            state: client.address.state || undefined,
            zipCode: client.address.zipCode || undefined,
            reference: client.address.reference || undefined,
        } : undefined,
    };

    return appClient;
}

export async function findOrCreateClient(data: UserDetails): Promise<Client> {
    console.log(`Buscando ou criando cliente com telefone: ${data.phone}`);
    const existingClient = await findClientByPhone(data.phone);

    if (existingClient) {
        console.log("Cliente encontrado:", existingClient.id);
        const serialized = serializeClient(existingClient);
        if (!serialized) throw new Error("Failed to serialize existing client");
        return serialized;
    }

    console.log("Cliente não encontrado, criando novo...");
    const newClientData = {
        name: data.name,
        phone: data.phone,
        address: data.address
    };

    const { success, data: newClient, error } = await createClientInDb(newClientData);
    
    if (!success || !newClient) {
        throw new Error(error || "Failed to create client in DB");
    }

    console.log("Novo cliente criado com ID:", newClient.id);
    const serialized = serializeClient(newClient);
    if (!serialized) throw new Error("Failed to serialize new client");
    return serialized;
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

export const getKnowledgeBase = unstable_cache(
    async (): Promise<Menu> => {
        console.log("Fetching knowledge base (from Prisma/MySQL)...");
        const categories = await getAllCategories();
        const products = await getAllProducts();

        const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

        const enrichedItems = products.map(product => ({
            ...product,
            price: product.price.toNumber(), // Convert Decimal to number
            category: categoryMap.get(product.categoryId) || 'Sem categoria'
        }));

        return { categories, items: enrichedItems };
    },
    ['knowledge-base'],
    { revalidate: 300 }
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
  console.log("Submitting order to Prisma...");
  
  if (!client.id) {
    console.error("Client ID is missing. Cannot submit order.");
    return { success: false };
  }

  const total = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const newOrder: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
    clientId: client.id,
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
  };

  try {
    const orderId = await createOrder(newOrder);
    console.log(`Order created successfully with ID: ${orderId}`);
    return { success: true, orderId };
  } catch (error) {
    console.error("Failed to submit order to Prisma:", error);
    return { success: false };
  }
}
