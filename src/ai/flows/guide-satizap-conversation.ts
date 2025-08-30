import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Patient, ConversationMessage, DynamicComponentData, ApiConfig, Association } from '@/lib/types';
import { buscarProdutosTool } from '@/ai/tools/buscar-produtos';
import { criarPedidoTool } from '@/ai/tools/criar-pedido';
import { findOrCreatePatientTool } from '@/ai/tools/find-or-create-patient';
import { getContext } from '@/lib/services/context-loader.service';
import { hybridAIOrchestrator, HybridAIInput } from './hybrid-ai-orchestrator';
import { getConversationState, initializeConversationState } from '@/lib/services/conversation-state.service';

/**
 * FASE 3: Função para construir contexto do perfil completo do paciente
 * Injeta dados contextuais detalhados para personalizar a conversa
 */
function buildPatientProfileContext(patient: Patient): string {
  let context = `\n\n=== PERFIL COMPLETO DO PACIENTE ===\n`;
  
  // Dados básicos
  context += `Nome: ${patient.name}\n`;
  context += `WhatsApp: ${patient.whatsapp}\n`;
  context += `Status: ${patient.status}\n`;
  
  if (patient.email) {
    context += `Email: ${patient.email}\n`;
  }
  
  // Dados ACF (Advanced Custom Fields) sincronizados do WordPress
  if (patient.cpf) {
    context += `CPF: ${patient.cpf}\n`;
  }
  
  if (patient.tipo_associacao) {
    context += `Tipo de Associação: ${patient.tipo_associacao}\n`;
  }
  
  if (patient.nome_responsavel) {
    context += `Nome do Responsável: ${patient.nome_responsavel}\n`;
  }
  
  if (patient.cpf_responsavel) {
    context += `CPF do Responsável: ${patient.cpf_responsavel}\n`;
  }
  
  if (patient.wordpress_id) {
    context += `ID no WordPress: ${patient.wordpress_id}\n`;
  }
  
  context += `\n=== INSTRUÇÕES PARA USO DO PERFIL ===\n`;
  
  if (patient.status === 'MEMBRO') {
    context += `• Este é um MEMBRO ativo da associação\n`;
    context += `• Use os dados detalhados para personalizar a conversa\n`;
    
    if (patient.tipo_associacao === 'responsavel' && patient.nome_responsavel) {
      context += `• Pode se referir ao responsável "${patient.nome_responsavel}" para confirmar informações\n`;
    }
    
    if (patient.cpf || patient.cpf_responsavel) {
      context += `• Pode usar o CPF como fator secundário de verificação de identidade se necessário\n`;
    }
    
    context += `• Forneça atendimento completo e personalizado\n`;
  } else if (patient.status === 'LEAD') {
    context += `• Este é um LEAD (perfil incompleto)\n`;
    context += `• Primeira tarefa: explicar o processo de associação\n`;
    context += `• Objetivo: coletar informações necessárias para converter em MEMBRO\n`;
    context += `• Campos a coletar: tipo de associação, dados do responsável (se aplicável)\n`;
    context += `• Mantenha o foco na conversão do lead\n`;
  }
  
  context += `\n`;
  
  return context;
}

