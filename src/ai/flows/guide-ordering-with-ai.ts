'use server';
/**
 * @fileOverview This file defines the Genkit flow for guiding users through the ordering process,
 * including upsell and cross-sell suggestions.
 *
 * - guideOrdering - A function that initiates the ordering process and guides the user with suggestions.
 * - GuideOrderingInput - The input type for the guideOrdering function.
 * - GuideOrderingOutput - The return type for the guideOrdering function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MenuCategorySchema = z.object({
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

const GuideOrderingInputSchema = z.object({
  userMessage: z.string().describe('The user message to the AI.'),
  orderHistory: z.array(z.string()).describe('The order history of the user.'),
  menu: MenuSchema.describe('The restaurant menu.'),
});
export type GuideOrderingInput = z.infer<typeof GuideOrderingInputSchema>;

const GuideOrderingOutputSchema = z.object({
  response: z.string().describe('The response from the AI, guiding the user through the ordering process.'),
  suggestedActions: z.array(z.string()).optional().describe('Suggested actions for the user to take (e.g., add item, view category).'),
});
export type GuideOrderingOutput = z.infer<typeof GuideOrderingOutputSchema>;

async function guideOrdering(input: GuideOrderingInput): Promise<GuideOrderingOutput> {
  return guideOrderingFlow(input);
}

const findUpsellAndCrossSell = ai.defineTool({
  name: 'findUpsellAndCrossSell',
  description: 'Suggests relevant upsells and cross-sells based on the current order and the menu.  This tool should be used after the customer has indicated one or more items they want to order.',
  inputSchema: z.object({
    orderedItemNames: z.array(z.string()).describe('Names of the items already in the order.'),
    menu: MenuSchema.describe('The restaurant menu.'),
  }),
  outputSchema: z.array(z.string()).describe('List of suggested upsell and cross-sell item names.'), // Returning item NAMES
},
async (input) => {
  const {
    orderedItemNames,
    menu
  } = input;

  // Simple implementation for now: suggest items from the same category and a popular item from another category.
  const suggestions: string[] = [];

  if (orderedItemNames.length > 0) {
    // Get the category of the last ordered item.
    const lastOrderedItem = menu.items.find(item => orderedItemNames.includes(item.name));
    if (lastOrderedItem) {
      // Suggest other items from the same category.
      const sameCategorySuggestions = menu.items
          .filter(item => item.category === lastOrderedItem.category && !orderedItemNames.includes(item.name))
          .map(item => item.name)
          .slice(0, 2); // Limit to 2 suggestions
      suggestions.push(...sameCategorySuggestions);
    }

    // Suggest a popular item from another category (e.g., Feijoada as a side).
    const popularSide = menu.items.find(item => item.name === 'Feijoada'); // Hardcoded for now
    if (popularSide && !orderedItemNames.includes(popularSide.name)) {
      suggestions.push(popularSide.name);
    }
  }

  return suggestions;
});

const prompt = ai.definePrompt({
  name: 'guideOrderingPrompt',
  input: {
    schema: GuideOrderingInputSchema,
  },
  output: {
    schema: GuideOrderingOutputSchema,
  },
  tools: [findUpsellAndCrossSell],
  system: `You are UtópiZap, a carismatic and efficient AI assistant for UTÓPICOS restaurant. You use a coloquial (but correct) language and emojis to create connection.

You are guiding the user through the ordering process.  

Based on the user's message, suggest the next steps in the ordering process.  Consider using the findUpsellAndCrossSell tool to suggest relevant upsells and cross-sells based on the current order.

Use a JSON format for responses that can be used to render dynamic components, such as category and product cards, and quick reply buttons.

Here is the menu in JSON format: {{{JSON.stringify(menu)}}}

Here is the order history:
{{#each orderHistory}}
* {{this}}
{{/each}}

Respond to the user message: {{{userMessage}}}
`,
  prompt: `You are UtópiZap, a carismatic and efficient AI assistant for UTÓPICOS restaurant. You use a coloquial (but correct) language and emojis to create connection.

You are guiding the user through the ordering process.

Based on the user's message, suggest the next steps in the ordering process. Consider using the findUpsellAndCrossSell tool to suggest relevant upsells and cross-sells based on the current order.

Use a JSON format for responses that can be used to render dynamic components, such as category and product cards, and quick reply buttons.

Here is the menu in JSON format: {{{JSON.stringify(menu)}}}

Here is the order history:
{{#each orderHistory}}
* {{this}}
{{/each}}

Respond to the user message: {{{userMessage}}}
`,
});

const guideOrderingFlow = ai.defineFlow(
  {
    name: 'guideOrderingFlow',
    inputSchema: GuideOrderingInputSchema,
    outputSchema: GuideOrderingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export {
  guideOrdering,
};
