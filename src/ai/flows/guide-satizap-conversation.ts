import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Patient, ConversationMessage, DynamicComponentData } from '@/lib/types';
import { buscarProdutosTool } from '@/ai/tools/buscar-produtos';
import { criarPedidoTool } from '@/ai/tools/criar-pedido';

const guideSatizapConversationInputSchema = z.object({
  conversationId: z.string(),
  patientMessage: z.string(),
  conversationHistory: z.array(z.any()),
  patient: z.any(),
  association: z.any().optional(),
});

const guideSatizapConversationOutputSchema = z.object({
  text: z.string().describe('Resposta em texto do assistente SATIZAP'),
  components: z.array(z.any()).optional().describe('Componentes dinâmicos para renderizar na interface'),
  confidence: z.number().min(0).max(1).describe('Nível de confiança na resposta (0-1)'),
  requestHandoff: z.boolean().describe('Se deve transferir para atendente humano'),
  handoffReason: z.string().optional().describe('Motivo da transferência para humano'),
  detectedIntent: z.string().describe('Intenção detectada na mensagem do paciente'),
  suggestedProducts: z.array(z.string()).optional().describe('IDs dos produtos sugeridos'),
});

export type GuideSatizapConversationOutput = z.infer<typeof guideSatizapConversationOutputSchema>;

