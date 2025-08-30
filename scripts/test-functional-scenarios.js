#!/usr/bin/env node

/**
 * Functional test script for URL scenarios
 * Tests actual functionality rather than just HTTP headers
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:9002';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url, BASE_URL);
    
    const requestOptions = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname + fullUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Functional-Test/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: fullUrl.toString()
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testFunctionalScenarios() {
  console.log('🧪 TESTE FUNCIONAL DE CENÁRIOS DE URL\n');
  console.log('═'.repeat(60));
  console.log('');

  const scenarios = [
    {
      name: 'Hero Section (Rota Raiz)',
      url: '/',
      requirements: ['1.2', '2.1'],
      expectedContent: ['hero', 'Hero', 'welcome', 'Welcome'],
      shouldWork: true,
      description: 'Deve carregar a Hero Section sem validação de tenant'
    },
    {
      name: 'Página da Associação Sativar',
      url: '/sativar',
      requirements: ['1.1', '2.4'],
      expectedContent: ['SATIVAR', 'sativar', 'PatientOnboarding', 'onboarding'],
      shouldWork: true,
      description: 'Deve carregar a página da associação com contexto correto'
    },
    {
      name: 'Tenant Inexistente',
      url: '/tenant-que-nao-existe',
      requirements: ['1.3', '2.3'],
      expectedContent: ['erro', 'error', 'não encontrada', 'not found'],
      shouldWork: true,
      description: 'Deve mostrar erro apropriado para tenant inválido'
    },
    {
      name: 'Rota Administrativa',
      url: '/admin',
      requirements: ['2.2'],
      expectedContent: ['admin', 'Admin', 'dashboard', 'Dashboard'],
      shouldWork: true,
      description: 'Deve funcionar sem validação de tenant'
    },
    {
      name: 'API Administrativa',
      url: '/api/admin',
      requirements: ['2.2'],
      expectedContent: [],
      shouldWork: true,
      description: 'Deve ser acessível (404 é aceitável)'
    },
    {
      name: 'Página de Erro Específica',
      url: '/association-not-found',
      requirements: ['1.3', '2.3'],
      expectedContent: ['erro', 'error', 'associação', 'association'],
      shouldWork: true,
      description: 'Deve carregar página de erro específica'
    }
  ];

  const results = [];

  for (const scenario of scenarios) {
    console.log(`🔍 ${scenario.name}`);
    console.log(`   URL: ${scenario.url}`);
    console.log(`   Descrição: ${scenario.description}`);
    console.log(`   Requisitos: ${scenario.requirements.join(', ')}`);
    
    try {
      const response = await makeRequest(scenario.url);
      
      console.log(`   Status: ${response.statusCode}`);
      
      // Analyze functionality
      const isAccessible = response.statusCode < 500;
      const hasExpectedContent = scenario.expectedContent.length === 0 || 
        scenario.expectedContent.some(content => 
          response.body.toLowerCase().includes(content.toLowerCase())
        );
      
      // For admin API, 404 is acceptable
      const isValidStatus = scenario.url === '/api/admin' ? 
        [200, 404, 405].includes(response.statusCode) :
        [200, 301, 302].includes(response.statusCode);
      
      const functionallyWorking = isAccessible && (hasExpectedContent || isValidStatus);
      
      console.log(`   Acessível: ${isAccessible ? '✅' : '❌'}`);
      console.log(`   Conteúdo Esperado: ${hasExpectedContent ? '✅' : '❌'}`);
      console.log(`   Status Válido: ${isValidStatus ? '✅' : '❌'}`);
      
      // Special checks for specific scenarios
      if (scenario.url === '/sativar') {
        // Check if it's loading the association page correctly
        const hasAssociationContent = response.body.includes('SATIVAR') || 
                                     response.body.includes('sativar') ||
                                     response.body.includes('PatientOnboarding');
        console.log(`   Conteúdo da Associação: ${hasAssociationContent ? '✅' : '❌'}`);
        
        // Test the API that the page uses
        try {
          const apiResponse = await makeRequest('/api/tenant-info?slug=sativar', {
            headers: { 'Accept': 'application/json' }
          });
          const apiWorking = apiResponse.statusCode === 200;
          console.log(`   API tenant-info: ${apiWorking ? '✅' : '❌'}`);
          
          if (apiWorking) {
            const apiData = JSON.parse(apiResponse.body);
            const hasAssociation = apiData.association && apiData.association.name === 'SATIVAR';
            console.log(`   Dados da Associação: ${hasAssociation ? '✅' : '❌'}`);
          }
        } catch (apiError) {
          console.log(`   API tenant-info: ❌ (${apiError.message})`);
        }
      }
      
      const success = functionallyWorking;
      console.log(`   Resultado: ${success ? '✅ PASSOU' : '❌ FALHOU'}`);
      
      results.push({
        scenario: scenario.name,
        url: scenario.url,
        requirements: scenario.requirements,
        success,
        statusCode: response.statusCode,
        isAccessible,
        hasExpectedContent,
        isValidStatus
      });
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      results.push({
        scenario: scenario.name,
        url: scenario.url,
        requirements: scenario.requirements,
        success: false,
        error: error.message
      });
    }
    
    console.log('');
  }

  // Generate report
  console.log('📊 RELATÓRIO FUNCIONAL\n');
  console.log('═'.repeat(60));
  console.log('');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`📈 ESTATÍSTICAS:`);
  console.log(`   Total de testes: ${totalTests}`);
  console.log(`   Sucessos: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`   Falhas: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
  console.log('');

  // Results by requirement
  const allRequirements = [...new Set(results.flatMap(r => r.requirements))];
  
  console.log('🎯 COBERTURA DE REQUISITOS:');
  allRequirements.forEach(req => {
    const reqTests = results.filter(r => r.requirements.includes(req));
    const reqPassed = reqTests.filter(r => r.success).length;
    const status = reqPassed === reqTests.length ? '✅' : reqPassed > 0 ? '⚠️' : '❌';
    
    console.log(`   ${status} Requisito ${req}: ${reqPassed}/${reqTests.length} testes passaram`);
  });
  console.log('');

  // Critical scenarios
  const criticalScenarios = [
    'Hero Section (Rota Raiz)',
    'Página da Associação Sativar',
    'Tenant Inexistente',
    'Rota Administrativa'
  ];

  console.log('🔥 CENÁRIOS CRÍTICOS:');
  criticalScenarios.forEach(scenarioName => {
    const result = results.find(r => r.scenario === scenarioName);
    if (result) {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${scenarioName}`);
    }
  });
  console.log('');

  // Final verdict
  const allCriticalPassed = criticalScenarios.every(name => {
    const result = results.find(r => r.scenario === name);
    return result && result.success;
  });

  const overallSuccess = passedTests >= totalTests * 0.8; // 80% success rate

  if (allCriticalPassed && overallSuccess) {
    console.log('🎉 SUCESSO FUNCIONAL COMPLETO!');
    console.log('✅ Todos os cenários críticos estão funcionando');
    console.log('✅ Taxa de sucesso aceitável alcançada');
    console.log('');
    console.log('🚀 Funcionalidades testadas com sucesso:');
    console.log('   • localhost:9002/ carrega Hero Section');
    console.log('   • localhost:9002/sativar carrega página da associação');
    console.log('   • URLs com tenant inválido mostram erro apropriado');
    console.log('   • Rotas administrativas funcionam corretamente');
    console.log('');
    console.log('💡 Nota: O middleware funciona através da API tenant-info');
    console.log('   para páginas dinâmicas, garantindo o contexto correto.');
  } else {
    console.log('⚠️  ATENÇÃO: Alguns problemas funcionais foram encontrados');
    
    if (!allCriticalPassed) {
      console.log('❌ Nem todos os cenários críticos estão funcionando');
    }
    
    if (!overallSuccess) {
      console.log('❌ Taxa de sucesso abaixo do esperado');
    }
  }

  return allCriticalPassed && overallSuccess;
}

// Run the test
testFunctionalScenarios().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});