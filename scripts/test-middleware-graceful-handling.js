#!/usr/bin/env node

/**
 * Test script to verify middleware graceful error handling
 * This script simulates requests to test the middleware behavior
 */

const http = require('http');
const { URL } = require('url');

// Test configuration
const BASE_URL = 'http://localhost:9002';
const TEST_CASES = [
  {
    name: 'Root Route (Hero Section)',
    url: '/',
    expectedBehavior: 'Should load without tenant validation',
    shouldHaveTenant: false
  },
  {
    name: 'Valid Tenant Route',
    url: '/sativar',
    expectedBehavior: 'Should load with tenant context',
    shouldHaveTenant: true
  },
  {
    name: 'Invalid Tenant Route',
    url: '/nonexistent',
    expectedBehavior: 'Should gracefully handle missing tenant in development',
    shouldHaveTenant: false
  },
  {
    name: 'Admin Route',
    url: '/admin',
    expectedBehavior: 'Should load without tenant validation',
    shouldHaveTenant: false
  },
  {
    name: 'Association Not Found Page',
    url: '/association-not-found',
    expectedBehavior: 'Should load error page without tenant validation',
    shouldHaveTenant: false
  }
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url, BASE_URL);
    
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Middleware-Test-Script/1.0'
      }
    };

    const req = http.request(options, (res) => {
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando comportamento gracioso do middleware...\n');
  
  // Check if server is running
  try {
    await makeRequest('/');
    console.log('✅ Servidor detectado em http://localhost:9002\n');
  } catch (error) {
    console.error('❌ Erro: Servidor não está rodando em http://localhost:9002');
    console.error('💡 Execute "npm run dev" em outro terminal primeiro\n');
    process.exit(1);
  }

  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`🔍 Testando: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Comportamento esperado: ${testCase.expectedBehavior}`);
    
    try {
      const response = await makeRequest(testCase.url);
      
      // Analyze response
      const hasTenantHeaders = !!(
        response.headers['x-tenant-id'] || 
        response.headers['x-tenant-subdomain'] || 
        response.headers['x-tenant-name']
      );
      
      const hasDevHeaders = !!(
        response.headers['x-dev-tenant-missing'] ||
        response.headers['x-dev-requested-tenant'] ||
        response.headers['x-dev-fallback-mode'] ||
        response.headers['x-dev-middleware-error']
      );

      const result = {
        testCase: testCase.name,
        url: testCase.url,
        statusCode: response.statusCode,
        hasTenantHeaders,
        hasDevHeaders,
        success: response.statusCode < 400,
        gracefulHandling: response.statusCode < 500, // No server errors
        headers: {
          tenant: {
            'x-tenant-id': response.headers['x-tenant-id'],
            'x-tenant-subdomain': response.headers['x-tenant-subdomain'],
            'x-tenant-name': response.headers['x-tenant-name']
          },
          dev: {
            'x-dev-tenant-missing': response.headers['x-dev-tenant-missing'],
            'x-dev-requested-tenant': response.headers['x-dev-requested-tenant'],
            'x-dev-fallback-mode': response.headers['x-dev-fallback-mode'],
            'x-dev-middleware-error': response.headers['x-dev-middleware-error']
          }
        }
      };

      results.push(result);

      // Display results
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Tenant Headers: ${hasTenantHeaders ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Dev Headers: ${hasDevHeaders ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Tratamento Gracioso: ${result.gracefulHandling ? '✅ Sim' : '❌ Não'}`);
      
      if (hasTenantHeaders) {
        console.log(`   Tenant ID: ${response.headers['x-tenant-id'] || 'N/A'}`);
        console.log(`   Tenant Subdomain: ${response.headers['x-tenant-subdomain'] || 'N/A'}`);
      }
      
      if (hasDevHeaders) {
        console.log(`   Dev Fallback Mode: ${response.headers['x-dev-fallback-mode'] || 'N/A'}`);
        console.log(`   Dev Requested Tenant: ${response.headers['x-dev-requested-tenant'] || 'N/A'}`);
      }

      console.log('   ✅ Teste concluído\n');
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}\n`);
      results.push({
        testCase: testCase.name,
        url: testCase.url,
        error: error.message,
        success: false,
        gracefulHandling: false
      });
    }
  }

  // Summary
  console.log('📊 RESUMO DOS TESTES\n');
  console.log('═'.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const graceful = results.filter(r => r.gracefulHandling).length;
  
  console.log(`Total de testes: ${results.length}`);
  console.log(`Sucessos: ${successful}/${results.length}`);
  console.log(`Tratamento gracioso: ${graceful}/${results.length}`);
  console.log('');

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const graceful = result.gracefulHandling ? '🛡️' : '💥';
    console.log(`${status} ${graceful} ${result.testCase} (${result.url})`);
    
    if (result.error) {
      console.log(`    Erro: ${result.error}`);
    } else {
      console.log(`    Status: ${result.statusCode}`);
      if (result.hasTenantHeaders) {
        console.log(`    Tenant: ${result.headers.tenant['x-tenant-subdomain']}`);
      }
      if (result.hasDevHeaders) {
        console.log(`    Dev Mode: ${result.headers.dev['x-dev-fallback-mode']}`);
      }
    }
    console.log('');
  });

  // Validation
  const allGraceful = results.every(r => r.gracefulHandling);
  
  if (allGraceful) {
    console.log('🎉 SUCESSO: Todos os testes passaram com tratamento gracioso!');
    console.log('✅ O middleware está funcionando corretamente em desenvolvimento');
  } else {
    console.log('⚠️  ATENÇÃO: Alguns testes falharam ou não tiveram tratamento gracioso');
    console.log('💡 Verifique os logs do middleware para mais detalhes');
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Erro fatal nos testes:', error);
  process.exit(1);
});