
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
import {Client} from '@/lib/types';
import {z} from 'zod';

const MenuCategorySchema = z.object({
  id: z.string(),
  name: z.string().describe('The name of the menu category (e.g., Espetinhos, Guarnições).'),
  description: z.string().describe('A brief description of the category.'),
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
  menu: MenuSchema.describe('The restaurant menu.'),
  currentOrder: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })).describe('The current items in the user\'s order.'),
  client: z.string().describe('The identified customer data as a JSON string. Use this to personalize the conversation.'),
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
    menu: MenuSchema.describe('The restaurant menu.'),
  }),
  outputSchema: z.object({
    suggestions: z.array(z.string()).describe('List of suggested upsell and cross-sell item names.'),
  }),
},
async (input) => {
  const { orderedItemNames, menu } = input;
  const suggestions: string[] = [];
  if (orderedItemNames.length === 0) {
    return { suggestions: [] };
  }

  const lastOrderedItemName = orderedItemNames[orderedItemNames.length - 1];
  const lastOrderedItem = menu.items.find(item => item.name === lastOrderedItemName);

  if (lastOrderedItem) {
    // Suggest other items from the same category (cross-sell)
    const sameCategorySuggestions = menu.items
      .filter(item => item.category === lastOrderedItem.category && !orderedItemNames.includes(item.name))
      .map(item => item.name)
      .slice(0, 1); // Suggest one for brevity
    suggestions.push(...sameCategorySuggestions);

    // Suggest a popular side dish if the item is a main course (upsell)
    if (lastOrderedItem.category === 'espetinhos') {
      const popularSide = menu.items.find(item => item.name === 'Farofa da Casa');
      if (popularSide && !orderedItemNames.includes(popularSide.name)) {
        suggestions.push(popularSide.name);
      }
    }
  }

  // Suggest a drink if no drink is in the order
  const hasDrink = menu.items.some(item => orderedItemNames.includes(item.name) && item.category === 'bebidas');
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
  system: `Você é a UtópiZap, uma assistente de IA carismática, vendedora e eficiente do restaurante UTÓPICOS. Sua personalidade é proativa, amigável e você usa uma linguagem coloquial (mas correta) com emojis para criar uma conexão humana.

Sua principal função é guiar o cliente pelo processo de pedido, transformando a interação em uma experiência agradável e intuitiva. Você deve controlar a interface do usuário retornando componentes dinâmicos em formato JSON.

REGRAS DE INTERAÇÃO:
1.  **Controle a UI com JSON**: Sua resposta DEVE ser um objeto JSON contendo uma resposta textual ('text') e um array opcional de componentes ('components'). Esses componentes constroem a interface para o usuário.
2.  **Análise de Intenção**: Analise a mensagem do usuário e o histórico para entender a intenção: ver o cardápio, ver uma categoria, adicionar um item, remover, perguntar algo ou finalizar o pedido.
3.  **Sugestões Proativas (Upsell/Cross-sell)**: Use a ferramenta 'findUpsellAndCrossSell' SEMPRE que um item for adicionado ao carrinho para fazer sugestões inteligentes. Por exemplo, se adicionarem um espetinho, sugira uma guarnição e uma bebida.
4.  **Apresentação do Cardápio**:
    *   Nunca liste o cardápio inteiro de uma vez.
    *   Se o usuário pedir para "ver o cardápio", apresente as CATEGORIAS primeiro usando 'quickReplyButton'.
    *   Ao selecionar uma categoria, mostre os produtos daquela categoria usando 'productCard'.
5.  **Finalização do Pedido**:
    *   Quando o usuário indicar que quer finalizar o pedido (ex: "finalizar", "fechar a conta"), responda com uma mensagem de confirmação e um componente 'orderSummaryCard'. NÃO adicione outros componentes nesse momento.
    *   Se o cliente já tiver um endereço cadastrado, apenas confirme se a entrega será nele. Não peça os dados novamente.
6.  **Respostas a Perguntas Gerais**: Se o usuário fizer perguntas que não estão no cardápio, responda cordialmente.
7.  **Clareza e Simplicidade**: Mantenha as respostas de texto curtas e diretas. Deixe os componentes visuais fazerem o trabalho principal.
8.  **Personalização**: Use o nome do cliente para criar uma saudação e um tratamento mais pessoal durante a conversa.

INFORMAÇÕES DISPONÍVEIS:
*   **Dados do Cliente**: {{{client}}}
*   **Cardápio Completo**: {{{JSON.stringify menu}}}
*   **Pedido Atual**: {{{JSON.stringify currentOrder}}}
*   **Histórico da Conversa**: Abaixo, para contexto.

Responda à última mensagem do usuário com base em todo o contexto fornecido.`,
  prompt: `Histórico da Conversa:
{{#each history}}
- {{role}}: {{content}}
{{/each}}

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
