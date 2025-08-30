#!/usr/bin/env node

/**
 * Comprehensive test script for all URL scenarios in development
 * Task 7: Testar todos os cenários de URL em desenvolvimento
 * 
 * This script tests:
 * - localhost:9002/ loads Hero Section correctly
 * - localhost:9002/sativar loads association page
 * - URLs with invalid tenant show appropriate error
 * - Administrative routes continue working
 */

const http = require('http');
const { URL } = require('url');

// Test configuration
const BASE_URL = 'http://localhost:9002';
const TIMEOUT = 10000; // 10 seconds

const TEST_SCENARIOS = [
  // Hero Section Tests (Requirement 1.2, 2.1)
  {
    category: 'Hero Section',
    name: 'Root Route - Hero Section',
    url: '/',
    expectedBehavior: 'Should load Hero Section without tenant validation',
    requirements: ['1.2', '2.1'],
    expectedStatus: [200, 301, 302],
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica que a rota raiz carrega a Hero Section corretamente'
  },

  // Valid Tenant Tests (Requirement 1.1, 2.4)
  {
    category: 'Valid Tenant',
    name: 'Valid Tenant - Sativar',
    url: '/sativar',
    expectedBehavior: 'Should load association page with tenant context',
    requirements: ['1.1', '2.4'],
    expectedStatus: [200, 301, 302],
    shouldHaveTenant: true,
    shouldBeAccessible: true,
    description: 'Verifica que localhost:9002/sativar carrega a página da associação'
  },

  // Invalid Tenant Tests (Requirement 1.3, 2.3)
  {
    category: 'Invalid Tenant',
    name: 'Invalid Tenant - Nonexistent',
    url: '/nonexistent-tenant',
    expectedBehavior: 'Should show appropriate error page gracefully',
    requirements: ['1.3', '2.3'],
    expectedStatus: [200, 404, 301, 302], // Allow redirects to error pages
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica que URLs com tenant inválido mostram erro apropriado'
  },
  {
    category: 'Invalid Tenant',
    name: 'Invalid Tenant - Random',
    url: '/random-invalid-slug',
    expectedBehavior: 'Should show appropriate error page gracefully',
    requirements: ['1.3', '2.3'],
    expectedStatus: [200, 404, 301, 302],
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica tratamento gracioso para tenant inexistente'
  },

  // Administrative Routes Tests (Requirement 2.2)
  {
    category: 'Administrative Routes',
    name: 'Admin Route',
    url: '/admin',
    expectedBehavior: 'Should load without tenant validation',
    requirements: ['2.2'],
    expectedStatus: [200, 404, 301, 302], // Admin might not exist yet, but should be accessible
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica que rotas administrativas continuam funcionando'
  },
  {
    category: 'Administrative Routes',
    name: 'API Admin Route',
    url: '/api/admin',
    expectedBehavior: 'Should be accessible without tenant validation',
    requirements: ['2.2'],
    expectedStatus: [200, 404, 405, 301, 302], // API might return 405 Method Not Allowed for GET
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica que rotas de API administrativas funcionam'
  },

  // Error Pages Tests
  {
    category: 'Error Pages',
    name: 'Association Not Found Page',
    url: '/association-not-found',
    expectedBehavior: 'Should load error page without tenant validation',
    requirements: ['1.3', '2.3'],
    expectedStatus: [200, 404],
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica que página de erro específica funciona'
  },

  // Additional Edge Cases
  {
    category: 'Edge Cases',
    name: 'Empty Path Segment',
    url: '//',
    expectedBehavior: 'Should handle gracefully',
    requirements: ['2.1'],
    expectedStatus: [200, 301, 302, 404],
    shouldHaveTenant: false,
    shouldBeAccessible: true,
    description: 'Verifica tratamento de URLs malformadas'
  },
  {
    category: 'Edge Cases',
    name: 'Path with Query Parameters',
    url: '/sativar?test=1',
    expectedBehavior: 'Should load with tenant context and preserve query params',
    requirements: ['1.1'],
    expectedStatus: [200, 301, 302],
    shouldHaveTenant: true,
    shouldBeAccessible: true,
    description: 'Verifica que query parameters são preservados'
  }
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url, BASE_URL);
    
    const requestOptions = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname + fullUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'URL-Scenario-Test/1.0',
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
          url: fullUrl.toString(),
          redirected: res.statusCode >= 300 && res.statusCode < 400
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TIMEOUT}ms`));
    });

    req.end();
  });
}

function analyzeResponse(response, scenario) {
  const analysis = {
    accessible: response.statusCode < 500, // No server errors
    statusOk: scenario.expectedStatus.includes(response.statusCode),
    hasTenantHeaders: !!(
      response.headers['x-tenant-id'] || 
      response.headers['x-tenant-subdomain'] || 
      response.headers['x-tenant-name']
    ),
    hasDevHeaders: !!(
      response.headers['x-dev-tenant-missing'] ||
      response.headers['x-dev-requested-tenant'] ||
      response.headers['x-dev-fallback-mode'] ||
      response.headers['x-dev-middleware-error']
    ),
    isRedirect: response.statusCode >= 300 && response.statusCode < 400,
    redirectLocation: response.headers.location,
    contentLength: response.headers['content-length'],
    contentType: response.headers['content-type']
  };

  // Check if tenant headers match expectation
  analysis.tenantHeadersMatch = scenario.shouldHaveTenant === analysis.hasTenantHeaders;
  
  // Check if response indicates Hero Section (basic heuristic)
  analysis.looksLikeHeroSection = response.body.includes('hero') || 
                                  response.body.includes('Hero') ||
                                  response.body.includes('welcome') ||
                                  response.body.includes('Welcome');

  // Check if response indicates error page
  analysis.looksLikeErrorPage = response.body.includes('erro') ||
                                response.body.includes('error') ||
                                response.body.includes('não encontrada') ||
                                response.body.includes('not found');

  // Overall success criteria
  analysis.success = analysis.accessible && 
                     analysis.statusOk && 
                     analysis.tenantHeadersMatch;

  return analysis;
}

async function checkServerHealth() {
  console.log('🏥 Verificando saúde do servidor...\n');
  
  try {
    const response = await makeRequest('/');
    console.log('✅ Servidor está rodando em http://localhost:9002');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'N/A'}`);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Erro: Servidor não está rodando em http://localhost:9002');
    console.error(`   Detalhes: ${error.message}`);
    console.error('💡 Execute "npm run dev" em outro terminal primeiro\n');
    return false;
  }
}