export const guideSatizapConversation = ai.defineFlow(
  {
    name: 'guideSatizapConversation',
    inputSchema: guideSatizapConversationInputSchema,
    outputSchema: guideSatizapConversationOutputSchema,
  },
  async (input) => {
    const { conversationId, patientMessage, conversationHistory, patient, association } = input;
    
    // Build conversation context
    const historyText = conversationHistory
      .map((msg: ConversationMessage) => `${msg.senderType}: ${msg.content}`)
      .join('\n');

    // Build association-specific context with dynamic WordPress credentials
    const associationName = association?.name || 'SATIZAP';
    const associationContext = association?.promptContext 
      ? `\n\nCONTEXTO ESPECÍFICO DA ASSOCIAÇÃO:\n${association.promptContext}\n` 
      : '';
    
    // Prepare WordPress credentials for tools if available
    const wordpressConfig = association?.wordpressUrl && association?.wordpressAuth ? {
      wordpressUrl: association.wordpressUrl,
      wordpressAuth: association.wordpressAuth
    } : undefined;

    const systemPrompt = `Você é SATIZAP, um assistente especializado em cannabis medicinal altamente qualificado e empático. Você trabalha para ${associationName}, uma associação de pacientes de cannabis medicinal.${associationContext}

PERSONALIDADE E COMPORTAMENTO:
- Seja empático, profissional e acolhedor
- Use linguagem clara e acessível, evitando termos técnicos excessivos
- Demonstre conhecimento especializado sem ser intimidador
- Seja proativo em sugerir soluções
- Mantenha um tom otimista e esperançoso

SEU PAPEL:
1. Ajudar pacientes a encontrar produtos de cannabis medicinal adequados
2. Fornecer orientações sobre dosagem e uso
3. Esclarecer dúvidas sobre efeitos e indicações
4. Analisar prescrições médicas (quando enviadas por imagem)
5. Guiar o processo de seleção e pedido de produtos

FERRAMENTAS DISPONÍVEIS:
- buscarProdutos: Use para encontrar produtos baseado em sintomas, categorias ou nomes específicos
- criarPedido: Use para criar orçamentos quando o paciente decidir os produtos desejados

QUANDO USAR FERRAMENTAS:
- Use buscarProdutos sempre que o paciente mencionar sintomas, condições médicas ou buscar produtos específicos
- Use criarPedido quando o paciente confirmar quais produtos deseja e suas quantidades
- Sempre passe o associationId ${association?.id || 'DEFAULT'} para as ferramentas${wordpressConfig ? ` e as credenciais do WordPress quando disponíveis` : ''}

GATILHOS PARA TRANSFERÊNCIA HUMANA (requestHandoff: true):
- Paciente expressa frustração ou insatisfação extrema
- Questões médicas complexas que requerem profissional de saúde
- Problemas com pedidos anteriores ou questões de entrega
- Paciente solicita explicitamente falar com humano
- Você não consegue entender a necessidade após 3 tentativas
- Situações que envolvem efeitos adversos sérios
- Questões legais ou de conformidade
- Emergências médicas

CAPACIDADES ESPECIAIS:
- Análise de prescrições médicas via OCR
- Busca de produtos na base de dados
- Criação de pedidos/orçamentos
- Recomendações personalizadas baseadas em sintomas
- Orientações sobre dosagem inicial

DADOS DO PACIENTE ATUAL:
Nome: ${patient.name}
WhatsApp: ${patient.whatsapp}
${patient.email ? `Email: ${patient.email}` : ''}

HISTÓRICO DA CONVERSA:
${historyText}

MENSAGEM ATUAL DO PACIENTE: "${patientMessage}"

INSTRUÇÕES DE RESPOSTA:
1. Analise a mensagem e detecte a intenção principal
2. Determine se precisa transferir para humano
3. Se não precisar transferir, forneça uma resposta útil e específica
4. Sugira componentes de interface quando apropriado (botões, cards de produtos)
5. Mantenha o foco na cannabis medicinal e saúde do paciente
6. Se detectar possível emergência médica, transfira imediatamente

COMPONENTES DISPONÍVEIS:
- productCard: Para mostrar produtos específicos
- quickReplyButton: Para opções de resposta rápida
- orderSummaryCard: Para resumir seleções
- orderControlButtons: Para finalizar pedidos

Responda sempre em português brasileiro.`;

    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: systemPrompt,
        tools: [buscarProdutosTool, criarPedidoTool],
        config: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const aiText = response.text || 'Desculpe, não consegui processar sua mensagem. Pode reformular?';

      // Simple intent detection and handoff logic
      const lowerMessage = patientMessage.toLowerCase();
      
      // Check for handoff triggers
      let requestHandoff = false;
      let handoffReason = '';
      
      const handoffTriggers = [
        { keywords: ['humano', 'pessoa', 'atendente', 'operador'], reason: 'Solicitação de atendimento humano' },
        { keywords: ['problema', 'erro', 'bug', 'não funciona'], reason: 'Problema técnico reportado' },
        { keywords: ['reclamação', 'insatisfeito', 'ruim', 'péssimo'], reason: 'Insatisfação do cliente' },
        { keywords: ['emergência', 'urgente', 'ajuda', 'socorro'], reason: 'Situação de urgência' },
        { keywords: ['efeito adverso', 'efeito colateral', 'reação'], reason: 'Possível efeito adverso' },
      ];

      for (const trigger of handoffTriggers) {
        if (trigger.keywords.some(keyword => lowerMessage.includes(keyword))) {
          requestHandoff = true;
          handoffReason = trigger.reason;
          break;
        }
      }

      // Detect intent
      let detectedIntent = 'general_inquiry';
      if (lowerMessage.includes('prescrição') || lowerMessage.includes('receita')) {
        detectedIntent = 'prescription_analysis';
      } else if (lowerMessage.includes('produto') || lowerMessage.includes('óleo') || lowerMessage.includes('cbd')) {
        detectedIntent = 'product_inquiry';
      } else if (lowerMessage.includes('dosagem') || lowerMessage.includes('como usar')) {
        detectedIntent = 'dosage_question';
      } else if (lowerMessage.includes('pedido') || lowerMessage.includes('comprar')) {
        detectedIntent = 'order_creation';
      }

      // Generate appropriate components based on intent
      const components: DynamicComponentData[] = [];
      
      if (detectedIntent === 'product_inquiry' && !requestHandoff) {
        components.push({
          type: 'quickReplyButton',
          label: 'Ver Catálogo Completo',
          payload: 'show_all_products'
        });
        components.push({
          type: 'quickReplyButton',
          label: 'Produtos para Dor',
          payload: 'products_for_pain'
        });
        components.push({
          type: 'quickReplyButton',
          label: 'Produtos para Ansiedade',
          payload: 'products_for_anxiety'
        });
      }

      return {
        text: requestHandoff 
          ? `${aiText}\n\nVou transferir você para um de nossos atendentes especializados que poderá ajudá-lo melhor. Aguarde um momento, por favor.`
          : aiText,
        components,
        confidence: requestHandoff ? 1.0 : 0.8,
        requestHandoff,
        handoffReason,
        detectedIntent,
        suggestedProducts: [],
      };

    } catch (error) {
      console.error('Error in SATIZAP conversation flow:', error);
      
      return {
        text: 'Desculpe, ocorreu um erro técnico. Vou transferir você para um atendente humano.',
        components: [],
        confidence: 0.0,
        requestHandoff: true,
        handoffReason: 'Erro técnico no sistema de IA',
        detectedIntent: 'error',
        suggestedProducts: [],
      };
    }
  }
);