const guideSatizapConversationInputSchema = z.object({
  conversationId: z.string(),
  patientMessage: z.string(),
  conversationHistory: z.array(z.any()),
  patient: z.any().optional(), // Make optional for new patients
  association: z.any().optional(),
  // Phase 2: Dynamic tenant context
  tenantId: z.string().describe('Association subdomain or ID for dynamic context loading'),
  // Phase 2: Patient form data (for new patients)
  patientFormData: z.object({
    fullName: z.string(),
    whatsapp: z.string(),
    email: z.string().optional(),
  }).optional().describe('New patient form data when no existing patient'),
  // Phase 3: Hybrid mode flag
  useHybridMode: z.boolean().default(false).describe('Whether to use the hybrid AI orchestrator'),
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
    const { conversationId, patientMessage, conversationHistory, patient, association, tenantId, patientFormData, useHybridMode } = input;
    
    console.log(`[guideSatizapConversation] Starting for tenant: ${tenantId} ${useHybridMode ? '(HYBRID MODE)' : '(LEGACY MODE)'}`);
    
    // Phase 3: Check if we should use hybrid orchestrator
    if (useHybridMode && patient) {
      console.log(`[guideSatizapConversation] Using hybrid AI orchestrator`);
      
      try {
        // Initialize conversation state if needed
        await initializeConversationState(conversationId);
        
        // Prepare input for hybrid orchestrator
        const hybridInput: HybridAIInput = {
          conversationId,
          patientMessage,
          conversationHistory: conversationHistory.map((msg: any) => ({
            role: msg.senderType === 'paciente' ? 'paciente' as const : 
                 msg.senderType === 'ia' ? 'ia' as const :
                 msg.role === 'user' ? 'paciente' as const :
                 msg.role === 'ai' ? 'ia' as const : 'ia' as const,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString()
          })),
          currentOrder: [], // Would need to be passed from conversation context
          patient: {
            id: patient.id,
            name: patient.name,
            whatsapp: patient.whatsapp,
            email: patient.email
          },
          association: association as Association
        };
        
        // Use hybrid orchestrator
        const hybridResult = await hybridAIOrchestrator(hybridInput);
        
        // Convert hybrid result to expected output format
        return {
          text: hybridResult.text as string,
          components: hybridResult.components || [],
          confidence: 0.9, // High confidence for hybrid responses
          requestHandoff: false,
          handoffReason: '',
          detectedIntent: 'hybrid_response',
          suggestedProducts: []
        };
        
      } catch (error) {
        console.error(`[guideSatizapConversation] Hybrid orchestrator error:`, error);
        // Fall through to legacy mode on error
      }
    }
    
    console.log(`[guideSatizapConversation] Starting for tenant: ${tenantId}`);
    
    // Phase 2: Load dynamic context
    let dynamicContext = null;
    try {
      dynamicContext = await getContext(tenantId);
      if (dynamicContext) {
        console.log(`[guideSatizapConversation] Loaded dynamic context for: ${dynamicContext.associationName}`);
      }
    } catch (error) {
      console.error(`[guideSatizapConversation] Failed to load dynamic context:`, error);
    }
    
    // Use dynamic context if available, otherwise fallback to static association
    const effectiveAssociation = dynamicContext ? {
      id: dynamicContext.associationId,
      name: dynamicContext.associationName,
      wordpressUrl: dynamicContext.wordpressUrl,
      wordpressAuth: dynamicContext.wordpressAuth,
      apiConfig: dynamicContext.apiConfig,
      promptContext: dynamicContext.promptContext,
      aiDirectives: dynamicContext.aiDirectives,
      aiRestrictions: dynamicContext.aiRestrictions,
    } : association;
    
    // Phase 2: Handle new patient onboarding with findOrCreatePatient tool
    if (!patient && patientFormData) {
      console.log(`[guideSatizapConversation] New patient detected, using findOrCreatePatient tool`);
      
      // This is a new patient - use the findOrCreatePatient tool
      try {
        const findPatientResponse = await ai.generate({
          model: 'googleai/gemini-1.5-flash',
          prompt: `Um novo paciente preencheu o formulário inicial com os dados: Nome: ${patientFormData.fullName}, WhatsApp: ${patientFormData.whatsapp}${patientFormData.email ? `, Email: ${patientFormData.email}` : ''}. Use a ferramenta findOrCreatePatient para verificar se o paciente já existe no sistema ou criar um novo registro.`,
          tools: [findOrCreatePatientTool],
        });
        
        // The tool call response will contain the patient status and next steps
        console.log(`[guideSatizapConversation] findOrCreatePatient completed`);
        
        // Return the tool's response directly for new patient onboarding
        return {
          text: findPatientResponse.text || 'Processando seu cadastro...',
          components: [],
          confidence: 1.0,
          requestHandoff: false,
          handoffReason: '',
          detectedIntent: 'patient_onboarding',
          suggestedProducts: [],
        };
        
      } catch (error) {
        console.error(`[guideSatizapConversation] Error in patient onboarding:`, error);
        return {
          text: 'Ocorreu um erro ao processar seu cadastro. Tente novamente ou entre em contato com o suporte.',
          components: [],
          confidence: 0.0,
          requestHandoff: true,
          handoffReason: 'Erro no processo de cadastro',
          detectedIntent: 'error',
          suggestedProducts: [],
        };
      }
    }
    
    // Build conversation context
    const historyText = conversationHistory
      .map((msg: ConversationMessage) => `${msg.senderType}: ${msg.content}`)
      .join('\n');

    // Build association-specific context with dynamic WordPress credentials
    const associationName = effectiveAssociation?.name || 'SATIZAP';
    const associationContext = effectiveAssociation?.promptContext 
      ? `\n\nCONTEXTO ESPECÍFICO DA ASSOCIAÇÃO:\n${effectiveAssociation.promptContext}\n` 
      : '';
    
    // Build AI directives section
    const aiDirectives = effectiveAssociation?.aiDirectives 
      ? `\n\nDIRETRIZES ESPECÍFICAS DE ATENDIMENTO:\nSiga estritamente as seguintes diretrizes em todas as suas interações:\n${effectiveAssociation.aiDirectives}\n`
      : '';
    
    // Build AI restrictions section
    const aiRestrictions = effectiveAssociation?.aiRestrictions 
      ? `\n\nRESTRIÇÕES OBRIGATÓRIAS:\nSob nenhuma circunstância você deve:\n${effectiveAssociation.aiRestrictions}\n`
      : '';

    // FASE 3: Injeção do Perfil Completo do Paciente
    // Carregar o registro completo do paciente com todos os novos campos ACF
    let patientProfileContext = '';
    if (patient) {
      patientProfileContext = buildPatientProfileContext(patient);
    }
    
    // Phase 2: Enhanced API configuration with dynamic context
    const wordpressConfig = effectiveAssociation?.wordpressUrl && effectiveAssociation?.wordpressAuth ? {
      wordpressUrl: effectiveAssociation.wordpressUrl,
      wordpressAuth: effectiveAssociation.wordpressAuth
    } : undefined;
    
    // Extract apiConfig for dynamic endpoint usage (Phase 2 enhancement)
    const apiConfig: ApiConfig | undefined = effectiveAssociation?.apiConfig;
    
    // Build enhanced system prompt that includes API configuration status
    const apiConfigStatus = apiConfig 
      ? `\n- Configuração API dinâmica ativa: ${apiConfig.authMethod === 'applicationPassword' ? 'WordPress Application Password' : 'WooCommerce Consumer Key/Secret'}`
      : '\n- Usando configuração padrão do sistema';
      
    const dynamicContextStatus = dynamicContext 
      ? `\n- Contexto dinâmico carregado com sucesso para: ${dynamicContext.associationName}`
      : '\n- Usando contexto estático';
    const systemPrompt = `Você é SATIZAP, um assistente especializado em cannabis medicinal altamente qualificado e empático. Você trabalha para ${associationName}, uma associação de pacientes de cannabis medicinal.${associationContext}${aiDirectives}${aiRestrictions}${apiConfigStatus}${dynamicContextStatus}

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
${dynamicContext ? '- findOrCreatePatient: Para processar novos pacientes (já processado nesta conversa)' : ''}

QUANDO USAR FERRAMENTAS:
- Use buscarProdutos sempre que o paciente mencionar sintomas, condições médicas ou buscar produtos específicos
- Use criarPedido quando o paciente confirmar quais produtos deseja e suas quantidades
- Sempre passe o associationId ${effectiveAssociation?.id || 'DEFAULT'} e tenantId ${tenantId} para as ferramentas${wordpressConfig ? ` e as credenciais do WordPress quando disponíveis` : ''}${apiConfig ? ` e a configuração de API dinâmica` : ''}

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
- Sempre passe o associationId ${association?.id || 'DEFAULT'} para as ferramentas${wordpressConfig ? ` e as credenciais do WordPress quando disponíveis` : ''}${apiConfig ? ` e a configuração de API dinâmica` : ''}

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
${patient.email ? `Email: ${patient.email}` : ''}${patientProfileContext}

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
        tools: [buscarProdutosTool, criarPedidoTool, findOrCreatePatientTool],
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