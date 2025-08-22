
'use server';

/**
 * @fileOverview A Genkit flow for rendering dynamic components based on the AI's response.
 *
 * This file exports:
 * - `renderDynamicComponents`: An async function that takes a user query and returns a JSON response containing dynamic components to render.
 * - `RenderDynamicComponentsInput`: The input type for the `renderDynamicComponents` function.
 * - `RenderDynamicComponentsOutput`: The output type for the `renderDynamicComponents` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Zod schema for product card
const ProductCardSchema = z.object({
  type: z.string().describe("The type of the component, which should be 'productCard'."),
  imageUrl: z.string().describe('URL of the product image.'),
  name: z.string().describe('Name of the product.'),
  description: z.string().describe('Short description of the product.'),
  price: z.number().describe('Price of the product.'),
  action: z.string().describe('Action to perform when the card is clicked (e.g., add to order).'),
});

// Define Zod schema for quick reply button
const QuickReplyButtonSchema = z.object({
  type: z.string().describe("The type of the component, which should be 'quickReplyButton'."),
  label: z.string().describe('Label of the quick reply button.'),
  payload: z.string().describe('Text to send to the AI when the button is clicked.'),
});

// Define Zod schema for the dynamic components response
const RenderDynamicComponentsOutputSchema = z.object({
  components: z.array(z.union([ProductCardSchema, QuickReplyButtonSchema])).describe('An array of dynamic components to render.'),
});
export type RenderDynamicComponentsOutput = z.infer<typeof RenderDynamicComponentsOutputSchema>;

// Define Zod schema for the user query input
const RenderDynamicComponentsInputSchema = z.object({
  query: z.string().describe('The user query.'),
});
export type RenderDynamicComponentsInput = z.infer<typeof RenderDynamicComponentsInputSchema>;

export async function renderDynamicComponents(input: RenderDynamicComponentsInput): Promise<RenderDynamicComponentsOutput> {
  return renderDynamicComponentsFlow(input);
}

const renderDynamicComponentsPrompt = ai.definePrompt({
  name: 'renderDynamicComponentsPrompt',
  input: {schema: RenderDynamicComponentsInputSchema},
  output: {schema: RenderDynamicComponentsOutputSchema},
  prompt: `You are UtópiZap, a carismatic and efficient AI assistant for UTÓPICOS restaurant.
  Your task is to process user queries and return a JSON response containing dynamic components to render in the chat interface.

  Based on the user's query, provide a set of components, including product cards and quick reply buttons, to help the user navigate the menu and place an order.

  Example:
  User Query: Olá! Quero ver os espetinhos

  Response:
  {
    "components": [
      {
        "type": "productCard",
        "imageUrl": "url_to_alcatra_image",
        "name": "Espetinho de Alcatra",
        "description": "Delicioso espetinho de alcatra.",
        "price": 10.00,
        "action": "add_alcatra"
      },
      {
        "type": "productCard",
        "imageUrl": "url_to_frango_image",
        "name": "Espetinho de Frango",
        "description": "Saboroso espetinho de frango.",
        "price": 8.00,
        "action": "add_frango"
      },
      {
        "type": "quickReplyButton",
        "label": "Ver acompanhamentos",
        "payload": "Quero ver os acompanhamentos"
      },
      {
        "type": "quickReplyButton",
        "label": "Finalizar pedido",
        "payload": "Finalizar pedido"
      }
    ]
  }

  Make sure to always return a valid JSON.
  User Query: {{{query}}}
  `,
});

const renderDynamicComponentsFlow = ai.defineFlow(
  {
    name: 'renderDynamicComponentsFlow',
    inputSchema: RenderDynamicComponentsInputSchema,
    outputSchema: RenderDynamicComponentsOutputSchema,
  },
  async input => {
    const {output} = await renderDynamicComponentsPrompt(input);
    return output!;
  }
);
