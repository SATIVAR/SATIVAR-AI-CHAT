import { Patient, InterlocutorContext, ContextAnalysisResult, ContextFallback, ChatSessionContext } from '@/lib/types';

/**
 * Context Analyzer Service
 * 
 * Analyzes ACF data from WordPress to determine interlocutor type and context.
 * Implements requirements 1.2 and 1.3 from the interlocutor-logic spec.
 */
export class ContextAnalyzerService {
  
  /**
   * Context fallback strategies for different scenarios
   */
  private static readonly CONTEXT_FALLBACKS: Record<string, ContextFallback> = {
    unknown_association_type: {
      scenario: 'unknown_association_type',
      fallbackStrategy: 'assume_patient',
      userMessage: 'Bem-vindo(a) de volta!',
      logLevel: 'warning'
    },
    missing_responsible_data: {
      scenario: 'missing_responsible_data',
      fallbackStrategy: 'use_default',
      userMessage: 'Bem-vindo(a) ao atendimento!',
      logLevel: 'error'
    },
    ambiguous_context: {
      scenario: 'ambiguous_context',
      fallbackStrategy: 'assume_patient',
      userMessage: 'Bem-vindo(a) de volta!',
      logLevel: 'warning'
    }
  };

  /**
   * Analyzes patient data and determines interlocutor context
   * 
   * @param patientData - Patient data with ACF fields
   * @returns ContextAnalysisResult with interlocutor context or error
   */
  public static analyzeInterlocutor(patientData: Patient): ContextAnalysisResult {
    try {
      console.log('[ContextAnalyzer] Analyzing interlocutor context for patient:', {
        patientId: patientData.id,
        name: patientData.name,
        tipo_associacao: patientData.tipo_associacao,
        nome_responsavel: patientData.nome_responsavel
      });

      // Validate required data
      if (!patientData.name) {
        return {
          success: false,
          error: 'Patient name is required for context analysis'
        };
      }

      // Determine scenario based on tipo_associacao
      const tipoAssociacao = patientData.tipo_associacao;
      
      if (!tipoAssociacao) {
        console.warn('[ContextAnalyzer] No tipo_associacao found, using fallback');
        return this.handleContextFallback('unknown_association_type', patientData);
      }

      switch (tipoAssociacao) {
        case 'assoc_paciente':
          return this.createPatientContext(patientData);
        
        case 'assoc_respon':
          return this.createResponsibleContext(patientData);
        
        default:
          console.warn('[ContextAnalyzer] Unknown association type:', tipoAssociacao);
          return this.handleContextFallback('unknown_association_type', patientData);
      }

    } catch (error) {
      console.error('[ContextAnalyzer] Error analyzing interlocutor context:', error);
      return {
        success: false,
        error: 'Failed to analyze interlocutor context'
      };
    }
  }

  /**
   * Creates context for patient scenario (assoc_paciente)
   */
  private static createPatientContext(patientData: Patient): ContextAnalysisResult {
    const context: InterlocutorContext = {
      scenario: 'patient',
      interlocutorName: patientData.name,
      patientName: patientData.name,
      isResponsibleScenario: false,
      contextualData: {
        tipo_associacao: patientData.tipo_associacao!,
        nome_responsavel: patientData.nome_responsavel || undefined,
        cpf_responsavel: patientData.cpf_responsavel || undefined
      }
    };

    console.log('[ContextAnalyzer] Created patient context:', {
      scenario: context.scenario,
      interlocutorName: context.interlocutorName,
      patientName: context.patientName
    });

    return {
      success: true,
      context
    };
  }

  /**
   * Creates context for responsible scenario (assoc_respon)
   */
  private static createResponsibleContext(patientData: Patient): ContextAnalysisResult {
    // Validate responsible data
    if (!patientData.nome_responsavel) {
      console.warn('[ContextAnalyzer] Missing responsible name for assoc_respon scenario');
      return this.handleContextFallback('missing_responsible_data', patientData);
    }

    const context: InterlocutorContext = {
      scenario: 'responsible',
      interlocutorName: patientData.nome_responsavel,
      patientName: patientData.name,
      isResponsibleScenario: true,
      contextualData: {
        tipo_associacao: patientData.tipo_associacao!,
        nome_responsavel: patientData.nome_responsavel,
        cpf_responsavel: patientData.cpf_responsavel || undefined
      }
    };

    console.log('[ContextAnalyzer] Created responsible context:', {
      scenario: context.scenario,
      interlocutorName: context.interlocutorName,
      patientName: context.patientName
    });

    return {
      success: true,
      context
    };
  }

  /**
   * Handles context fallback scenarios
   */
  private static handleContextFallback(
    fallbackType: keyof typeof ContextAnalyzerService.CONTEXT_FALLBACKS,
    patientData: Patient
  ): ContextAnalysisResult {
    const fallback = this.CONTEXT_FALLBACKS[fallbackType];
    
    if (fallback.logLevel === 'warning') {
      console.warn('[ContextAnalyzer] Using fallback strategy:', {
        fallbackType,
        strategy: fallback.fallbackStrategy,
        patientName: patientData.name
      });
    } else {
      console.error('[ContextAnalyzer] Using fallback strategy:', {
        fallbackType,
        strategy: fallback.fallbackStrategy,
        patientName: patientData.name
      });
    }

    // Create default patient context as fallback
    const fallbackContext: InterlocutorContext = {
      scenario: 'patient',
      interlocutorName: patientData.name,
      patientName: patientData.name,
      isResponsibleScenario: false,
      contextualData: {
        tipo_associacao: patientData.tipo_associacao || 'unknown'
      }
    };

    return {
      success: true,
      context: fallbackContext,
      fallbackReason: fallbackType as 'unknown_association_type' | 'missing_responsible_data' | 'ambiguous_context'
    };
  }

