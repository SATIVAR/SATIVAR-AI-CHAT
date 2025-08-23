
'use server';

import { generateAIPersona } from '@/ai/flows/generate-ai-persona';
import { guideOrderingWithAI, GuideOrderingWithAIOutput } from '@/ai/flows/guide-ordering-with-ai';
import { getAllProducts, getAllCategories } from '@/lib/firebase/menu';
import { createOrder } from '@/lib/firebase/orders';
import { DynamicComponentData, Message, Order, OrderItem, UserDetails } from '@/lib/types';
import { unstable_cache } from 'next/cache';
import { Timestamp } from 'firebase/firestore';

export async function getInitialGreeting(): Promise<string> {
  // This could be cached as well if the persona greeting doesn't need to be unique every single time.
  const persona = await generateAIPersona({});
  return persona.greeting;
}

// "Rule of Gold": Cache the knowledge base to be read only once per session/defined interval.
export const getKnowledgeBase = unstable_cache(
    async () => {
        console.log("Fetching knowledge base (from Firestore)...");
        const categories = await getAllCategories();
        const items = await getAllProducts();
        return { categories, items };
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
            type: 'orderSummaryCard'
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
  currentOrder: OrderItem[]
): Promise<{ text: string; components?: DynamicComponentData[] }> {
    
  const knowledgeBase = await getKnowledgeBase();

  const aiHistory = history.map(msg => ({ role: msg.role, content: msg.content }));

  const response = await guideOrderingWithAI({
      history: aiHistory,
      menu: knowledgeBase,
      currentOrder: currentOrder,
  });
  
  const components = mapAiComponentsToAppComponents(response.components || []);

  return { text: response.text, components };
}

export async function submitOrder(customer: UserDetails, orderItems: OrderItem[]): Promise<{ success: boolean; orderId?: string }> {
  console.log("Submitting order to Firestore...");
  
  const total = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const newOrder: Order = {
    clientInfo: customer,
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
