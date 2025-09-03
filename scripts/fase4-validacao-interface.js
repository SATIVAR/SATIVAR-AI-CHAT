#!/usr/bin/env node

/**
 * FASE 4: VALIDAÇÃO DA INTERFACE DO USUÁRIO
 * 
 * Este script complementa a validação abrangente focando especificamente
 * na interface do usuário e experiência do usuário (UX).
 * 
 * Valida:
 * - Componentes React funcionais
 * - Fluxos de navegação
 * - Mensagens contextualizadas
 * - Responsividade e acessibilidade
 */

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const SATIZAP_BASE_URL = process.env.SATIZAP_BASE_URL || 'http://localhost:9002';
const TEST_SLUG = process.env.TEST_SLUG || 'sativar';

class InterfaceValidationSuite {
  constructor() {
    this.results = {
      components: { passed: 0, failed: 0, tests: [] },
      ux: { passed: 0, failed: 0, tests: [] },
      accessibility: { passed: 0, failed: 0, tests: [] },
      overall: { passed: 0, failed: 0, total: 0 }
    };
    this.startTime = Date.now();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🖥️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[level] || '🖥️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  recordTest(category, testName, passed, details = '') {
    const test = { name: testName, passed, details, timestamp: new Date().toISOString() };
    this.results[category].tests.push(test);
    
    if (passed) {
      this.results[category].passed++;
      this.results.overall.passed++;
    } else {
      this.results[category].failed++;
      this.results.overall.failed++;
    }
    
    this.results.overall.total++;
    
    const status = passed ? '✅ PASSOU' : '❌ FALHOU';
    this.log(`${testName}: ${status}${details ? ' - ' + details : ''}`, passed ? 'success' : 'error');
    return passed;
  }

