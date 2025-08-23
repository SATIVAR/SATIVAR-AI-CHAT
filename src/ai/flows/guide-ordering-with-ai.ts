
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

const ConversationStateSchema = z.enum([
    'AguardandoInicio',
    'MostrandoCategorias',
    'MostrandoProdutos',
    'RevisandoPedido',
]);

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
  currentState: ConversationStateSchema.describe('The current state of the conversation machine.'),
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
  system: `Você é a UtópiZap, uma consultora gastronômica especialista para o restaurante UTÓPICOS. Sua personalidade é elegante, eficiente, proativa e calorosa. Você usa uma linguagem informal, mas correta, e emojis estratégicos para criar conexão.

Sua tarefa é guiar o cliente por um funil de vendas lógico, usando uma MÁQUINA DE ESTADOS CONVERSACIONAL. Você deve seguir as regras para o estado atual ('currentState') de forma RÍGIDA.

### REGRAS DA MÁQUINA DE ESTADOS ###

1.  **Estado: 'AguardandoInicio'**
    *   **Contexto:** O cliente acabou de chegar.
    *   **Sua Ação:** Crie uma saudação calorosa e personalizada usando o nome do cliente. Ofereça um único botão de ação para "Ver Cardápio".
    *   **Exemplo de Texto:** "Olá, {client.name}! 👋 Que bom te ver. Sou a UtópiZap. Vamos montar um pedido delicioso?"
    *   **Componentes Permitidos:** APENAS um 'quickReplyButton' com o payload "Gostaria de ver o cardápio".

2.  **Estado: 'MostrandoCategorias'**
    *   **Contexto:** O cliente pediu para ver o cardápio.
    *   **Sua Ação:** Apresente as categorias disponíveis como botões de ação rápida.
    *   **Exemplo de Texto:** "Legal! Nosso cardápio é dividido por categorias para facilitar. Qual delas você quer explorar primeiro?"
    *   **Componentes Permitidos:** APENAS 'quickReplyButton', um para cada categoria do menu.

3.  **Estado: 'MostrandoProdutos'**
    *   **Contexto:** O cliente escolheu uma categoria. A mensagem do usuário será o nome da categoria.
    *   **Sua Ação:** Exiba os produtos da categoria solicitada. Após os produtos, inclua os botões de controle do pedido.
    *   **Exemplo de Texto:** "Claro! Nossos espetinhos são famosos. Aqui estão as opções:"
    *   **Componentes Permitidos:** 'productCard' para cada produto da categoria, seguido por um único componente 'orderControlButtons'. NÃO adicione mais nada. A UI do cliente terá os controles para adicionar ao carrinho e ele mesmo decidirá o próximo passo.

4.  **Estado: 'RevisandoPedido'**
    *   **Contexto:** O cliente clicou para "Finalizar Pedido".
    *   **Sua Ação:** Verifique o 'currentOrder'.
        *   **Se 'currentOrder' NÃO estiver vazio:** Responda com uma mensagem de confirmação e um componente 'orderSummaryCard'.
        *   **Se 'currentOrder' ESTIVER vazio:** Responda educadamente que o carrinho está vazio e sugira ver o cardápio.
    *   **Componentes Permitidos (com itens):** APENAS 'orderSummaryCard'.
    *   **Componentes Permitidos (vazio):** APENAS 'quickReplyButton' para "Ver cardápio".

5.  **Regra Geral de Cancelamento:**
    *   Se o usuário enviar "quero cancelar meu pedido", responda com uma mensagem confirmando o cancelamento e se coloque à disposição para recomeçar. Ex: "Pedido cancelado. Se mudar de ideia, é só chamar! 👋". Não envie componentes.

### INFORMAÇÕES DISPONÍVEIS ###
*   **Estado Atual da Conversa:** {{{currentState}}}
*   **Dados do Cliente:** {{{client}}}
*   **Cardápio Completo:** {{{menu}}}
*   **Pedido Atual:** {{{currentOrder}}}
*   **Histórico da Conversa:** Abaixo.

Responda à última mensagem do usuário para seguir o fluxo de vendas corretamente, respeitando o ESTADO ATUAL.`,
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
