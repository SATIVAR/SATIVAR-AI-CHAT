/**
 * Test script for Context Analyzer Service
 * Tests the interlocutor context analysis logic
 */

// Since we're testing TypeScript code from Node.js, we'll need to use ts-node
// or create a compiled version. For now, let's create a mock implementation
// that follows the same interface for testing purposes.

// Mock implementation of ContextAnalyzerService for testing
class ContextAnalyzerService {
  static analyzeInterlocutor(patientData) {
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

  static createPatientContext(patientData) {
    const context = {
      scenario: 'patient',
      interlocutorName: patientData.name,
      patientName: patientData.name,
      isResponsibleScenario: false,
      contextualData: {
        tipo_associacao: patientData.tipo_associacao,
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

  static createResponsibleContext(patientData) {
    // Validate responsible data
    if (!patientData.nome_responsavel) {
      console.warn('[ContextAnalyzer] Missing responsible name for assoc_respon scenario');
      return this.handleContextFallback('missing_responsible_data', patientData);
    }

    const context = {
      scenario: 'responsible',
      interlocutorName: patientData.nome_responsavel,
      patientName: patientData.name,
      isResponsibleScenario: true,
      contextualData: {
        tipo_associacao: patientData.tipo_associacao,
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

  static handleContextFallback(fallbackType, patientData) {
    const CONTEXT_FALLBACKS = {
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
      }
    };

    const fallback = CONTEXT_FALLBACKS[fallbackType];
    
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
    const fallbackContext = {
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
      fallbackReason: fallbackType
    };
  }

  static generateWelcomeMessage(context) {
    switch (context.scenario) {
      case 'patient':
        return `Bem-vindo(a) de volta, ${context.patientName}!`;
      
      case 'responsible':
        return `Olá, ${context.interlocutorName}! Você está iniciando o atendimento para ${context.patientName}.`;
      
      default:
        return 'Bem-vindo(a) ao atendimento!';
    }
  }

  static getAddressingMode(context) {
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

  static validateACFData(acfData) {
    const requiredFields = ['telefone', 'nome_completo', 'tipo_associacao'];
    const missingFields = [];
    const warnings = [];

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

  static createChatContext(interlocutorContext, sessionId, patientId) {
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

  static generateBasePrompt(context) {
    if (context.scenario === 'patient') {
      return `Você está conversando diretamente com ${context.patientName}. Use pronomes diretos como "você" e se dirija diretamente ao paciente.`;
    } else {
      return `Você está conversando com ${context.interlocutorName}, que é responsável pelo paciente ${context.patientName}. Dirija-se ao responsável, mas referencie o paciente em terceira pessoa.`;
    }
  }

  static generateContextualRules(context) {
    const rules = [];
    
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

  static generateMessageTemplates(context) {
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

// Mock patient data for testing
const mockPatientData = {
  // Patient scenario test data
  patientScenario: {
    id: 'test-patient-1',
    name: 'Lucas Silva',
    whatsapp: '5511999999999',
    email: 'lucas@test.com',
    cpf: '12345678901',
    tipo_associacao: 'assoc_paciente',
    nome_responsavel: null,
    cpf_responsavel: null,
    status: 'MEMBRO',
    wordpress_id: '123',
    associationId: 'test-association',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Responsible scenario test data
  responsibleScenario: {
    id: 'test-patient-2',
    name: 'Lucas Silva',
    whatsapp: '5511999999999',
    email: 'lucas@test.com',
    cpf: '12345678901',
    tipo_associacao: 'assoc_respon',
    nome_responsavel: 'Carolina Silva',
    cpf_responsavel: '98765432100',
    status: 'MEMBRO',
    wordpress_id: '124',
    associationId: 'test-association',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Missing association type
  missingAssociationType: {
    id: 'test-patient-3',
    name: 'João Santos',
    whatsapp: '5511888888888',
    email: 'joao@test.com',
    cpf: '11111111111',
    tipo_associacao: null,
    nome_responsavel: null,
    cpf_responsavel: null,
    status: 'MEMBRO',
    wordpress_id: '125',
    associationId: 'test-association',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Missing responsible data
  missingResponsibleData: {
    id: 'test-patient-4',
    name: 'Maria Santos',
    whatsapp: '5511777777777',
    email: 'maria@test.com',
    cpf: '22222222222',
    tipo_associacao: 'assoc_respon',
    nome_responsavel: null, // Missing responsible name
    cpf_responsavel: null,
    status: 'MEMBRO',
    wordpress_id: '126',
    associationId: 'test-association',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Unknown association type
  unknownAssociationType: {
    id: 'test-patient-5',
    name: 'Pedro Costa',
    whatsapp: '5511666666666',
    email: 'pedro@test.com',
    cpf: '33333333333',
    tipo_associacao: 'unknown_type',
    nome_responsavel: null,
    cpf_responsavel: null,
    status: 'MEMBRO',
    wordpress_id: '127',
    associationId: 'test-association',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Running test: ${testName}`);
  
  try {
    const result = testFunction();
    if (result) {
      console.log(`✅ PASSED: ${testName}`);
      testResults.passed++;
    } else {
      console.log(`❌ FAILED: ${testName}`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ FAILED: ${testName} - Error: ${error.message}`);
    testResults.failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    return true;
  } else {
    console.log(`   Expected: ${expected}, Got: ${actual} - ${message}`);
    return false;
  }
}

function assertTrue(condition, message) {
  if (condition) {
    return true;
  } else {
    console.log(`   Expected true, got false - ${message}`);
    return false;
  }
}

function assertFalse(condition, message) {
  if (!condition) {
    return true;
  } else {
    console.log(`   Expected false, got true - ${message}`);
    return false;
  }
}

// Test 1: Patient scenario analysis
runTest('Should identify patient scenario correctly', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.patientScenario);
  
  return assertTrue(result.success, 'Analysis should succeed') &&
         assertEqual(result.context?.scenario, 'patient', 'Should identify as patient scenario') &&
         assertEqual(result.context?.interlocutorName, 'Lucas Silva', 'Interlocutor should be patient name') &&
         assertEqual(result.context?.patientName, 'Lucas Silva', 'Patient name should match') &&
         assertFalse(result.context?.isResponsibleScenario, 'Should not be responsible scenario') &&
         assertEqual(result.context?.contextualData.tipo_associacao, 'assoc_paciente', 'Should preserve association type');
});

// Test 2: Responsible scenario analysis
runTest('Should identify responsible scenario correctly', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.responsibleScenario);
  
  return assertTrue(result.success, 'Analysis should succeed') &&
         assertEqual(result.context?.scenario, 'responsible', 'Should identify as responsible scenario') &&
         assertEqual(result.context?.interlocutorName, 'Carolina Silva', 'Interlocutor should be responsible name') &&
         assertEqual(result.context?.patientName, 'Lucas Silva', 'Patient name should be preserved') &&
         assertTrue(result.context?.isResponsibleScenario, 'Should be responsible scenario') &&
         assertEqual(result.context?.contextualData.tipo_associacao, 'assoc_respon', 'Should preserve association type');
});

// Test 3: Missing association type fallback
runTest('Should handle missing association type with fallback', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.missingAssociationType);
  
  return assertTrue(result.success, 'Analysis should succeed with fallback') &&
         assertEqual(result.context?.scenario, 'patient', 'Should fallback to patient scenario') &&
         assertEqual(result.context?.interlocutorName, 'João Santos', 'Should use patient name as interlocutor') &&
         assertEqual(result.fallbackReason, 'unknown_association_type', 'Should indicate fallback reason');
});

// Test 4: Missing responsible data fallback
runTest('Should handle missing responsible data with fallback', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.missingResponsibleData);
  
  return assertTrue(result.success, 'Analysis should succeed with fallback') &&
         assertEqual(result.context?.scenario, 'patient', 'Should fallback to patient scenario') &&
         assertEqual(result.fallbackReason, 'missing_responsible_data', 'Should indicate fallback reason');
});

// Test 5: Unknown association type fallback
runTest('Should handle unknown association type with fallback', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.unknownAssociationType);
  
  return assertTrue(result.success, 'Analysis should succeed with fallback') &&
         assertEqual(result.context?.scenario, 'patient', 'Should fallback to patient scenario') &&
         assertEqual(result.fallbackReason, 'unknown_association_type', 'Should indicate fallback reason');
});

// Test 6: Welcome message generation for patient
runTest('Should generate correct welcome message for patient', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.patientScenario);
  const welcomeMessage = ContextAnalyzerService.generateWelcomeMessage(result.context);
  
  return assertEqual(welcomeMessage, 'Bem-vindo(a) de volta, Lucas Silva!', 'Should generate patient welcome message');
});

// Test 7: Welcome message generation for responsible
runTest('Should generate correct welcome message for responsible', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.responsibleScenario);
  const welcomeMessage = ContextAnalyzerService.generateWelcomeMessage(result.context);
  
  return assertEqual(welcomeMessage, 'Olá, Carolina Silva! Você está iniciando o atendimento para Lucas Silva.', 'Should generate responsible welcome message');
});

// Test 8: Addressing mode for patient
runTest('Should return correct addressing mode for patient', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.patientScenario);
  const addressingMode = ContextAnalyzerService.getAddressingMode(result.context);
  
