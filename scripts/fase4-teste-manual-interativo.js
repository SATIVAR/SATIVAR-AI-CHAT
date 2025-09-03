#!/usr/bin/env node

/**
 * FASE 4: TESTE MANUAL INTERATIVO
 * 
 * Este script guia o usuário através de testes manuais interativos
 * para validar a experiência completa do usuário em cenários reais.
 */

const readline = require('readline');
const fetch = require('node-fetch');

const SATIZAP_BASE_URL = process.env.SATIZAP_BASE_URL || 'http://localhost:9002';
const TEST_SLUG = process.env.TEST_SLUG || 'sativar';

class InteractiveTestSuite {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.testResults = [];
    this.currentTest = 0;
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  log(message, level = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    const color = colors[level] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
  }

  async waitForEnter(message = 'Pressione ENTER para continuar...') {
    await this.question(`\n${message}`);
  }

  async recordTestResult(testName, description) {
    this.log(`\n📋 TESTE ${++this.currentTest}: ${testName}`, 'info');
    this.log(`📝 ${description}`, 'info');
    
    const result = await this.question('\n✅ O teste passou? (s/n): ');
    const passed = result.toLowerCase() === 's' || result.toLowerCase() === 'sim';
    
    let details = '';
    if (!passed) {
      details = await this.question('📝 Descreva o problema encontrado: ');
    }
    
    this.testResults.push({
      name: testName,
      description,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    this.log(passed ? '✅ PASSOU' : '❌ FALHOU', passed ? 'success' : 'error');
    return passed;
  }

  // CENÁRIO 1: TESTE DO RESPONSÁVEL
  async testResponsibleScenario() {
    this.log('\n👥 CENÁRIO 1: TESTE DO RESPONSÁVEL', 'info');
    this.log('=' .repeat(60), 'info');
    this.log('Neste cenário, você testará como responsável (Carolina) falando pelo paciente (Lucas)', 'info');
    
    await this.waitForEnter();
    
    // Passo 1: Acessar a página
    this.log(`\n🌐 PASSO 1: Acesse ${SATIZAP_BASE_URL}/${TEST_SLUG}`, 'info');
    await this.recordTestResult(
      'Acesso à Página Principal',
      'A página carregou corretamente? Você vê o formulário de WhatsApp?'
    );
    
    // Passo 2: Inserir WhatsApp
    this.log('\n📱 PASSO 2: Digite o WhatsApp: 85996201636', 'info');
    this.log('Este número deve estar cadastrado no WordPress como responsável', 'warning');
    await this.recordTestResult(
      'Inserção do WhatsApp',
      'O campo aceita o número? A formatação está correta? O botão "Continuar" está habilitado?'
    );
    
    // Passo 3: Clique em Continuar
    this.log('\n🔄 PASSO 3: Clique em "Continuar"', 'info');
    await this.recordTestResult(
      'Validação do WhatsApp',
      'Apareceu um loading? A validação foi executada? Você foi direcionado para a tela de confirmação?'
    );
    
    // Passo 4: Verificar tela de confirmação
    this.log('\n✅ PASSO 4: Verifique a tela de confirmação', 'info');
    this.log('Você deve ver:', 'info');
    this.log('• "Olá, Carolina! Você está iniciando o atendimento para Lucas"', 'info');
    this.log('• Badge "Atendimento via Responsável"', 'info');
    this.log('• Dados do paciente (Lucas) e do responsável (Carolina)', 'info');
    this.log('• Alerta explicativo sobre o contexto', 'info');
    
    await this.recordTestResult(
      'Tela de Confirmação - Responsável',
      'A mensagem está contextualizada? Os dados estão corretos? O alerta explicativo aparece?'
    );
    
    // Passo 5: Iniciar atendimento
    this.log('\n💬 PASSO 5: Clique em "Iniciar Atendimento para Lucas"', 'info');
    await this.recordTestResult(
      'Iniciar Atendimento - Responsável',
      'O botão tem o texto correto? O chat foi iniciado? A mensagem de boas-vindas está contextualizada?'
    );
    
    // Passo 6: Verificar mensagem de boas-vindas
    this.log('\n👋 PASSO 6: Verifique a mensagem de boas-vindas da IA', 'info');
    this.log('A mensagem deve:', 'info');
    this.log('• Se dirigir a você (Carolina) como responsável', 'info');
    this.log('• Mencionar que o atendimento é para Lucas', 'info');
    this.log('• Usar linguagem apropriada para responsável', 'info');
    
    await this.recordTestResult(
      'Mensagem de Boas-vindas - IA Contextual',
      'A IA se dirige corretamente a você como responsável? Menciona o paciente Lucas?'
    );
    
    // Passo 7: Teste de conversa
    this.log('\n💬 PASSO 7: Teste uma conversa', 'info');
    this.log('Digite: "Preciso de produtos para ansiedade do Lucas"', 'info');
    
    await this.recordTestResult(
      'Conversa Contextual - Responsável',
      'A IA responde se dirigindo a você? Faz perguntas sobre o Lucas? A linguagem está apropriada?'
    );
  }

  // CENÁRIO 2: TESTE DO PACIENTE DIRETO
  async testDirectPatientScenario() {
    this.log('\n👤 CENÁRIO 2: TESTE DO PACIENTE DIRETO', 'info');
    this.log('=' .repeat(60), 'info');
    this.log('Neste cenário, você testará como paciente falando diretamente', 'info');
    
    await this.waitForEnter();
    
    // Passo 1: Acessar nova sessão
    this.log('\n🌐 PASSO 1: Abra uma nova aba/sessão incógnita', 'info');
    this.log(`Acesse: ${SATIZAP_BASE_URL}/${TEST_SLUG}`, 'info');
    await this.recordTestResult(
      'Nova Sessão - Paciente Direto',
      'Nova sessão iniciada? Formulário limpo aparece?'
    );
    
    // Passo 2: Inserir WhatsApp de paciente direto
    this.log('\n📱 PASSO 2: Digite um WhatsApp de paciente direto', 'info');
    this.log('Use: 11987654321 (deve estar cadastrado como paciente direto)', 'warning');
    await this.recordTestResult(
      'WhatsApp Paciente Direto',
      'Campo aceita o número? Formatação correta?'
    );
    
    // Passo 3: Validação
    this.log('\n🔄 PASSO 3: Clique em "Continuar"', 'info');
    await this.recordTestResult(
      'Validação Paciente Direto',
      'Loading aparece? Direcionado para confirmação?'
    );
    
    // Passo 4: Verificar confirmação de paciente direto
    this.log('\n✅ PASSO 4: Verifique a tela de confirmação', 'info');
    this.log('Você deve ver:', 'info');
    this.log('• "Bem-vindo(a) de volta, [Nome do Paciente]!"', 'info');
    this.log('• Badge "Atendimento Direto"', 'info');
    this.log('• Apenas dados do paciente (sem responsável)', 'info');
    this.log('• SEM alerta de contexto de responsável', 'info');
    
    await this.recordTestResult(
      'Confirmação Paciente Direto',
      'Mensagem correta? Sem informações de responsável? Interface apropriada?'
    );
    
    // Passo 5: Iniciar atendimento direto
    this.log('\n💬 PASSO 5: Clique em "Iniciar Atendimento"', 'info');
    await this.recordTestResult(
      'Iniciar Atendimento Direto',
      'Botão tem texto simples? Chat iniciado corretamente?'
    );
    
    // Passo 6: Verificar mensagem de boas-vindas direta
    this.log('\n👋 PASSO 6: Verifique a mensagem de boas-vindas', 'info');
    this.log('A mensagem deve:', 'info');
    this.log('• Se dirigir diretamente ao paciente', 'info');
    this.log('• Usar "você" em vez de terceira pessoa', 'info');
    this.log('• Não mencionar responsável', 'info');
    
    await this.recordTestResult(
      'Boas-vindas Paciente Direto',
      'IA se dirige diretamente ao paciente? Usa "você"? Sem menção a responsável?'
    );
    
    // Passo 7: Teste de conversa direta
    this.log('\n💬 PASSO 7: Teste uma conversa', 'info');
    this.log('Digite: "Preciso de produtos para ansiedade"', 'info');
    
    await this.recordTestResult(
      'Conversa Direta',
      'IA responde diretamente a você? Usa "você" consistentemente? Linguagem apropriada?'
    );
  }

  // CENÁRIO 3: TESTE DE NOVO PACIENTE (LEAD)
  async testNewPatientScenario() {
    this.log('\n🆕 CENÁRIO 3: TESTE DE NOVO PACIENTE (LEAD)', 'info');
    this.log('=' .repeat(60), 'info');
    this.log('Neste cenário, você testará o cadastro de um novo paciente', 'info');
    
    await this.waitForEnter();
    
    // Passo 1: Nova sessão
    this.log('\n🌐 PASSO 1: Abra uma nova aba/sessão', 'info');
    this.log(`Acesse: ${SATIZAP_BASE_URL}/${TEST_SLUG}`, 'info');
    await this.recordTestResult(
      'Nova Sessão - Lead',
      'Nova sessão limpa iniciada?'
    );
    
    // Passo 2: WhatsApp não cadastrado
    this.log('\n📱 PASSO 2: Digite um WhatsApp NÃO cadastrado', 'info');
    this.log('Use: 21999888777 (deve ser um número novo)', 'warning');
    await this.recordTestResult(
      'WhatsApp Novo',
      'Campo aceita o número? Formatação correta?'
    );
    
    // Passo 3: Validação de novo paciente
    this.log('\n🔄 PASSO 3: Clique em "Continuar"', 'info');
    await this.recordTestResult(
      'Validação Novo Paciente',
      'Loading aparece? Direcionado para formulário de dados?'
    );
    
    // Passo 4: Formulário de dados
    this.log('\n📝 PASSO 4: Preencha o formulário de dados', 'info');
    this.log('• Nome: João Santos', 'info');
    this.log('• CPF: 11122233344', 'info');
    this.log('• WhatsApp deve estar preenchido e desabilitado', 'info');
    
    await this.recordTestResult(
      'Formulário de Dados',
      'Campos aparecem corretamente? WhatsApp preenchido e desabilitado? Validação funciona?'
    );
    
    // Passo 5: Finalizar cadastro
    this.log('\n✅ PASSO 5: Clique em "Iniciar Atendimento"', 'info');
    await this.recordTestResult(
      'Finalizar Cadastro Lead',
      'Loading aparece? Cadastro é finalizado? Chat é iniciado?'
    );
    
    // Passo 6: Verificar mensagem para lead
    this.log('\n👋 PASSO 6: Verifique a mensagem de boas-vindas', 'info');
    this.log('A mensagem deve:', 'info');
    this.log('• Dar boas-vindas como novo usuário', 'info');
    this.log('• Explicar sobre a associação', 'info');
    this.log('• Ser apropriada para um lead', 'info');
    
    await this.recordTestResult(
      'Boas-vindas Lead',
      'Mensagem apropriada para novo usuário? Explica sobre a associação?'
    );
  }

  // TESTES DE RESPONSIVIDADE
  async testResponsiveness() {
    this.log('\n📱 TESTE DE RESPONSIVIDADE', 'info');
    this.log('=' .repeat(60), 'info');
    this.log('Teste a interface em diferentes tamanhos de tela', 'info');
    
    await this.waitForEnter();
    
    // Mobile
    this.log('\n📱 PASSO 1: Teste em modo mobile', 'info');
    this.log('• Abra as ferramentas de desenvolvedor (F12)', 'info');
    this.log('• Ative o modo responsivo', 'info');
    this.log('• Selecione iPhone ou Android', 'info');
    
    await this.recordTestResult(
      'Layout Mobile',
      'Interface se adapta bem? Botões são clicáveis? Texto legível?'
    );
    
    // Tablet
    this.log('\n📱 PASSO 2: Teste em modo tablet', 'info');
    this.log('• Selecione iPad ou tablet Android', 'info');
    
    await this.recordTestResult(
      'Layout Tablet',
      'Interface aproveita bem o espaço? Elementos bem posicionados?'
    );
    
    // Desktop
    this.log('\n🖥️  PASSO 3: Teste em desktop', 'info');
    this.log('• Volte ao modo desktop', 'info');
    this.log('• Teste em diferentes resoluções', 'info');
    
    await this.recordTestResult(
      'Layout Desktop',
      'Interface bem centralizada? Aproveita o espaço disponível?'
    );
  }

  // TESTES DE ACESSIBILIDADE
  async testAccessibility() {
    this.log('\n♿ TESTE DE ACESSIBILIDADE', 'info');
    this.log('=' .repeat(60), 'info');
    this.log('Teste a acessibilidade da interface', 'info');
    
    await this.waitForEnter();
    
    // Navegação por teclado
    this.log('\n⌨️  PASSO 1: Navegação por teclado', 'info');
    this.log('• Use apenas o teclado (Tab, Enter, Esc)', 'info');
    this.log('• Navegue por todos os elementos', 'info');
    this.log('• Preencha e envie o formulário', 'info');
    
    await this.recordTestResult(
      'Navegação por Teclado',
      'Todos os elementos são acessíveis via teclado? Ordem lógica? Focus visível?'
    );
    
    // Modo escuro
    this.log('\n🌙 PASSO 2: Modo escuro', 'info');
    this.log('• Procure por um botão de alternância de tema', 'info');
    this.log('• Teste a interface no modo escuro', 'info');
    
    await this.recordTestResult(
      'Modo Escuro',
      'Modo escuro disponível? Contraste adequado? Todos os elementos visíveis?'
    );
    
    // Zoom
    this.log('\n🔍 PASSO 3: Teste de zoom', 'info');
    this.log('• Aumente o zoom para 200% (Ctrl/Cmd + +)', 'info');
    this.log('• Teste a funcionalidade', 'info');
    
    await this.recordTestResult(
      'Zoom 200%',
      'Interface funciona bem com zoom? Texto legível? Botões clicáveis?'
    );
  }

  // RELATÓRIO FINAL
  async generateFinalReport() {
    this.log('\n📊 RELATÓRIO FINAL - TESTE MANUAL INTERATIVO', 'info');
    this.log('=' .repeat(80), 'info');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    this.log(`📈 Total de testes: ${totalTests}`, 'info');
    this.log(`✅ Testes aprovados: ${passedTests}`, 'success');
    this.log(`❌ Testes falharam: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
    this.log(`📊 Taxa de sucesso: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
    
    // Testes que falharam
    if (failedTests > 0) {
      this.log('\n❌ TESTES QUE FALHARAM:', 'error');
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          this.log(`• ${test.name}: ${test.details}`, 'error');
        });
    }
    
    // Recomendações
    this.log('\n💡 RECOMENDAÇÕES:', 'info');
    
    if (successRate >= 95) {
      this.log('🎉 EXCELENTE! A interface está funcionando perfeitamente!', 'success');
      this.log('✅ Experiência do usuário otimizada para todos os cenários.', 'success');
      this.log('🚀 Sistema pronto para uso em produção!', 'success');
    } else if (successRate >= 80) {
      this.log('👍 BOM! A maioria dos testes passou, mas há melhorias a fazer.', 'warning');
      this.log('🔧 Corrija os problemas identificados nos testes que falharam.', 'warning');
      this.log('🧪 Execute novamente após as correções.', 'warning');
    } else {
      this.log('⚠️  ATENÇÃO! Muitos problemas foram identificados.', 'error');
      this.log('🔧 Revise e corrija os problemas antes de prosseguir.', 'error');
      this.log('👥 Considere testes adicionais com usuários reais.', 'error');
    }
    
    // Salvar relatório
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      successRate: parseFloat(successRate),
      tests: this.testResults
    };
    
    const fs = require('fs').promises;
    const reportPath = `scripts/relatorio-teste-manual-${Date.now()}.json`;
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      this.log(`\n💾 Relatório salvo em: ${reportPath}`, 'info');
    } catch (error) {
      this.log(`\n⚠️  Erro ao salvar relatório: ${error.message}`, 'warning');
    }
    
