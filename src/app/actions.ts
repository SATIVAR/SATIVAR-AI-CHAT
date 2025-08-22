
'use server';

import { generateAIPersona } from '@/ai/flows/generate-ai-persona';
import { renderDynamicComponents, RenderDynamicComponentsOutput } from '@/ai/flows/render-dynamic-components';
import { menu } from '@/lib/menu';
import { DynamicComponentData, Order } from '@/lib/types';

export async function getInitialGreeting(): Promise<string> {
  const persona = await generateAIPersona({});
  return persona.greeting;
}

function mapAiComponentsToAppComponents(aiComponents: RenderDynamicComponentsOutput['components']): DynamicComponentData[] {
  if (!aiComponents) return [];

  return aiComponents.map(comp => {
    switch (comp.type) {
      case 'productCard':
        const product = menu.items.find(item => item.name === comp.name);
        return {
          type: 'productCard',
          productId: product?.id || 'unknown',
          imageUrl: product?.imageUrl || 'https://placehold.co/600x400.png',
          name: comp.name,
          description: comp.description,
          price: comp.price,
          action: comp.action
        };
      case 'quickReplyButton':
        return {
          type: 'quickReplyButton',
          label: comp.label,
          payload: comp.payload
        };
      // A simple text check for the summary card trigger
      case 'orderSummaryCard' as any: // type cast for now
        return {
            type: 'orderSummaryCard'
        };
      default:
        return null;
    }
  }).filter((c): c is DynamicComponentData => c !== null);
}

function findSummaryCardTrigger(text: string): boolean {
    const triggers = ["resumo do pedido", "finalizar pedido", "confirmar pedido", "seu pedido ficou assim"];
    const lowerCaseText = text.toLowerCase();
    return triggers.some(trigger => lowerCaseText.includes(trigger));
}


export async function getAiResponse(
  query: string,
  orderHistory: string[]
): Promise<{ text: string; components?: DynamicComponentData[] }> {
    const fullQuery = `
    Histórico do Pedido Atual:
    ${orderHistory.join('\n') || 'Nenhum item adicionado ainda.'}

    Cardápio Disponível (para referência, não mostre a lista inteira de uma vez):
    ${JSON.stringify(menu)}

    Mensagem do Cliente: "${query}"
  `;

  const response = await renderDynamicComponents({ query: fullQuery });
  
  // Extract text response from the AI output. 
  // For this app, the primary text response is not a direct field, so we synthesize one if needed.
  let textResponse = "Como posso ajudar?"; 
  if (response.components && response.components.length > 0) {
      const firstProduct = response.components.find(c => c.type === 'productCard');
      if(firstProduct) {
          textResponse = `Claro! Aqui estão os itens que encontrei:`;
      }
  }

  // The AI might implicitly signal an order summary. We check for text triggers.
  const hasSummaryCard = findSummaryCardTrigger(query);

  let components = mapAiComponentsToAppComponents(response.components || []);

  if (hasSummaryCard && !components.some(c => c.type === 'orderSummaryCard')) {
    components.push({ type: 'orderSummaryCard' });
    textResponse = "Ok, aqui está o resumo do seu pedido. Por favor, confirme se está tudo certo. 😉";
  }

  return { text: textResponse, components };
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