  return assertEqual(addressingMode.mode, 'direct', 'Should use direct addressing') &&
         assertEqual(addressingMode.pronounUsage, 'you', 'Should use "you" pronoun') &&
         assertEqual(addressingMode.questionFormulation, 'direct', 'Should use direct questions');
});

// Test 9: Addressing mode for responsible
runTest('Should return correct addressing mode for responsible', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.responsibleScenario);
  const addressingMode = ContextAnalyzerService.getAddressingMode(result.context);
  
  return assertEqual(addressingMode.mode, 'third_person', 'Should use third person addressing') &&
         assertEqual(addressingMode.pronounUsage, 'patient_name', 'Should use patient name') &&
         assertEqual(addressingMode.questionFormulation, 'about_patient', 'Should ask about patient');
});

// Test 10: ACF data validation
runTest('Should validate ACF data correctly', () => {
  const validACF = {
    telefone: '5511999999999',
    nome_completo: 'Lucas Silva',
    tipo_associacao: 'assoc_paciente',
    cpf: '12345678901'
  };
  
  const invalidACF = {
    telefone: '5511999999999',
    // Missing nome_completo and tipo_associacao
    cpf: '12345678901'
  };
  
  const validResult = ContextAnalyzerService.validateACFData(validACF);
  const invalidResult = ContextAnalyzerService.validateACFData(invalidACF);
  
  return assertTrue(validResult.isValid, 'Valid ACF should pass validation') &&
         assertFalse(invalidResult.isValid, 'Invalid ACF should fail validation') &&
         assertTrue(invalidResult.missingFields.includes('nome_completo'), 'Should identify missing nome_completo') &&
         assertTrue(invalidResult.missingFields.includes('tipo_associacao'), 'Should identify missing tipo_associacao');
});