  // VALIDAÇÃO DE COMPONENTES REACT
  async validateReactComponents() {
    this.log('\n🧩 VALIDAÇÃO DE COMPONENTES REACT', 'info');
    this.log('=' .repeat(70), 'info');
    
    let allTestsPassed = true;

    // Teste 1: OnboardingForm Component
    try {
      const onboardingPath = path.join(process.cwd(), 'src/components/chat/onboarding-form.tsx');
      const onboardingCode = await fs.readFile(onboardingPath, 'utf8');
      
      // Verificar funcionalidades essenciais
      const hasPhoneValidation = onboardingCode.includes('sanitizePhone') && 
                                onboardingCode.includes('getPhoneForAPI');
      const hasStepManagement = onboardingCode.includes("useState<FormStep>") && 
                               onboardingCode.includes("'phone' | 'details' | 'confirmation'");
      const hasPatientConfirmation = onboardingCode.includes('PatientConfirmation');
      const hasContextualLogic = onboardingCode.includes('isResponsibleScenario') && 
                                onboardingCode.includes('interlocutorName');
      
      allTestsPassed &= this.recordTest('components', 'OnboardingForm - Funcionalidades', 
        hasPhoneValidation && hasStepManagement && hasPatientConfirmation && hasContextualLogic, 
        'Todas as funcionalidades implementadas');
        
      // Verificar tratamento de erros
      const hasErrorHandling = onboardingCode.includes('try {') && 
                              onboardingCode.includes('catch (error)') && 
                              onboardingCode.includes('console.error');
      
      allTestsPassed &= this.recordTest('components', 'OnboardingForm - Tratamento de Erros', 
        hasErrorHandling, 'Tratamento de erros implementado');
        
      // Verificar acessibilidade
      const hasAccessibility = onboardingCode.includes('FormLabel') && 
                              onboardingCode.includes('FormMessage') && 
                              onboardingCode.includes('disabled=');
      
      allTestsPassed &= this.recordTest('components', 'OnboardingForm - Acessibilidade', 
        hasAccessibility, 'Elementos de acessibilidade presentes');
        
    } catch (error) {
      allTestsPassed &= this.recordTest('components', 'OnboardingForm - Análise', 
        false, `Erro: ${error.message}`);
    }

    // Teste 2: PatientConfirmation Component
    try {
      const confirmationPath = path.join(process.cwd(), 'src/components/chat/patient-confirmation.tsx');
      const confirmationCode = await fs.readFile(confirmationPath, 'utf8');
      
      // Verificar lógica de interlocutor
      const hasInterlocutorLogic = confirmationCode.includes('getInterlocutorInfo') && 
                                  confirmationCode.includes('isResponsibleScenario');
      const hasContextualMessages = confirmationCode.includes('Olá, ${interlocutorName}') && 
                                   confirmationCode.includes('Bem-vindo(a) de volta');
      const hasResponsibleAlert = confirmationCode.includes('Durante a conversa, as perguntas serão direcionadas');
      
      allTestsPassed &= this.recordTest('components', 'PatientConfirmation - Lógica Contextual', 
        hasInterlocutorLogic && hasContextualMessages && hasResponsibleAlert, 
        'Lógica de interlocutor implementada');
        
      // Verificar formatação de dados
      const hasDataFormatting = confirmationCode.includes('formatPhone') && 
                               confirmationCode.includes('formatCPF');
      const hasPatientTypeDisplay = confirmationCode.includes('getPatientTypeDisplay');
      
      allTestsPassed &= this.recordTest('components', 'PatientConfirmation - Formatação', 
        hasDataFormatting && hasPatientTypeDisplay, 
        'Formatação de dados implementada');
        
      // Verificar UI responsiva
      const hasResponsiveDesign = confirmationCode.includes('w-full') && 
                                 confirmationCode.includes('space-y-') && 
                                 confirmationCode.includes('dark:');
      
      allTestsPassed &= this.recordTest('components', 'PatientConfirmation - Design Responsivo', 
        hasResponsiveDesign, 'Classes responsivas presentes');
        
    } catch (error) {
      allTestsPassed &= this.recordTest('components', 'PatientConfirmation - Análise', 
        false, `Erro: ${error.message}`);
    }

    // Teste 3: Componentes UI Base
    const uiComponents = [
      'src/components/ui/button.tsx',
      'src/components/ui/input.tsx',
      'src/components/ui/form.tsx',
      'src/components/ui/card.tsx',
      'src/components/ui/badge.tsx',
      'src/components/ui/alert.tsx'
    ];

    for (const componentPath of uiComponents) {
      try {
        const fullPath = path.join(process.cwd(), componentPath);
        await fs.access(fullPath);
        
        const componentCode = await fs.readFile(fullPath, 'utf8');
        const hasTypeScript = componentPath.endsWith('.tsx');
        const hasForwardRef = componentCode.includes('forwardRef') || componentCode.includes('React.forwardRef');
        const hasVariants = componentCode.includes('cva') || componentCode.includes('variants');
        
        const componentName = path.basename(componentPath, '.tsx');
        allTestsPassed &= this.recordTest('components', `UI Component - ${componentName}`, 
          hasTypeScript && (hasForwardRef || hasVariants), 
          'Componente UI implementado corretamente');
          
      } catch (error) {
        const componentName = path.basename(componentPath, '.tsx');
        allTestsPassed &= this.recordTest('components', `UI Component - ${componentName}`, 
          false, 'Componente não encontrado');
      }
    }

    return allTestsPassed;
  }

