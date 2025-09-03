/**
 * Phase 3: Hybrid AI Orchestrator Flow
 * This flow replaces direct AI response generation with intelligent orchestration.
 * The AI decides what action to take and delegates execution to deterministic functions.
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AIOrchestrationResponse, HybridConversationState, Association } from '@/lib/types';
import { 
  buildWelcomeMessage, 
  generateOrderQuote, 
  getPaymentInstructions, 
  getStandardResponse 
} from '@/lib/services/response-engine.service';
import { 
  getConversationState, 
  updateConversationState, 
  getStateContextPrompt,
  getStateActions 
} from '@/lib/services/conversation-state.service';

/**
 * FASE 3: Função aprimorada para construir contexto do paciente no Hybrid AI
 * Inclui lógica avançada de interlocutor para decisões contextuais
 */
function buildPatientContextForAI(patient: any): string {
  let context = `PERFIL COMPLETO DO PACIENTE (FASE 3):\n`;
  context += `- Nome: ${patient.name}\n`;
  context += `- Status: ${patient.status || 'DESCONHECIDO'}\n`;
  
  if (patient.cpf) {
    context += `- CPF: ${patient.cpf}\n`;
  }
  
  if (patient.tipo_associacao) {
    context += `- Tipo de Associação: ${patient.tipo_associacao}\n`;
  }
  
  if (patient.nome_responsavel) {
    context += `- Responsável: ${patient.nome_responsavel}\n`;
  }
  
  if (patient.cpf_responsavel) {
    context += `- CPF Responsável: ${patient.cpf_responsavel}\n`;
  }
  
  // FASE 3: Análise de contexto de interlocutor
  const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
  const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
  
  context += `\nCONTEXTO DE INTERLOCUTOR (FASE 3):\n`;
  if (isResponsibleScenario) {
    context += `- CENÁRIO: Responsável falando pelo paciente\n`;
    context += `- Interlocutor (quem digita): ${interlocutorName}\n`;
    context += `- Paciente (atendimento para): ${patient.name}\n`;
    context += `- INSTRUÇÃO: Dirija-se ao responsável, refira-se ao paciente na 3ª pessoa\n`;
  } else {
    context += `- CENÁRIO: Paciente falando diretamente\n`;
    context += `- Interlocutor: ${interlocutorName}\n`;
    context += `- INSTRUÇÃO: Dirija-se diretamente ao paciente\n`;
  }
  
  if (patient.status === 'MEMBRO') {
    context += `\nEste é um MEMBRO ativo. Use os dados para personalizar o atendimento.\n`;
    context += `Forneça atendimento completo com base no perfil detalhado.\n`;
  } else if (patient.status === 'LEAD') {
    context += `\nEste é um LEAD. Foque em coletar informações para conversão em membro.\n`;
    context += `Explique o processo de associação e benefícios de ser membro.\n`;
  }
  
  return context;
}

// AI Orchestration Input Schema
const HybridAIInputSchema = z.object({
  conversationId: z.string().describe('Unique conversation identifier'),
  patientMessage: z.string().describe('The latest message from the patient'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'ai', 'paciente', 'ia']),
    content: z.string(),
    timestamp: z.string().optional(),
  })).describe('Complete conversation history'),
  currentOrder: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })).describe('Current items in patient order'),
  patient: z.object({
    id: z.string(),
    name: z.string(),
    whatsapp: z.string(),
    email: z.string().optional(),
    cpf: z.string().optional(),
    tipo_associacao: z.string().optional(),
    nome_responsavel: z.string().optional(),
    cpf_responsavel: z.string().optional(),
    status: z.enum(['LEAD', 'MEMBRO']).optional(),
    wordpress_id: z.string().optional(),
  }).describe('Complete patient information with ACF data'),
  association: z.any().describe('Association configuration and settings'),
});

export type HybridAIInput = z.infer<typeof HybridAIInputSchema>;

