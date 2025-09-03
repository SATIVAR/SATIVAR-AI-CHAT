#!/usr/bin/env node

/**
 * FASE 4: EXECUTOR DE VALIDAÇÃO COMPLETA
 * 
 * Este script executa todos os testes da Fase 4 em sequência:
 * 1. Validação Abrangente (Backend + Dados + IA)
 * 2. Validação de Interface (Frontend + UX + Acessibilidade)
 * 3. Teste Manual Interativo (opcional)
 * 
 * Gera um relatório consolidado de todos os testes.
 */

const { Fase4ValidationSuite } = require('./fase4-validacao-abrangente');
const { InterfaceValidationSuite } = require('./fase4-validacao-interface');
const { InteractiveTestSuite } = require('./fase4-teste-manual-interativo');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveValidationRunner {
  constructor() {
    this.results = {
      backend: null,
      interface: null,
      manual: null,
      overall: {
        startTime: Date.now(),
        endTime: null,
        duration: null,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0,
        status: 'running'
      }
    };
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

  async runBackendValidation() {
    this.log('\n🔧 EXECUTANDO VALIDAÇÃO DE BACKEND...', 'info');
    this.log('=' .repeat(60), 'info');
    
    try {
      const validator = new Fase4ValidationSuite();
      const success = await validator.runCompleteValidation();
      
      this.results.backend = {
        success,
        results: validator.results,
        timestamp: new Date().toISOString()
      };
      
      this.log(success ? '✅ VALIDAÇÃO DE BACKEND CONCLUÍDA COM SUCESSO' : '❌ VALIDAÇÃO DE BACKEND FALHOU', 
        success ? 'success' : 'error');
      
      return success;
    } catch (error) {
      this.log(`❌ ERRO na validação de backend: ${error.message}`, 'error');
      this.results.backend = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async runInterfaceValidation() {
    this.log('\n🖥️  EXECUTANDO VALIDAÇÃO DE INTERFACE...', 'info');
    this.log('=' .repeat(60), 'info');
    
    try {
      const validator = new InterfaceValidationSuite();
      const success = await validator.runInterfaceValidation();
      
      this.results.interface = {
        success,
        results: validator.results,
        timestamp: new Date().toISOString()
      };
      
      this.log(success ? '✅ VALIDAÇÃO DE INTERFACE CONCLUÍDA COM SUCESSO' : '❌ VALIDAÇÃO DE INTERFACE FALHOU', 
        success ? 'success' : 'error');
      
      return success;
    } catch (error) {
      this.log(`❌ ERRO na validação de interface: ${error.message}`, 'error');
      this.results.interface = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async runManualTests() {
    this.log('\n🧪 TESTE MANUAL INTERATIVO DISPONÍVEL', 'info');
    this.log('=' .repeat(60), 'info');
    this.log('O teste manual interativo permite validar a experiência do usuário', 'info');
    this.log('através de cenários reais guiados passo a passo.', 'info');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const runManual = await new Promise((resolve) => {
      rl.question('\n🤔 Deseja executar o teste manual interativo agora? (s/n): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim');
      });
    });
    
    if (runManual) {
      try {
        const tester = new InteractiveTestSuite();
        const success = await tester.runInteractiveTests();
        
        this.results.manual = {
          success,
          results: tester.testResults,
          timestamp: new Date().toISOString()
        };
        
        return success;
      } catch (error) {
        this.log(`❌ ERRO no teste manual: ${error.message}`, 'error');
        this.results.manual = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        return false;
      }
    } else {
      this.log('⏭️  Teste manual pulado. Você pode executá-lo mais tarde com:', 'info');
      this.log('   node scripts/fase4-teste-manual-interativo.js', 'info');
      
      this.results.manual = {
        skipped: true,
        timestamp: new Date().toISOString()
      };
      
      return true; // Não conta como falha
    }
  }

  calculateOverallResults() {
    this.results.overall.endTime = Date.now();
    this.results.overall.duration = this.results.overall.endTime - this.results.overall.startTime;
    
    // Calcular estatísticas consolidadas
    let totalTests = 0;
    let passedTests = 0;
    
    // Backend results
    if (this.results.backend?.results) {
      totalTests += this.results.backend.results.overall.total;
      passedTests += this.results.backend.results.overall.passed;
    }
    
    // Interface results
    if (this.results.interface?.results) {
      totalTests += this.results.interface.results.overall.total;
      passedTests += this.results.interface.results.overall.passed;
    }
    
    // Manual results
    if (this.results.manual?.results && !this.results.manual.skipped) {
      totalTests += this.results.manual.results.length;
      passedTests += this.results.manual.results.filter(test => test.passed).length;
    }
    
    this.results.overall.totalTests = totalTests;
    this.results.overall.passedTests = passedTests;
    this.results.overall.failedTests = totalTests - passedTests;
    this.results.overall.successRate = totalTests > 0 ? ((passedTests / totalTests) * 100) : 0;
    
    // Determinar status geral
    const backendOk = this.results.backend?.success !== false;
    const interfaceOk = this.results.interface?.success !== false;
    const manualOk = this.results.manual?.success !== false || this.results.manual?.skipped;
    
    if (backendOk && interfaceOk && manualOk && this.results.overall.successRate >= 90) {
      this.results.overall.status = 'excellent';
    } else if (backendOk && interfaceOk && this.results.overall.successRate >= 80) {
      this.results.overall.status = 'good';
    } else if (this.results.overall.successRate >= 60) {
      this.results.overall.status = 'needs_improvement';
    } else {
      this.results.overall.status = 'critical';
    }
  }

  async generateConsolidatedReport() {
    this.calculateOverallResults();
    
    const duration = (this.results.overall.duration / 1000).toFixed(2);
    
    this.log('\n📊 RELATÓRIO CONSOLIDADO - FASE 4', 'info');
    this.log('=' .repeat(80), 'info');
    
    this.log(`⏱️  Tempo total de execução: ${duration}s`, 'info');
    this.log(`📈 Total de testes executados: ${this.results.overall.totalTests}`, 'info');
    this.log(`✅ Testes aprovados: ${this.results.overall.passedTests}`, 'success');
    this.log(`❌ Testes falharam: ${this.results.overall.failedTests}`, 
      this.results.overall.failedTests > 0 ? 'error' : 'info');
    this.log(`📊 Taxa de sucesso geral: ${this.results.overall.successRate.toFixed(1)}%`, 
      this.results.overall.successRate >= 90 ? 'success' : 'warning');
    
    // Resultados por categoria
    this.log('\n📋 RESULTADOS POR CATEGORIA:', 'info');
    
    if (this.results.backend) {
      const status = this.results.backend.success ? '✅ PASSOU' : '❌ FALHOU';
      this.log(`   🔧 Backend/Dados/IA: ${status}`, this.results.backend.success ? 'success' : 'error');
      
      if (this.results.backend.results) {
        const backendRate = this.results.backend.results.overall.total > 0 ? 
          ((this.results.backend.results.overall.passed / this.results.backend.results.overall.total) * 100).toFixed(1) : 0;
        this.log(`      Taxa: ${backendRate}% (${this.results.backend.results.overall.passed}/${this.results.backend.results.overall.total})`, 'info');
      }
    }
    
    if (this.results.interface) {
      const status = this.results.interface.success ? '✅ PASSOU' : '❌ FALHOU';
      this.log(`   🖥️  Interface/UX/Acessibilidade: ${status}`, this.results.interface.success ? 'success' : 'error');
      
      if (this.results.interface.results) {
        const interfaceRate = this.results.interface.results.overall.total > 0 ? 
          ((this.results.interface.results.overall.passed / this.results.interface.results.overall.total) * 100).toFixed(1) : 0;
        this.log(`      Taxa: ${interfaceRate}% (${this.results.interface.results.overall.passed}/${this.results.interface.results.overall.total})`, 'info');
      }
    }
    
    if (this.results.manual) {
      if (this.results.manual.skipped) {
        this.log(`   🧪 Teste Manual: ⏭️  PULADO`, 'warning');
      } else {
        const status = this.results.manual.success ? '✅ PASSOU' : '❌ FALHOU';
        this.log(`   🧪 Teste Manual: ${status}`, this.results.manual.success ? 'success' : 'error');
        
        if (this.results.manual.results) {
          const manualPassed = this.results.manual.results.filter(test => test.passed).length;
          const manualTotal = this.results.manual.results.length;
          const manualRate = manualTotal > 0 ? ((manualPassed / manualTotal) * 100).toFixed(1) : 0;
          this.log(`      Taxa: ${manualRate}% (${manualPassed}/${manualTotal})`, 'info');
        }
      }
    }
    
    // Status geral e recomendações
    this.log('\n🎯 STATUS GERAL DO SISTEMA:', 'info');
    
    switch (this.results.overall.status) {
      case 'excellent':
        this.log('🎉 EXCELENTE! Sistema funcionando perfeitamente!', 'success');
        this.log('✅ Todas as fases implementadas com sucesso', 'success');
        this.log('🚀 Sistema pronto para produção!', 'success');
        break;
        
      case 'good':
        this.log('👍 BOM! Sistema funcionando bem com pequenas melhorias necessárias', 'warning');
        this.log('🔧 Revise os testes que falharam', 'warning');
        this.log('📈 Sistema quase pronto para produção', 'warning');
        break;
        
      case 'needs_improvement':
        this.log('⚠️  PRECISA DE MELHORIAS! Vários problemas identificados', 'warning');
        this.log('🔧 Implemente as correções necessárias', 'warning');
        this.log('🧪 Execute os testes novamente após correções', 'warning');
        break;
        
      case 'critical':
        this.log('❌ CRÍTICO! Muitos problemas encontrados', 'error');
        this.log('🚨 Sistema não está pronto para produção', 'error');
        this.log('🔧 Revisão completa necessária', 'error');
        break;
    }
    
    // Próximos passos
    this.log('\n🎯 PRÓXIMOS PASSOS:', 'info');
    
    if (this.results.overall.status === 'excellent') {
      this.log('1. 🚀 Deploy para produção', 'info');
      this.log('2. 📊 Monitoramento em produção', 'info');
      this.log('3. 👥 Coleta de feedback dos usuários', 'info');
      this.log('4. 🔄 Testes regulares de regressão', 'info');
    } else {
      this.log('1. 🔧 Corrigir problemas identificados', 'info');
      this.log('2. 🧪 Re-executar testes após correções', 'info');
      this.log('3. 👥 Realizar testes com usuários reais', 'info');
      this.log('4. 📈 Monitorar métricas de qualidade', 'info');
    }
    
    // Comandos úteis
    this.log('\n💡 COMANDOS ÚTEIS:', 'info');
    this.log('• Executar apenas backend: node scripts/fase4-validacao-abrangente.js', 'info');
    this.log('• Executar apenas interface: node scripts/fase4-validacao-interface.js', 'info');
    this.log('• Executar teste manual: node scripts/fase4-teste-manual-interativo.js', 'info');
    this.log('• Executar validação completa: node scripts/fase4-executar-validacao-completa.js', 'info');
    
    // Salvar relatório
    await this.saveConsolidatedReport();
    
    return this.results.overall.status === 'excellent' || this.results.overall.status === 'good';
  }

  async saveConsolidatedReport() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(process.cwd(), 'scripts', `relatorio-fase4-${timestamp}.json`);
      
      const reportData = {
        ...this.results,
        metadata: {
          version: '1.0.0',
          system: 'SatiZap',
          phase: 'Fase 4 - Validação Abrangente',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        }
      };
      
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      this.log(`\n💾 Relatório consolidado salvo em: ${reportPath}`, 'info');
      
      // Também salvar um resumo em markdown
      const markdownPath = reportPath.replace('.json', '.md');
      const markdownContent = this.generateMarkdownReport(reportData);
      await fs.writeFile(markdownPath, markdownContent);
      this.log(`📄 Resumo em markdown salvo em: ${markdownPath}`, 'info');
      
    } catch (error) {
      this.log(`⚠️  Erro ao salvar relatório: ${error.message}`, 'warning');
    }
  }

  generateMarkdownReport(reportData) {
    const duration = (reportData.overall.duration / 1000).toFixed(2);
    const timestamp = new Date(reportData.overall.startTime).toLocaleString('pt-BR');
    
    return `# Relatório de Validação - Fase 4

## Informações Gerais
- **Sistema:** SatiZap - Cannabis Medicinal
- **Fase:** Fase 4 - Validação Abrangente
- **Data/Hora:** ${timestamp}
- **Duração:** ${duration}s
- **Status:** ${reportData.overall.status.toUpperCase()}

## Resumo dos Resultados
- **Total de Testes:** ${reportData.overall.totalTests}
- **Testes Aprovados:** ${reportData.overall.passedTests}
- **Testes Falharam:** ${reportData.overall.failedTests}
- **Taxa de Sucesso:** ${reportData.overall.successRate.toFixed(1)}%

## Resultados por Categoria

### 🔧 Backend/Dados/IA
${reportData.backend ? 
  `- **Status:** ${reportData.backend.success ? '✅ PASSOU' : '❌ FALHOU'}
- **Detalhes:** ${reportData.backend.results ? 
    `${reportData.backend.results.overall.passed}/${reportData.backend.results.overall.total} testes` : 
    'Erro na execução'}` : 
  '- **Status:** Não executado'}

### 🖥️ Interface/UX/Acessibilidade
${reportData.interface ? 
  `- **Status:** ${reportData.interface.success ? '✅ PASSOU' : '❌ FALHOU'}
- **Detalhes:** ${reportData.interface.results ? 
    `${reportData.interface.results.overall.passed}/${reportData.interface.results.overall.total} testes` : 
    'Erro na execução'}` : 
  '- **Status:** Não executado'}

### 🧪 Teste Manual
${reportData.manual ? 
  reportData.manual.skipped ? 
    '- **Status:** ⏭️ PULADO' : 
    `- **Status:** ${reportData.manual.success ? '✅ PASSOU' : '❌ FALHOU'}
- **Detalhes:** ${reportData.manual.results ? 
      `${reportData.manual.results.filter(t => t.passed).length}/${reportData.manual.results.length} testes` : 
      'Erro na execução'}` : 
  '- **Status:** Não executado'}

## Conclusão

${reportData.overall.status === 'excellent' ? 
  '🎉 **EXCELENTE!** Sistema funcionando perfeitamente e pronto para produção!' :
  reportData.overall.status === 'good' ?
  '👍 **BOM!** Sistema funcionando bem, pequenas melhorias necessárias.' :
  reportData.overall.status === 'needs_improvement' ?
  '⚠️ **PRECISA DE MELHORIAS!** Vários problemas identificados.' :
  '❌ **CRÍTICO!** Muitos problemas encontrados, revisão necessária.'}

## Próximos Passos

${reportData.overall.status === 'excellent' ? 
  `1. 🚀 Deploy para produção
2. 📊 Monitoramento em produção
3. 👥 Coleta de feedback dos usuários
4. 🔄 Testes regulares de regressão` :
  `1. 🔧 Corrigir problemas identificados
2. 🧪 Re-executar testes após correções
3. 👥 Realizar testes com usuários reais
4. 📈 Monitorar métricas de qualidade`}

---
*Relatório gerado automaticamente pelo sistema de validação SatiZap*
`;
  }

  async runCompleteValidation() {
    this.log('🚀 INICIANDO VALIDAÇÃO COMPLETA - FASE 4', 'info');
    this.log('Sistema: SatiZap - Cannabis Medicinal', 'info');
    this.log('Validação: Backend + Interface + Manual (opcional)', 'info');
    this.log('=' .repeat(80), 'info');
    
    try {
      // 1. Executar validação de backend
      const backendSuccess = await this.runBackendValidation();
      
      // 2. Executar validação de interface
      const interfaceSuccess = await this.runInterfaceValidation();
      
      // 3. Oferecer teste manual (opcional)
      const manualSuccess = await this.runManualTests();
      
      // 4. Gerar relatório consolidado
      const overallSuccess = await this.generateConsolidatedReport();
      
      this.log('\n🎯 VALIDAÇÃO COMPLETA FINALIZADA!', 'success');
      
      return overallSuccess;
      
    } catch (error) {
      this.log(`❌ ERRO CRÍTICO durante a validação: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  const runner = new ComprehensiveValidationRunner();
  
  runner.runCompleteValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ ERRO FATAL:', error);
      process.exit(1);
    });
}

module.exports = { ComprehensiveValidationRunner };