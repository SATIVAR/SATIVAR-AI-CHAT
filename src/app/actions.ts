
'use server';

import { generateAIPersona } from '@/ai/flows/generate-ai-persona';
import { guideOrderingWithAI, GuideOrderingWithAIOutput } from '@/ai/flows/guide-ordering-with-ai';
import { menu } from '@/lib/menu';
import { DynamicComponentData, Message, Order, OrderItem } from '@/lib/types';
import { unstable_cache } from 'next/cache';

export async function getInitialGreeting(): Promise<string> {
  // This could be cached as well if the persona greeting doesn't need to be unique every single time.
  const persona = await generateAIPersona({});
  return persona.greeting;
}

// "Rule of Gold": Cache the knowledge base to be read only once per session/defined interval.
export const getKnowledgeBase = unstable_cache(
    async () => {
        // In a real application, this is where you would fetch data from Firestore.
        // For now, we continue to use the static menu, but the caching mechanism is in place.
        console.log("Fetching knowledge base (from static file)...");
        return Promise.resolve(menu);
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

export async function submitOrder(order: Order): Promise<{ success: boolean }> {
  console.log("Submitting order to Firestore:", order);
  // In a real application, you would use the Firebase Admin SDK here to write to Firestore
  // e.g., await db.collection('orders').add(order);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For now, we'll just log and assume success.
  return { success: true };
}