// AI Decision Output Schema  
const AIDecisionSchema = z.object({
  action: z.enum([
    'call_function',
    'call_tool', 
    'send_message',
    'request_info'
  ]).describe('The type of action the system should take'),
  
  functionName: z.enum([
    'buildWelcomeMessage',
    'generateOrderQuote', 
    'getPaymentInstructions',
    'getStandardResponse'
  ]).optional().describe('Function to call if action is call_function'),
  
  toolName: z.enum([
    'findProducts',
    'searchProducts',
    'validatePrescription'
  ]).optional().describe('Tool to call if action is call_tool'),
  
  parameters: z.record(z.any()).optional().describe('Parameters for the function or tool'),
  
  message: z.string().optional().describe('Direct message to send if action is send_message'),
  
  nextState: z.nativeEnum(HybridConversationState).optional().describe('Next conversation state to transition to'),
  
  reasoning: z.string().describe('Brief explanation of why this action was chosen'),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

// Hybrid AI Output Schema
const HybridAIOutputSchema = z.object({
  text: z.string().describe('The final response text to show the patient'),
  components: z.array(z.any()).optional().describe('UI components to render (if any)'),
  newState: z.nativeEnum(HybridConversationState).optional().describe('New conversation state'),
});

export type HybridAIOutput = z.infer<typeof HybridAIOutputSchema>;

/**
 * Main Hybrid AI Orchestrator Function
 */
export async function hybridAIOrchestrator(input: HybridAIInput): Promise<HybridAIOutput> {
  try {
    // Step 1: Get current conversation state
    const stateData = await getConversationState(input.conversationId);
    const currentState = stateData?.currentState || HybridConversationState.GREETING;
    
    // Step 2: Get AI decision based on context
    const aiDecision = await getAIDecision(input, currentState);
    
    // Step 3: Execute the decision
    const result = await executeDecision(aiDecision, input, currentState);
    
    // Step 4: Update conversation state if needed
    if (aiDecision.nextState && aiDecision.nextState !== currentState) {
      await updateConversationState(input.conversationId, aiDecision.nextState);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error in hybrid AI orchestrator:', error);
    return {
      text: "Desculpe, ocorreu um erro técnico. Um atendente humano entrará em contato em breve.",
      components: []
    };
  }
}

/**
 * Get AI Decision using minimal token consumption
 */
async function getAIDecision(input: HybridAIInput, currentState: HybridConversationState): Promise<AIDecision> {
  // FASE 3: Incluir contexto do paciente na decisão da IA
  const patientContext = buildPatientContextForAI(input.patient);
  const stateContext = getStateContextPrompt(currentState, undefined, input.patient.status);
  const availableActions = getStateActions(currentState);
  
  const systemPrompt = `You are an AI decision orchestrator for SatiZap medical cannabis platform.

CURRENT CONVERSATION STATE: ${currentState}
CONTEXT: ${stateContext}

${patientContext}

AVAILABLE ACTIONS: ${availableActions.join(', ')}

Your ONLY job is to analyze the patient's message and decide what action to take. Do NOT generate conversational responses - delegate that to functions.

ANALYSIS GUIDELINES:
1. If patient is greeting/starting → use buildWelcomeMessage function
2. If patient mentions products/wants to order → use findProducts tool first
3. If patient has selected products → use generateOrderQuote function  
4. If patient confirms order → use getPaymentInstructions function
5. If patient needs standard response → use getStandardResponse function
6. If unclear → send_message with clarifying question

PATIENT-SPECIFIC CONSIDERATIONS (FASE 3):
- If patient status is LEAD: Focus on conversion and information collection
- If patient status is MEMBRO: Provide full personalized service
- Use patient data (CPF, responsible person) for identity verification when needed
- Adapt responses based on association type and available patient data

CRITICAL INTERLOCUTOR CONSIDERATIONS (FASE 3):
- ALWAYS identify who is speaking (patient or responsible person)
- ALWAYS adapt language based on interlocutor context
- If responsible scenario: Address responsible person, refer to patient in 3rd person
- If patient scenario: Address patient directly
- Ensure medical instructions are clear about who should administer/take medication
- Validate communication approach before generating responses

Consider these factors:
- Current conversation state: ${currentState}
- Patient profile and status (LEAD vs MEMBRO)
- Conversation history shows the context
- Patient's current order status
- Association settings and templates available

Return a JSON decision object with action, parameters, and reasoning.`;

  const conversationSummary = input.conversationHistory
    .slice(-5) // Last 5 messages for context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `CONVERSATION CONTEXT:
${conversationSummary}

LATEST PATIENT MESSAGE: "${input.patientMessage}"

CURRENT ORDER: ${JSON.stringify(input.currentOrder)}

ASSOCIATION: ${input.association?.name || 'Unknown'}

Based on this context and the current state (${currentState}), what action should the system take?`;

  const response = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    prompt: systemPrompt + '\n\n' + prompt,
    output: { schema: AIDecisionSchema },
    config: {
      temperature: 0.1, // Low temperature for consistent decisions
      maxOutputTokens: 200, // Minimal tokens for decision only
    }
  });

  return response.output!;
}

/**
 * Execute the AI decision using deterministic functions
 */
async function executeDecision(
  decision: AIDecision, 
  input: HybridAIInput, 
  currentState: HybridConversationState
): Promise<HybridAIOutput> {
  
  const association = input.association as Association;
  
  switch (decision.action) {
    case 'call_function':
      return await executeFunctionCall(decision, input, association);
      
    case 'call_tool':
      return await executeToolCall(decision, input);
      
    case 'send_message':
      return {
        text: decision.message || "Como posso ajudá-lo?",
        components: []
      };
      
    case 'request_info':
      return await executeInfoRequest(decision, input);
      
    default:
      return {
        text: "Desculpe, não consegui processar sua solicitação. Pode reformular?",
        components: []
      };
  }
}

/**
 * Execute function calls to deterministic response engine
 */
async function executeFunctionCall(
  decision: AIDecision, 
  input: HybridAIInput, 
  association: Association
): Promise<HybridAIOutput> {
  
  const params = decision.parameters || {};
  
  switch (decision.functionName) {
    case 'buildWelcomeMessage':
      const welcomeText = await buildWelcomeMessage(association, input.patient as any);
      return {
        text: welcomeText,
        components: [{
          type: 'quickReplyButton',
          label: 'Ver catálogo',
          payload: 'Gostaria de ver o catálogo de produtos'
        }],
        newState: HybridConversationState.GREETING
      };
      
    case 'generateOrderQuote':
      if (input.currentOrder.length === 0) {
        return {
          text: "Você ainda não adicionou produtos ao pedido. Gostaria de ver nosso catálogo?",
          components: [{
            type: 'quickReplyButton',
            label: 'Ver catálogo',
            payload: 'Gostaria de ver o catálogo de produtos'
          }]
        };
      }
      
      const quote = await generateOrderQuote(
        input.patient.id,
        input.currentOrder,
        association,
        input.patient as any
      );
      
      return {
        text: quote.orderText,
        components: [{
          type: 'orderSummaryCard',
          summary: quote.orderText,
          total: quote.totalValue
        }],
        newState: HybridConversationState.AWAITING_QUOTE_CONFIRMATION
      };
      
    case 'getPaymentInstructions':
      const paymentText = await getPaymentInstructions(association);
      return {
        text: paymentText,
        components: [],
        newState: HybridConversationState.AWAITING_PAYMENT
      };
      
    case 'getStandardResponse':
      const templateName = (params as any).templateName || 'templatePedidoConfirmado';
      const variables = (params as any).variables || {};
      const standardText = await getStandardResponse(templateName, association, variables);
      return {
        text: standardText,
        components: []
      };
      
    default:
      return {
        text: "Função não reconhecida. Como posso ajudá-lo?",
        components: []
      };
  }
}

/**
 * Execute tool calls (for external integrations like product search)
 */
async function executeToolCall(decision: AIDecision, input: HybridAIInput): Promise<HybridAIOutput> {
  // For now, return a placeholder - this would integrate with existing tools
  // like buscar-produtos.ts
  return {
    text: `Pesquisando por "${(decision.parameters as any)?.query || 'produtos'}"... Esta funcionalidade será implementada.`,
    components: []
  };
}

/**
 * Execute information requests (collect user details, etc.)
 */
async function executeInfoRequest(decision: AIDecision, input: HybridAIInput): Promise<HybridAIOutput> {
  return {
    text: decision.message || "Preciso de mais informações. Pode me ajudar?",
    components: [{
      type: 'userDetailsForm',
    }],
    newState: HybridConversationState.AWAITING_USER_DETAILS
  };
}

/**
 * Prompt definition for the orchestrator
 */
const hybridPrompt = ai.definePrompt({
  name: 'hybridAIPrompt',
  input: { schema: HybridAIInputSchema },
  output: { schema: AIDecisionSchema },
  system: `You are a decision orchestrator for SatiZap medical cannabis platform. 
  
Your job is NOT to generate conversational responses, but to decide what action the system should take based on the patient's message and conversation state.

You have access to these deterministic functions:
- buildWelcomeMessage: Generate personalized welcome
- generateOrderQuote: Create order summary with pricing  
- getPaymentInstructions: Provide payment details
- getStandardResponse: Use pre-configured templates

And these tools:
- findProducts: Search product catalog
- validatePrescription: Check prescription validity

Analyze the input and return a structured decision about what action to take.`,
  
  prompt: `Patient message: "{{patientMessage}}"
Current state: {{currentState}}
Order items: {{currentOrder.length}}
History: {{conversationHistory.length}} messages

What action should the system take?`
});