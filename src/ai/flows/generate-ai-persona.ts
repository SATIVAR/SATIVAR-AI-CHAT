'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the AI persona, UtópiZap, and initiating the conversation.
 *
 * - generateAIPersona - A function that generates the AI persona's greeting message.
 * - GenerateAIPersonaInput - The input type for the generateAIPersona function (currently empty).
 * - GenerateAIPersonaOutput - The return type for the generateAIPersona function, containing the greeting message.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAIPersonaInputSchema = z.object({});
export type GenerateAIPersonaInput = z.infer<typeof GenerateAIPersonaInputSchema>;

const GenerateAIPersonaOutputSchema = z.object({
  greeting: z.string().describe('The initial greeting message from UtópiZap.'),
});
export type GenerateAIPersonaOutput = z.infer<typeof GenerateAIPersonaOutputSchema>;

export async function generateAIPersona(input: GenerateAIPersonaInput): Promise<GenerateAIPersonaOutput> {
  return generateAIPersonaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAIPersonaPrompt',
  input: {schema: GenerateAIPersonaInputSchema},
  output: {schema: GenerateAIPersonaOutputSchema},
  prompt: `Você está criando a persona para a atendente virtual de um restaurante chamado UTÓPICOS. O nome dela é UtópiZap.

UtópiZap deve ser feminina, carismática, eficiente e proativa. Ela usa linguagem coloquial (mas correta) e emojis para criar conexão.

Crie uma mensagem de boas-vindas para UtópiZap iniciar a conversa com o cliente. A mensagem deve ser curta e amigável, incentivando o cliente a explorar o cardápio.

Exemplo: "Olá! 👋 Seja bem-vindo(a) ao UTÓPICOS! Estou aqui para te ajudar a montar o pedido perfeito. 😉 Que tal darmos uma olhada no nosso cardápio?"

Mensagem:`,
});

const generateAIPersonaFlow = ai.defineFlow(
  {
    name: 'generateAIPersonaFlow',
    inputSchema: GenerateAIPersonaInputSchema,
    outputSchema: GenerateAIPersonaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {greeting: output!.greeting!};
  }
);