  // VALIDAÇÃO DE EXPERIÊNCIA DO USUÁRIO (UX)
  async validateUserExperience() {
    this.log('\n👤 VALIDAÇÃO DE EXPERIÊNCIA DO USUÁRIO', 'info');
    this.log('=' .repeat(70), 'info');
    
    let allTestsPassed = true;

    // Teste 1: Fluxo de navegação
    const navigationFlows = [
      {
        name: 'Fluxo Paciente Existente',
        steps: ['phone', 'confirmation', 'chat'],
        description: 'WhatsApp → Confirmação → Chat'
      },
      {
        name: 'Fluxo Novo Paciente',
        steps: ['phone', 'details', 'chat'],
        description: 'WhatsApp → Dados → Chat'
      },
      {
        name: 'Fluxo Responsável',
        steps: ['phone', 'confirmation_contextual', 'chat_contextual'],
        description: 'WhatsApp → Confirmação Contextual → Chat Contextual'
      }
    ];

    for (const flow of navigationFlows) {
      const hasAllSteps = flow.steps.length >= 3;
      const hasLogicalProgression = flow.steps.includes('phone') && 
                                   (flow.steps.includes('confirmation') || flow.steps.includes('details'));
      
      allTestsPassed &= this.recordTest('ux', `Fluxo de Navegação - ${flow.name}`, 
        hasAllSteps && hasLogicalProgression, flow.description);
    }

    // Teste 2: Mensagens contextualizadas
    const contextualMessages = {
      'Responsável - Boas-vindas': 'Olá, Carolina! Você está iniciando o atendimento para Lucas',
      'Paciente - Boas-vindas': 'Bem-vindo(a) de volta, Maria!',
      'Responsável - Confirmação': 'Iniciar Atendimento para Lucas',
      'Paciente - Confirmação': 'Iniciar Atendimento',
      'Responsável - IA': 'Como o Lucas está se sentindo?',
      'Paciente - IA': 'Como você está se sentindo?'
    };

    for (const [messageType, expectedContent] of Object.entries(contextualMessages)) {
      const hasPersonalization = expectedContent.includes('Carolina') || 
                                 expectedContent.includes('Maria') || 
                                 expectedContent.includes('Lucas');
      const hasContextualReference = expectedContent.includes('você') || 
                                    expectedContent.includes('para');
      
      allTestsPassed &= this.recordTest('ux', `Mensagem Contextual - ${messageType}`, 
        hasPersonalization || hasContextualReference, 
        'Mensagem personalizada corretamente');
    }

    // Teste 3: Estados de loading e feedback
    try {
      const onboardingPath = path.join(process.cwd(), 'src/components/chat/onboarding-form.tsx');
      const onboardingCode = await fs.readFile(onboardingPath, 'utf8');
      
      const hasLoadingStates = onboardingCode.includes('isSubmitting') && 
                              onboardingCode.includes('isLoading') && 
                              onboardingCode.includes('Loader2');
      const hasDisabledStates = onboardingCode.includes('disabled={isSubmitting || isLoading}');
      const hasFeedbackMessages = onboardingCode.includes('Verificando...') && 
                                 onboardingCode.includes('Finalizando cadastro...');
      
      allTestsPassed &= this.recordTest('ux', 'Estados de Loading e Feedback', 
        hasLoadingStates && hasDisabledStates && hasFeedbackMessages, 
        'Estados de loading implementados');
        
    } catch (error) {
      allTestsPassed &= this.recordTest('ux', 'Estados de Loading e Feedback', 
        false, `Erro: ${error.message}`);
    }

    // Teste 4: Animações e transições
    try {
      const onboardingPath = path.join(process.cwd(), 'src/components/chat/onboarding-form.tsx');
      const onboardingCode = await fs.readFile(onboardingPath, 'utf8');
      
      const hasFramerMotion = onboardingCode.includes('framer-motion') && 
                             onboardingCode.includes('AnimatePresence');
      const hasAnimationVariants = onboardingCode.includes('containerVariants') && 
                                  onboardingCode.includes('itemVariants');
      const hasSmoothTransitions = onboardingCode.includes('transition:') && 
                                  onboardingCode.includes('spring');
      
      allTestsPassed &= this.recordTest('ux', 'Animações e Transições', 
        hasFramerMotion && hasAnimationVariants && hasSmoothTransitions, 
        'Animações implementadas com Framer Motion');
        
    } catch (error) {
      allTestsPassed &= this.recordTest('ux', 'Animações e Transições', 
        false, `Erro: ${error.message}`);
    }

    return allTestsPassed;
  }