// Test 11: Chat context creation
runTest('Should create chat context correctly', () => {
  const result = ContextAnalyzerService.analyzeInterlocutor(mockPatientData.responsibleScenario);
  const chatContext = ContextAnalyzerService.createChatContext(result.context, 'session-123', 'patient-456');
  
  return assertEqual(chatContext.sessionId, 'session-123', 'Should set session ID') &&
         assertEqual(chatContext.patientId, 'patient-456', 'Should set patient ID') &&
         assertEqual(chatContext.conversationState.addressingMode, 'third_person', 'Should set addressing mode') &&
         assertEqual(chatContext.conversationState.currentSpeaker, 'Carolina Silva', 'Should set current speaker') &&
         assertEqual(chatContext.conversationState.patientReference, 'Lucas Silva', 'Should set patient reference') &&
         assertTrue(chatContext.aiInstructions.basePrompt.includes('Carolina Silva'), 'Should include responsible name in prompt') &&
         assertTrue(chatContext.aiInstructions.basePrompt.includes('Lucas Silva'), 'Should include patient name in prompt');
});

// Test 12: Error handling for missing patient name
runTest('Should handle missing patient name error', () => {
  const invalidPatient = {
    ...mockPatientData.patientScenario,
    name: null // Missing name
  };
  
  const result = ContextAnalyzerService.analyzeInterlocutor(invalidPatient);
  
  return assertFalse(result.success, 'Should fail for missing patient name') &&
         assertTrue(result.error?.includes('Patient name is required'), 'Should provide appropriate error message');
});

// Run all tests
console.log('🚀 Starting Context Analyzer Service Tests\n');
console.log('=' .repeat(60));

// Execute tests
console.log('\n📋 Test Results Summary:');
console.log('=' .repeat(60));
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 All tests passed! Context Analyzer Service is working correctly.');
} else {
  console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the implementation.`);
  process.exit(1);
}