  /**
   * Generates contextual welcome message based on interlocutor context
   * 
   * @param context - Interlocutor context
   * @returns Personalized welcome message
   */
  public static generateWelcomeMessage(context: InterlocutorContext): string {
    switch (context.scenario) {
      case 'patient':
        return `Bem-vindo(a) de volta, ${context.patientName}!`;
      
      case 'responsible':
        return `Olá, ${context.interlocutorName}! Você está iniciando o atendimento para ${context.patientName}.`;
      
      default:
        return 'Bem-vindo(a) ao atendimento!';
    }
  }

  /**
   * Determines addressing mode for AI conversations
   * 
   * @param context - Interlocutor context
   * @returns Addressing mode configuration
   */
  public static getAddressingMode(context: InterlocutorContext): {
    mode: 'direct' | 'third_person';
    pronounUsage: 'you' | 'patient_name';
    questionFormulation: 'direct' | 'about_patient';
  } {
    if (context.scenario === 'patient') {
      return {
        mode: 'direct',
        pronounUsage: 'you',
        questionFormulation: 'direct'
      };
    } else {
      return {
        mode: 'third_person',
        pronounUsage: 'patient_name',
        questionFormulation: 'about_patient'
      };
    }
  }

  /**
   * Validates ACF data integrity for context analysis
   * 
   * @param acfData - ACF data from WordPress
   * @returns Validation result
   */
  public static validateACFData(acfData: any): {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const requiredFields = ['telefone', 'nome_completo', 'tipo_associacao'];
    const optionalFields = ['cpf', 'nome_completo_responc', 'cpf_responsavel'];
    
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!acfData[field]) {
        missingFields.push(field);
      }
    }

    // Check responsible scenario specific fields
    if (acfData.tipo_associacao === 'assoc_respon') {
      if (!acfData.nome_completo_responc && !acfData.nome_responsavel) {
        warnings.push('Responsible name missing for assoc_respon scenario');
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Creates chat session context from interlocutor context
   * 
   * @param interlocutorContext - Analyzed interlocutor context
   * @param sessionId - Chat session ID
   * @param patientId - Patient ID
   * @returns Chat session context
   */
  public static createChatContext(
    interlocutorContext: InterlocutorContext,
    sessionId: string,
    patientId: string
  ): Omit<ChatSessionContext, 'createdAt' | 'updatedAt'> {
    const addressingConfig = this.getAddressingMode(interlocutorContext);
    
    return {
      sessionId,
      patientId,
      interlocutorContext,
      conversationState: {
        addressingMode: addressingConfig.mode,
        currentSpeaker: interlocutorContext.interlocutorName,
        patientReference: interlocutorContext.patientName
      },
      aiInstructions: {
        basePrompt: this.generateBasePrompt(interlocutorContext),
        contextualRules: this.generateContextualRules(interlocutorContext),
        messageTemplates: this.generateMessageTemplates(interlocutorContext)
      }
    };
  }

  /**
   * Generates base AI prompt based on context
   */
  private static generateBasePrompt(context: InterlocutorContext): string {
    if (context.scenario === 'patient') {
      return `Você está conversando diretamente com ${context.patientName}. Use pronomes diretos como "você" e se dirija diretamente ao paciente.`;
    } else {
      return `Você está conversando com ${context.interlocutorName}, que é responsável pelo paciente ${context.patientName}. Dirija-se ao responsável, mas referencie o paciente em terceira pessoa.`;
    }
  }

  /**
   * Generates contextual rules for AI
   */
  private static generateContextualRules(context: InterlocutorContext): string[] {
    const rules: string[] = [];
    
    if (context.scenario === 'patient') {
      rules.push('Use pronomes diretos: "você", "seu", "sua"');
      rules.push('Pergunte diretamente sobre sintomas: "Como você está se sentindo?"');
      rules.push('Mantenha tom pessoal e direto');
    } else {
      rules.push(`Dirija-se ao responsável: ${context.interlocutorName}`);
      rules.push(`Referencie o paciente pelo nome: ${context.patientName}`);
      rules.push(`Pergunte sobre o paciente: "Como o(a) ${context.patientName} está se sentindo?"`);
      rules.push('Mantenha clareza sobre quem é o paciente e quem é o responsável');
    }
    
    return rules;
  }

  /**
   * Generates message templates for different scenarios
   */
  private static generateMessageTemplates(context: InterlocutorContext): Record<string, string> {
    if (context.scenario === 'patient') {
      return {
        greeting: `Olá, ${context.patientName}! Como posso ajudá-lo hoje?`,
        symptomInquiry: 'Como você está se sentindo? Pode me contar sobre seus sintomas?',
        orderConfirmation: 'Vou confirmar seu pedido. Está tudo correto?'
      };
    } else {
      return {
        greeting: `Olá, ${context.interlocutorName}! Como posso ajudar com o atendimento do(a) ${context.patientName}?`,
        symptomInquiry: `Como o(a) ${context.patientName} está se sentindo? Pode me contar sobre os sintomas?`,
        orderConfirmation: `Vou confirmar o pedido para ${context.patientName}. Está tudo correto?`
      };
    }
  }
}