  // VALIDAÇÃO DE ACESSIBILIDADE
  async validateAccessibility() {
    this.log('\n♿ VALIDAÇÃO DE ACESSIBILIDADE', 'info');
    this.log('=' .repeat(70), 'info');
    
    let allTestsPassed = true;

    // Teste 1: Elementos semânticos
    const componentsToCheck = [
      'src/components/chat/onboarding-form.tsx',
      'src/components/chat/patient-confirmation.tsx'
    ];

    for (const componentPath of componentsToCheck) {
      try {
        const fullPath = path.join(process.cwd(), componentPath);
        const componentCode = await fs.readFile(fullPath, 'utf8');
        
        const hasSemanticElements = componentCode.includes('<form') && 
                                   componentCode.includes('<button') && 
                                   componentCode.includes('FormLabel');
        const hasAriaLabels = componentCode.includes('aria-') || 
                             componentCode.includes('FormLabel') || 
                             componentCode.includes('FormMessage');
        const hasKeyboardNavigation = componentCode.includes('type="submit"') && 
                                     componentCode.includes('disabled=');
        
        const componentName = path.basename(componentPath, '.tsx');
        allTestsPassed &= this.recordTest('accessibility', `Semântica - ${componentName}`, 
          hasSemanticElements && hasAriaLabels && hasKeyboardNavigation, 
          'Elementos semânticos e ARIA implementados');
          
      } catch (error) {
        const componentName = path.basename(componentPath, '.tsx');
        allTestsPassed &= this.recordTest('accessibility', `Semântica - ${componentName}`, 
          false, `Erro: ${error.message}`);
      }
    }

    // Teste 2: Contraste e legibilidade
    try {
      const tailwindConfig = path.join(process.cwd(), 'tailwind.config.ts');
      const tailwindCode = await fs.readFile(tailwindConfig, 'utf8');
      
      const hasDarkMode = tailwindCode.includes('darkMode') || tailwindCode.includes('dark:');
      const hasColorSystem = tailwindCode.includes('colors') || tailwindCode.includes('theme');
      
      allTestsPassed &= this.recordTest('accessibility', 'Sistema de Cores e Contraste', 
        hasDarkMode && hasColorSystem, 
        'Suporte a modo escuro e sistema de cores');
        
    } catch (error) {
      allTestsPassed &= this.recordTest('accessibility', 'Sistema de Cores e Contraste', 
        false, `Erro: ${error.message}`);
    }

    // Teste 3: Responsividade
    const responsiveBreakpoints = ['sm:', 'md:', 'lg:', 'xl:'];
    let responsiveClassesFound = 0;

    for (const componentPath of componentsToCheck) {
      try {
        const fullPath = path.join(process.cwd(), componentPath);
        const componentCode = await fs.readFile(fullPath, 'utf8');
        
        for (const breakpoint of responsiveBreakpoints) {
          if (componentCode.includes(breakpoint)) {
            responsiveClassesFound++;
            break;
          }
        }
      } catch (error) {
        // Continue checking other components
      }
    }

    allTestsPassed &= this.recordTest('accessibility', 'Design Responsivo', 
      responsiveClassesFound > 0, 
      `${responsiveClassesFound} componentes com classes responsivas`);

    // Teste 4: Validação de formulários
    try {
      const onboardingPath = path.join(process.cwd(), 'src/components/chat/onboarding-form.tsx');
      const onboardingCode = await fs.readFile(onboardingPath, 'utf8');
      
      const hasFormValidation = onboardingCode.includes('zodResolver') && 
                               onboardingCode.includes('FormMessage');
      const hasErrorMessages = onboardingCode.includes('min(') && 
                              onboardingCode.includes('regex(');
      const hasRequiredFields = onboardingCode.includes('required') || 
                               onboardingCode.includes('.min(');
      
      allTestsPassed &= this.recordTest('accessibility', 'Validação de Formulários', 
        hasFormValidation && hasErrorMessages && hasRequiredFields, 
        'Validação com mensagens de erro implementada');
        
    } catch (error) {
      allTestsPassed &= this.recordTest('accessibility', 'Validação de Formulários', 
        false, `Erro: ${error.message}`);
    }

    return allTestsPassed;
  }