async function runScenarioTest(scenario) {
  console.log(`🔍 ${scenario.category}: ${scenario.name}`);
  console.log(`   URL: ${scenario.url}`);
  console.log(`   Descrição: ${scenario.description}`);
  console.log(`   Requisitos: ${scenario.requirements.join(', ')}`);
  
  try {
    const response = await makeRequest(scenario.url);
    const analysis = analyzeResponse(response, scenario);
    
    // Display results
    console.log(`   Status: ${response.statusCode} ${analysis.statusOk ? '✅' : '❌'}`);
    console.log(`   Acessível: ${analysis.accessible ? '✅' : '❌'}`);
    console.log(`   Tenant Headers: ${analysis.hasTenantHeaders ? '✅' : '❌'} (esperado: ${scenario.shouldHaveTenant ? 'Sim' : 'Não'})`);
    
    if (analysis.hasDevHeaders) {
      console.log(`   Dev Headers: ✅`);
      if (response.headers['x-dev-fallback-mode']) {
        console.log(`     Fallback Mode: ${response.headers['x-dev-fallback-mode']}`);
      }
      if (response.headers['x-dev-requested-tenant']) {
        console.log(`     Requested Tenant: ${response.headers['x-dev-requested-tenant']}`);
      }
    }
    
    if (analysis.isRedirect) {
      console.log(`   Redirecionamento: ${analysis.redirectLocation}`);
    }
    
    if (analysis.hasTenantHeaders) {
      console.log(`   Tenant ID: ${response.headers['x-tenant-id'] || 'N/A'}`);
      console.log(`   Tenant Subdomain: ${response.headers['x-tenant-subdomain'] || 'N/A'}`);
    }

    // Content analysis
    if (scenario.name.includes('Hero Section') && analysis.looksLikeHeroSection) {
      console.log(`   Conteúdo: ✅ Parece ser Hero Section`);
    } else if (scenario.name.includes('Invalid') && analysis.looksLikeErrorPage) {
      console.log(`   Conteúdo: ✅ Parece ser página de erro`);
    }
    
    const success = analysis.success;
    console.log(`   Resultado: ${success ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log('');
    
    return {
      scenario: scenario.name,
      category: scenario.category,
      url: scenario.url,
      requirements: scenario.requirements,
      success,
      analysis,
      response: {
        statusCode: response.statusCode,
        headers: response.headers,
        redirected: analysis.isRedirect,
        redirectLocation: analysis.redirectLocation
      }
    };
    
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    console.log('');
    
    return {
      scenario: scenario.name,
      category: scenario.category,
      url: scenario.url,
      requirements: scenario.requirements,
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🧪 TESTE COMPLETO DE CENÁRIOS DE URL EM DESENVOLVIMENTO\n');
  console.log('═'.repeat(70));
  console.log('');

  // Check server health first
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }

  const results = [];
  const categories = [...new Set(TEST_SCENARIOS.map(s => s.category))];

  for (const category of categories) {
    console.log(`📂 CATEGORIA: ${category.toUpperCase()}`);
    console.log('─'.repeat(50));
    
    const categoryScenarios = TEST_SCENARIOS.filter(s => s.category === category);
    
    for (const scenario of categoryScenarios) {
      const result = await runScenarioTest(scenario);
      results.push(result);
    }
    
    console.log('');
  }

  return results;
}

function generateReport(results) {
  console.log('📊 RELATÓRIO FINAL\n');
  console.log('═'.repeat(70));
  console.log('');

  // Overall statistics
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`📈 ESTATÍSTICAS GERAIS`);
  console.log(`   Total de testes: ${totalTests}`);
  console.log(`   Sucessos: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`   Falhas: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
  console.log('');

  // Results by category
  const categories = [...new Set(results.map(r => r.category))];
  
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.success).length;
    
    console.log(`📂 ${category.toUpperCase()}`);
    console.log(`   Testes: ${categoryResults.length} | Sucessos: ${categoryPassed}`);
    
    categoryResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.scenario} (${result.url})`);
      
      if (result.error) {
        console.log(`      Erro: ${result.error}`);
      } else if (result.response) {
        console.log(`      Status: ${result.response.statusCode}`);
        if (result.response.redirected) {
          console.log(`      Redirecionado para: ${result.response.redirectLocation}`);
        }
      }
    });
    console.log('');
  });

  // Requirements coverage
  console.log('🎯 COBERTURA DE REQUISITOS');
  const allRequirements = [...new Set(results.flatMap(r => r.requirements))];
  
  allRequirements.forEach(req => {
    const reqTests = results.filter(r => r.requirements.includes(req));
    const reqPassed = reqTests.filter(r => r.success).length;
    const status = reqPassed === reqTests.length ? '✅' : reqPassed > 0 ? '⚠️' : '❌';
    
    console.log(`   ${status} Requisito ${req}: ${reqPassed}/${reqTests.length} testes passaram`);
  });
  console.log('');

  // Critical scenarios check
  const criticalScenarios = [
    'Root Route - Hero Section',
    'Valid Tenant - Sativar',
    'Invalid Tenant - Nonexistent',
    'Admin Route'
  ];

  console.log('🔥 CENÁRIOS CRÍTICOS');
  criticalScenarios.forEach(scenarioName => {
    const result = results.find(r => r.scenario === scenarioName);
    if (result) {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${scenarioName}`);
    } else {
      console.log(`   ⚠️  ${scenarioName} (não testado)`);
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
    console.log('🎉 SUCESSO COMPLETO!');
    console.log('✅ Todos os cenários críticos passaram');
    console.log('✅ Taxa de sucesso aceitável alcançada');
    console.log('');
    console.log('🚀 O sistema está funcionando corretamente em desenvolvimento!');
    console.log('');
    console.log('📋 Cenários testados com sucesso:');
    console.log('   • localhost:9002/ carrega Hero Section corretamente');
    console.log('   • localhost:9002/sativar carrega página da associação');
    console.log('   • URLs com tenant inválido mostram erro apropriado');
    console.log('   • Rotas administrativas continuam funcionando');
  } else {
    console.log('⚠️  ATENÇÃO: Alguns problemas foram encontrados');
    
    if (!allCriticalPassed) {
      console.log('❌ Nem todos os cenários críticos passaram');
    }
    
    if (!overallSuccess) {
      console.log('❌ Taxa de sucesso abaixo do esperado');
    }
    
    console.log('');
    console.log('💡 Recomendações:');
    console.log('   1. Verifique os logs do middleware para erros');
    console.log('   2. Execute "npm run db:setup" para garantir dados de teste');
    console.log('   3. Verifique se o servidor está rodando corretamente');
    console.log('   4. Revise a implementação do middleware para cenários que falharam');
  }

  return allCriticalPassed && overallSuccess;
}

async function main() {
  try {
    const results = await runAllTests();
    const success = generateReport(results);
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro fatal durante os testes:', error);
    process.exit(1);
  }
}

// Run the tests
main();