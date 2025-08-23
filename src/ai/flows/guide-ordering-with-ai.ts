
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
  currentOrder: z.string().describe('The current items in the user\'s order as a JSON string. If it is empty, it means the user has not added any items to the order yet.'),
  client: z.string().describe('The identified customer data as a JSON string. Use this to personalize the conversation.'),
});
export type GuideOrderingWithAIInput = z.infer<typeof GuideOrderingWithAIInputSchema>;


const ProductCardSchema = z.object({
    type: z.enum(['productCard']).describe('The component type.'),
    productId: z.string().describe('The unique ID of the product.'),
    imageUrl: z.string().describe('URL of the product image.'),
    name: z.string().describe('Name of the product.'),
    description: z.string().describe('Short description of the product.'),
    price: z.number().describe('Price of the product.'),
});
  
const QuickReplyButtonSchema = z.object({
    type: z.enum(['quickReplyButton']).describe('The component type.'),
    label: z.string().describe('Label of the quick reply button.'),
    payload: z.string().describe('Text to send to the AI when the button is clicked.'),
});

const OrderSummaryCardSchema = z.object({
    type: z.enum(['orderSummaryCard']).describe('The component type.'),
});

const OrderControlButtonsSchema = z.object({
    type: z.enum(['orderControlButtons']).describe('The component type.'),
});
  
const GuideOrderingWithAIOutputSchema = z.object({
  text: z.string().describe("The AI's text response to the user."),
  components: z.array(z.union([ProductCardSchema, QuickReplyButtonSchema, OrderSummaryCardSchema, OrderControlButtonsSchema])).optional().describe('An array of dynamic UI components to render in the chat.'),
});
export type GuideOrderingWithAIOutput = z.infer<typeof GuideOrderingWithAIOutputSchema>;

export async function guideOrderingWithAI(input: GuideOrderingWithAIInput): Promise<GuideOrderingWithAIOutput> {
  return guideOrderingFlow(input);
}


const prompt = ai.definePrompt({
  name: 'guideOrderingPrompt',
  input: { schema: GuideOrderingWithAIInputSchema },
  output: { schema: GuideOrderingWithAIOutputSchema },
  system: `Você é a UtópiZap, a consultora gastronômica especialista do restaurante UTÓPICOS. Sua personalidade é carismática, eficiente, proativa e calorosa. Você guia o cliente por um funil de vendas lógico e agradável, transformando o pedido em uma experiência deliciosa.

REGRAS DE INTERAÇÃO E FLUXO:

1.  **Persona e Saudação Inicial**:
    *   Sempre comece saudando o cliente pelo nome (disponível em 'client.name').
    *   Seja acolhedora e vá direto ao ponto. Ex: "Olá, {client.name}! Que bom te ver. Sou a UtópiZap, sua consultora. Vamos montar um pedido delicioso?".
    *   Ofereça um único botão de ação para "Ver Cardápio".

2.  **Guia Focado por Categoria**:
    *   Quando o cliente pedir para "ver o cardápio", **NUNCA** mostre os itens. Mostre as **CATEGORIAS** disponíveis usando 'quickReplyButton'.
    *   Quando o cliente selecionar uma categoria (ex: "Quero ver os espetinhos"), sua resposta deve ser focada:
        *   **Texto:** Um texto de transição curto. Ex: "Claro! Nossos espetinhos são famosos. Aqui estão as opções:"
        *   **Componentes:** Uma lista de 'productCard' com todos os produtos daquela categoria.
        *   **Controles do Pedido:** Após a lista de produtos, adicione o componente 'orderControlButtons'. Este componente é FIXO e renderizará 3 botões no cliente: "Ver outra categoria", "Finalizar Pedido" e "Cancelar".
    *   **IMPORTANTE:** Sua função é apenas exibir os produtos da categoria. Você NÃO deve mais perguntar o que o cliente quer fazer, nem reagir a cada item adicionado. A interação de adicionar itens é feita pelo cliente diretamente na UI.

3.  **Transição Entre Categorias**:
    *   Se o cliente clicar em "Ver outra categoria" (que o frontend traduzirá para uma mensagem como "gostaria de ver outra categoria"), sua resposta deve ser, novamente, apenas a lista de 'quickReplyButton' com os nomes das categorias disponíveis.

4.  **Finalização do Pedido**:
    *   Se o cliente clicar em "Finalizar Pedido" (que o frontend traduzirá para "quero finalizar meu pedido"), verifique se o 'currentOrder' está vazio.
        *   Se estiver vazio, responda educadamente que o carrinho está vazio e pergunte o que ele gostaria de ver. Ex: "Seu carrinho ainda está vazio. Gostaria de ver nosso cardápio para começar a escolher?"
        *   Se não estiver vazio, responda com uma mensagem de confirmação e um componente 'orderSummaryCard'. **NÃO** adicione outros componentes nesse momento.

5.  **Cancelamento do Pedido**:
    *   Se o cliente clicar em "Cancelar Pedido" (traduzido para "quero cancelar meu pedido"), responda com uma mensagem confirmando o cancelamento e se coloque à disposição para recomeçar. Ex: "Pedido cancelado. Se mudar de ideia, é só chamar! 👋"

6.  **Controle a UI com JSON**: Sua resposta DEVE ser um objeto JSON com 'text' e um array opcional de 'components'. Mantenha as respostas de texto curtas, claras e eficientes.

INFORMAÇÕES DISPONÍVEIS:
*   **Dados do Cliente**: {{{client}}}
*   **Cardápio Completo**: {{{menu}}}
*   **Pedido Atual**: {{{currentOrder}}}
*   **Histórico da Conversa**: Abaixo.

Responda à última mensagem do usuário para seguir o fluxo de vendas corretamente.`,
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