    return successRate >= 90;
  }

  // MÉTODO PRINCIPAL
  async runInteractiveTests() {
    this.log('🧪 TESTE MANUAL INTERATIVO - FASE 4', 'info');
    this.log('Sistema: SatiZap - Validação Manual Completa', 'info');
    this.log(`Ambiente: ${SATIZAP_BASE_URL}`, 'info');
    this.log('=' .repeat(80), 'info');
    
    this.log('\n📋 INSTRUÇÕES:', 'info');
    this.log('• Este teste guiará você através de cenários reais', 'info');
    this.log('• Siga as instruções cuidadosamente', 'info');
    this.log('• Responda honestamente se cada teste passou ou falhou', 'info');
    this.log('• Descreva problemas encontrados quando solicitado', 'info');
    
    const startTest = await this.question('\n🚀 Deseja iniciar os testes? (s/n): ');
    if (startTest.toLowerCase() !== 's' && startTest.toLowerCase() !== 'sim') {
      this.log('Teste cancelado pelo usuário.', 'warning');
      this.rl.close();
      return false;
    }
    
    try {
      // Executar todos os cenários de teste
      await this.testResponsibleScenario();
      await this.testDirectPatientScenario();
      await this.testNewPatientScenario();
      await this.testResponsiveness();
      await this.testAccessibility();
      
      // Gerar relatório final
      const success = await this.generateFinalReport();
      
      this.log('\n🎯 TESTE MANUAL CONCLUÍDO!', 'success');
      this.log('Obrigado por testar o sistema SatiZap.', 'info');
      
      return success;
      
    } catch (error) {
      this.log(`❌ ERRO durante o teste: ${error.message}`, 'error');
      return false;
    } finally {
      this.rl.close();
    }
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  const tester = new InteractiveTestSuite();
  
  tester.runInteractiveTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ ERRO FATAL:', error);
      process.exit(1);
    });
}

module.exports = { InteractiveTestSuite };