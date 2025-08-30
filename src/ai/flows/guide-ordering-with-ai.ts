
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
  knowledgeBase: z.string().describe('The restaurant menu or product catalog as a JSON string.'),
  currentOrder: z.string().describe('The current items in the user\'s order as a JSON string. If it is empty, it means the user has not added any items to the order yet.'),
  client: z.string().describe('The identified customer data as a JSON string. Use this to personalize the conversation.'),
  currentState: ConversationStateSchema.describe('The current state of the conversation machine.'),
  association: z.any().optional().describe('The association data for tenant-specific customization.'),
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
    summary: z.string().optional().describe('A plain text summary of the order items, with each item on a new line.'),
    total: z.number().optional().describe('The total amount of the order.'),
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
  system: `Você é SatiZap, um assistente especialista e empático de {{#if association}}{{association.name}}{{else}}uma associação de cannabis medicinal{{/if}}. Sua missão é ajudar os pacientes a montar um orçamento claro e preciso com base nos produtos disponíveis e na receita ou lista que eles fornecerem.

{{#if association.aiDirectives}}
### DIRETRIZES ESPECÍFICAS DE ATENDIMENTO ###
Siga estritamente as seguintes diretrizes em todas as suas interações:
{{association.aiDirectives}}

{{/if}}
{{#if association.aiRestrictions}}
### RESTRIÇÕES OBRIGATÓRIAS ###
Sob nenhuma circunstância você deve:
{{association.aiRestrictions}}

{{/if}}
### DIRETRIZES DE INTERAÇÃO ###

1.  **Análise de Texto:** Analise a conversa e, principalmente, a ÚLTIMA MENSAGEM DO USUÁRIO. O texto pode conter nomes de produtos, dosagens e quantidades. No futuro, ele também poderá conter texto extraído de uma imagem de receita (OCR).

2.  **Identificação de Produtos:** Identifique os produtos mencionados. Use a 'knowledgeBase' (base de conhecimento em JSON) para encontrar os produtos exatos, seus preços e detalhes.

3.  **Montagem da Resposta:**
    *   **Se o paciente pedir o catálogo ou categorias:** Apresente as categorias disponíveis usando 'quickReplyButton'. Após os botões de categoria, SEMPRE adicione botões para "Finalizar Tratamento" e "Cancelar".
    *   **Se o paciente escolher uma categoria:** Mostre os produtos daquela categoria usando 'productCard'. Após os cards, SEMPRE adicione botões para "Ver outras categorias", "Finalizar Tratamento" e "Cancelar".
    *   **Se o paciente perguntar sobre produtos ou enviar uma lista:** Responda de forma conversacional e empatíca. Se encontrar os produtos na base de conhecimento, pode apresentá-los com 'productCard'. Se não encontrar, informe educadamente.
    *   **Se o paciente pedir para finalizar:** Verifique o 'currentOrder'. Se houver itens, responda com um 'orderSummaryCard' para confirmação. Se estiver vazio, sugira ver o catálogo.
    *   **Se o paciente pedir para cancelar:** Confirme o cancelamento e ofereça ajuda para recomeçar.

4.  **Personalização:** Use os dados do paciente para personalizar a saudação e a conversa, sempre focando no cuidado e bem-estar.

5.  **Foco em Ferramentas (Visão Futura):** Lembre-se que, no futuro, você usará "Tools" (ferramentas de IA) para buscar produtos em um sistema externo. Sua lógica deve ser flexível para se adaptar a isso. Por enquanto, a 'knowledgeBase' é sua única fonte da verdade.

{{#if association.promptContext}}
### CONTEXTO ESPECÍFICO DA ASSOCIAÇÃO ###
{{association.promptContext}}

{{/if}}
### INFORMAÇÕES DISPONÍVEIS ###
*   **Base de Conhecimento (Produtos):** {{{knowledgeBase}}}
*   **Dados do Cliente:** {{{client}}}
*   **Orçamento/Pedido Atual:** {{{currentOrder}}}
*   **Histórico da Conversa:** Abaixo.

Responda à última mensagem do paciente de forma precisa, empática e focada no cuidado, seguindo as diretrizes para ajudar na seleção do tratamento adequado.`,
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
    
