
'use server';
/**
 * @fileOverview This file defines the Genkit flow for guiding users through the ordering process,
 * including upsell and cross-sell suggestions.
 *
 * - guideOrderingWithAI - A function that initiates the ordering process and guides the user with suggestions.
 * - GuideOrderingWithAIInput - The input type for the guideOrderingWithAI function.
 * - GuideOrderingWithAIOutput - The return type for the guideOrderingWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const MenuCategorySchema = z.object({
  id: z.string(),
  name: z.string().describe('The name of the menu category (e.g., Espetinhos, Guarnições).'),
  description: z.string().describe('A brief description of the category.'),
  nextStepSuggestion: z.string().optional().describe('The ID of the category to suggest after this one is finished.'),
});

const MenuItemSchema = z.object({
  id: z.string().describe('Unique identifier for the menu item.'),
  name: z.string().describe('Name of the menu item.'),
  description: z.string().describe('Description of the menu item.'),
  price: z.number().describe('Price of the menu item.'),
  imageUrl: z.string().describe('URL of the menu item image.'),
  category: z.string().describe('Category of the menu item.'),
});

const MenuSchema = z.object({
  categories: z.array(MenuCategorySchema).describe('List of menu categories.'),
  items: z.array(MenuItemSchema).describe('List of menu items.'),
});

export type Menu = z.infer<typeof MenuSchema>;

const GuideOrderingWithAIInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'ai']),
    content: z.string(),
  })).describe('The conversation history.'),
  menu: z.string().describe('The restaurant menu as a JSON string.'),
  currentOrder: z.string().describe('The current items in the user\'s order as a JSON string.'),
  client: z.string().describe('The identified customer data as a JSON string. Use this to personalize the conversation.'),
  lastAction: z.string().optional().describe('The last explicit action taken by the user, like "item_added" or "category_selected".'),
});
export type GuideOrderingWithAIInput = z.infer<typeof GuideOrderingWithAIInputSchema>;


const ProductCardSchema = z.object({
    type: z.literal('productCard'),
    productId: z.string().describe('The unique ID of the product.'),
    imageUrl: z.string().describe('URL of the product image.'),
    name: z.string().describe('Name of the product.'),
    description: z.string().describe('Short description of the product.'),
    price: z.number().describe('Price of the product.'),
});
  
const QuickReplyButtonSchema = z.object({
    type: z.literal('quickReplyButton'),
    label: z.string().describe('Label of the quick reply button.'),
    payload: z.string().describe('Text to send to the AI when the button is clicked.'),
});

const OrderSummaryCardSchema = z.object({
    type: z.literal('orderSummaryCard'),
});
  
const GuideOrderingWithAIOutputSchema = z.object({
  text: z.string().describe("The AI's text response to the user."),
  components: z.array(z.union([ProductCardSchema, QuickReplyButtonSchema, OrderSummaryCardSchema])).optional().describe('An array of dynamic UI components to render in the chat.'),
});
export type GuideOrderingWithAIOutput = z.infer<typeof GuideOrderingWithAIOutputSchema>;

export async function guideOrderingWithAI(input: GuideOrderingWithAIInput): Promise<GuideOrderingWithAIOutput> {
  return guideOrderingFlow(input);
}

const findUpsellAndCrossSell = ai.defineTool({
  name: 'findUpsellAndCrossSell',
  description: 'Suggests relevant upsells and cross-sells based on the current order and the menu. This tool should be used after the customer has indicated one or more items they want to order to enrich the conversation and increase the order value.',
  inputSchema: z.object({
    orderedItemNames: z.array(z.string()).describe('Names of the items already in the order.'),
    menuString: z.string().describe('The restaurant menu as a JSON string.'),
  }),
  outputSchema: z.object({
    suggestions: z.array(z.string()).describe('List of suggested upsell and cross-sell item names.'),
  }),
},
async (input) => {
  const { orderedItemNames, menuString } = input;
  const menu: Menu = JSON.parse(menuString);
  const suggestions: string[] = [];
  if (orderedItemNames.length === 0) {
    return { suggestions: [] };
  }

  const lastOrderedItemName = orderedItemNames[orderedItemNames.length - 1];
  const lastOrderedItem = menu.items.find(item => item.name === lastOrderedItemName);

  if (lastOrderedItem) {
    const lastOrderedItemCategory = menu.categories.find(cat => cat.name === lastOrderedItem.category);
    
    // Suggest next logical category (cross-sell)
    if (lastOrderedItemCategory?.nextStepSuggestion) {
        const nextCategory = menu.categories.find(cat => cat.id === lastOrderedItemCategory.nextStepSuggestion);
        if (nextCategory) {
            suggestions.push(`Ver ${nextCategory.name}`);
        }
    }

    // Suggest a popular side dish if the item is a main course (upsell)
    if (lastOrderedItem.category === 'Espetinhos') {
      const popularSide = menu.items.find(item => item.name === 'Farofa da Casa');
      if (popularSide && !orderedItemNames.includes(popularSide.name)) {
        suggestions.push(popularSide.name);
      }
    }
  }

  // Suggest a drink if no drink is in the order
  const hasDrink = menu.items.some(item => orderedItemNames.includes(item.name) && item.category === 'Bebidas');
  if (!hasDrink) {
    const popularDrink = menu.items.find(item => item.name === 'Coca-Cola');
    if (popularDrink) {
      suggestions.push(popularDrink.name);
    }
  }

  return { suggestions: suggestions.filter(s => s) }; // Filter out null/undefined
});

const prompt = ai.definePrompt({
  name: 'guideOrderingPrompt',
  input: { schema: GuideOrderingWithAIInputSchema },
  output: { schema: GuideOrderingWithAIOutputSchema },
  tools: [findUpsellAndCrossSell],
  system: `Você é a UtópiZap, a consultora gastronômica especialista do restaurante UTÓPICOS. Sua personalidade é carismática, eficiente, proativa e calorosa. Você guia o cliente por um funil de vendas lógico e agradável, transformando o pedido em uma experiência deliciosa.

FUNIL DE VENDAS / REGRAS DE INTERAÇÃO:

1.  **Persona e Saudação Inicial**:
    *   Sempre comece saudando o cliente pelo nome (disponível em 'client.name').
    *   Seja acolhedora e vá direto ao ponto, incentivando-o a começar. Ex: "Olá, {client.name}! Que bom te ver. Sou a UtópiZap, sua consultora. Vamos montar um pedido delicioso?".
    *   Ofereça um único botão de ação para "Ver Cardápio".

2.  **Guia Focado por Categoria**:
    *   Quando o cliente pedir para "ver o cardápio", **NUNCA** mostre os itens. Mostre as **CATEGORIAS** disponíveis usando 'quickReplyButton'.
    *   Quando o cliente selecionar uma categoria, seu foco se fecha **APENAS** nela. Mostre os produtos daquela categoria usando 'productCard'.

3.  **Técnica Anti-Loop e Upsell (Após Adicionar um Item)**:
    *   Quando a 'lastAction' for 'item_added', o cliente acabou de adicionar um item. Sua resposta **DEVE** ser focada.
    *   Pergunte se ele deseja algo mais **DA MESMA CATEGORIA** ou se prefere passar para a próxima.
    *   Use a 'nextStepSuggestion' da categoria atual para sugerir o próximo passo lógico.
    *   **Exemplo**: Cliente adicionou um espetinho. A categoria 'Espetinhos' sugere 'Guarnições'. Sua resposta: "Espetinho de Alcatra adicionado! Gostaria de mais algum espetinho ou já podemos ver as guarnições para acompanhar?"
    *   **Botões de Resposta Rápida Obrigatórios**: "Ver mais espetinhos" e "Sim, ver guarnições".

4.  **Transição Proativa e Cross-sell**:
    *   Se o cliente clicar no botão para ver a próxima categoria sugerida (ex: "Sim, ver guarnições"), exiba os 'productCard' daquela nova categoria com um texto de transição.
    *   **Exemplo**: "Perfeito! Nossas guarnições são o acompanhamento ideal. Qual delas você gostaria?"

5.  **Finalização do Pedido**:
    *   Quando o cliente indicar que quer finalizar ("finalizar", "fechar a conta", "acabou"), responda com uma mensagem de confirmação e um componente 'orderSummaryCard'. **NÃO** adicione outros componentes nesse momento.

6.  **Controle a UI com JSON**: Sua resposta DEVE ser um objeto JSON com 'text' e um array opcional de 'components'. Deixe os componentes visuais fazerem o trabalho pesado. Mantenha as respostas de texto curtas, claras e eficientes.

INFORMAÇÕES DISPONÍVEIS:
*   **Dados do Cliente**: {{{client}}}
*   **Cardápio Completo**: {{{menu}}}
*   **Pedido Atual**: {{{currentOrder}}}
*   **Histórico da Conversa**: Abaixo.

Responda à última mensagem do usuário, considerando a última ação explícita dele ('lastAction'), para seguir o funil de vendas corretamente.`,
  prompt: `Histórico da Conversa:
{{#each history}}
- {{role}}: {{content}}
{{/each}}

Última ação do usuário: "{{lastAction}}"
Última mensagem do usuário: "{{history.[history.length-1].content}}"
`,
});

const guideOrderingFlow = ai.defineFlow(
  {
    name: 'guideOrderingFlow',
    inputSchema: GuideOrderingWithAIInputSchema,
    outputSchema: GuideOrderingWithAIOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

