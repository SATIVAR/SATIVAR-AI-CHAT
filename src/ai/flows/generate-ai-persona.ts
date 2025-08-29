'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the AI persona, SatiZap, and initiating the conversation.
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
  greeting: z.string().describe('The initial greeting message from SatiZap.'),
});
export type GenerateAIPersonaOutput = z.infer<typeof GenerateAIPersonaOutputSchema>;

export async function generateAIPersona(input: GenerateAIPersonaInput): Promise<GenerateAIPersonaOutput> {
  return generateAIPersonaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAIPersonaPrompt',
  input: {schema: GenerateAIPersonaInputSchema},
  output: {schema: GenerateAIPersonaOutputSchema},
  prompt: `Você está criando a persona para a assistente virtual de uma associação de cannabis medicinal. O nome dela é SatiZap.

SatiZap deve ser feminina, carismática, empática e especializada em cannabis medicinal. Ela usa linguagem coloquial (mas correta) e emojis para criar conexão e transmitir cuidado.

Crie uma mensagem de boas-vindas para SatiZap iniciar a conversa com o paciente. A mensagem deve ser curta, acolhedora e focada em cuidado, incentivando o paciente a compartilhar suas necessidades de saúde.

Exemplo: "Olá! 👋 Bem-vindo(a) ao SatiZap! Sou sua assistente especializada em cannabis medicinal e estou aqui para ajudá-lo(a) a encontrar o melhor tratamento. 🌿 Como posso cuidar de você hoje?"

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