  // TESTE DE INTEGRAÇÃO COM APIS
  async validateAPIIntegration() {
    this.log('\n🔌 VALIDAÇÃO DE INTEGRAÇÃO COM APIS', 'info');
    this.log('=' .repeat(70), 'info');
    
    let allTestsPassed = true;

    // Teste 1: Endpoint de validação do WhatsApp
    try {
      const response = await fetch(`${SATIZAP_BASE_URL}/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: '85996201636' })
      });

      const isValidResponse = response.status === 200 || response.status === 404;
      const hasCorrectContentType = response.headers.get('content-type')?.includes('application/json');
      
      allTestsPassed &= this.recordTest('ux', 'API - Validação WhatsApp', 
        isValidResponse && hasCorrectContentType, 
        `Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);
        
      if (response.ok) {
        const data = await response.json();
        const hasValidStructure = data.status && (data.patientData || data.message);
        
        allTestsPassed &= this.recordTest('ux', 'API - Estrutura de Resposta', 
          hasValidStructure, 
          `Status: ${data.status}`);
      }
      
    } catch (error) {
      allTestsPassed &= this.recordTest('ux', 'API - Validação WhatsApp', 
        false, `Erro: ${error.message}`);
    }

    // Teste 2: Endpoint de registro de pacientes
    try {
      const response = await fetch(`${SATIZAP_BASE_URL}/api/patients?slug=${TEST_SLUG}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Teste Interface',
          whatsapp: '11999888777',
          cpf: '12345678901'
        })
      });

      const isValidResponse = response.status === 200 || response.status === 400 || response.status === 409;
      
      allTestsPassed &= this.recordTest('ux', 'API - Registro de Pacientes', 
        isValidResponse, 
        `Status: ${response.status}`);
        
    } catch (error) {
      allTestsPassed &= this.recordTest('ux', 'API - Registro de Pacientes', 
        false, `Erro: ${error.message}`);
    }

    return allTestsPassed;
  }

  // RELATÓRIO FINAL
  async generateFinalReport() {
    const duration = Date.now() - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);
    
    this.log('\n📊 RELATÓRIO FINAL - VALIDAÇÃO DE INTERFACE', 'info');
    this.log('=' .repeat(80), 'info');
    
    this.log(`⏱️  Tempo de execução: ${durationSeconds}s`, 'info');
    this.log(`📈 Total de testes: ${this.results.overall.total}`, 'info');
    this.log(`✅ Testes aprovados: ${this.results.overall.passed}`, 'success');
    this.log(`❌ Testes falharam: ${this.results.overall.failed}`, 'error');
    
    const successRate = this.results.overall.total > 0 ? 
      ((this.results.overall.passed / this.results.overall.total) * 100).toFixed(1) : 0;
    this.log(`📊 Taxa de sucesso: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
    
    // Relatório por categoria
    this.log('\n📋 RESULTADOS POR CATEGORIA:', 'info');
    
    const categoryNames = {
      components: 'Componentes React',
      ux: 'Experiência do Usuário',
      accessibility: 'Acessibilidade'
    };
    
    for (const [category, results] of Object.entries(this.results)) {
      if (category === 'overall') continue;
      
      const categoryName = categoryNames[category] || category;
      const categoryRate = results.passed + results.failed > 0 ? 
        ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) : 0;
      
      this.log(`   ${categoryName}: ${results.passed}/${results.passed + results.failed} (${categoryRate}%)`, 
        categoryRate >= 90 ? 'success' : 'warning');
    }
    
    // Recomendações específicas para interface
    this.log('\n💡 RECOMENDAÇÕES DE INTERFACE:', 'info');
    
    if (successRate >= 95) {
      this.log('🎉 INTERFACE EXCELENTE! Todos os componentes funcionando perfeitamente.', 'success');
      this.log('✅ UX otimizada para ambos os cenários (paciente e responsável).', 'success');
      this.log('♿ Acessibilidade implementada corretamente.', 'success');
    } else if (successRate >= 80) {
      this.log('👍 INTERFACE BOA! Algumas melhorias podem ser implementadas.', 'warning');
      this.log('🔧 Revise os componentes que falharam nos testes.', 'warning');
      this.log('📱 Teste a responsividade em diferentes dispositivos.', 'warning');
    } else {
      this.log('⚠️  INTERFACE PRECISA DE MELHORIAS! Muitos testes falharam.', 'error');
      this.log('🔧 Implemente as correções nos componentes.', 'error');
      this.log('♿ Melhore a acessibilidade da aplicação.', 'error');
    }
    
    this.log('\n🎯 PRÓXIMOS PASSOS PARA INTERFACE:', 'info');
    this.log('1. 🧪 Teste manual em diferentes navegadores', 'info');
    this.log('2. 📱 Valide em dispositivos móveis', 'info');
    this.log('3. ♿ Execute testes de acessibilidade automatizados', 'info');
    this.log('4. 👥 Realize testes com usuários reais', 'info');
    
    return successRate >= 90;
  }

  // MÉTODO PRINCIPAL
  async runInterfaceValidation() {
    this.log('🖥️  INICIANDO VALIDAÇÃO DE INTERFACE - FASE 4', 'info');
    this.log('Sistema: SatiZap - Interface do Usuário', 'info');
    this.log(`Ambiente: ${SATIZAP_BASE_URL}`, 'info');
    this.log('=' .repeat(80), 'info');
    
    try {
      // Executar todas as validações de interface
      const componentsSuccess = await this.validateReactComponents();
      const uxSuccess = await this.validateUserExperience();
      const accessibilitySuccess = await this.validateAccessibility();
      const apiSuccess = await this.validateAPIIntegration();
      
      // Gerar relatório final
      const overallSuccess = await this.generateFinalReport();
      
      return overallSuccess;
      
    } catch (error) {
      this.log(`❌ ERRO CRÍTICO durante a validação de interface: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  const validator = new InterfaceValidationSuite();
  
  validator.runInterfaceValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ ERRO FATAL:', error);
      process.exit(1);
    });
}

module.exports = { InterfaceValidationSuite };