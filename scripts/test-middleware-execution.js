#!/usr/bin/env node

/**
 * Test script to verify if middleware is being executed
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
        'User-Agent': 'Middleware-Execution-Test/1.0',
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

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testMiddlewareExecution() {
  console.log('🔍 Testando execução do middleware...\n');
  
  const testRoutes = [
    { path: '/', description: 'Rota raiz (Hero Section)' },
    { path: '/sativar', description: 'Rota do tenant sativar' },
    { path: '/nonexistent', description: 'Tenant inexistente' },
    { path: '/admin', description: 'Rota administrativa' }
  ];
  
  for (const route of testRoutes) {
    console.log(`📍 Testando: ${route.description}`);
    console.log(`   URL: ${route.path}`);
    
    try {
      const response = await makeRequest(route.path);
      
      console.log(`   Status: ${response.statusCode}`);
      
      // Check for middleware headers
      const middlewareHeaders = Object.entries(response.headers)
        .filter(([key]) => key.toLowerCase().startsWith('x-'));
      
      if (middlewareHeaders.length > 0) {
        console.log('   🔧 Headers do middleware encontrados:');
        middlewareHeaders.forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      } else {
        console.log('   ❌ Nenhum header do middleware encontrado');
      }
      
      // Check for redirects
      if (response.statusCode >= 300 && response.statusCode < 400) {
        console.log(`   🔄 Redirecionamento para: ${response.headers.location}`);
        
        // If it's a redirect to dev-error, the middleware is working
        if (response.headers.location && response.headers.location.includes('/dev-error')) {
          console.log('   ✅ Middleware está funcionando (redirecionamento para dev-error)');
        }
      }
      
      // Check for dev-error page content
      if (response.body.includes('Erro de Desenvolvimento') || response.body.includes('tenant-not-found')) {
        console.log('   ✅ Middleware está funcionando (página de erro de desenvolvimento)');
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      console.log('');
    }
  }
  
  // Test with specific middleware debug headers
  console.log('🔍 Testando com headers específicos para debug...\n');
  
  try {
    const response = await makeRequest('/sativar', {
      headers: {
        'X-Debug-Middleware': 'true',
        'X-Force-Debug': 'true'
      }
    });
    
    console.log('📍 Teste com headers de debug:');
    console.log(`   Status: ${response.statusCode}`);
    
    const allHeaders = Object.entries(response.headers);
    console.log('   📋 Todos os headers da resposta:');
    allHeaders.forEach(([key, value]) => {
      console.log(`      ${key}: ${value}`);
    });
    
  } catch (error) {
    console.log(`   ❌ Erro no teste com headers: ${error.message}`);
  }
}

// Run the test
testMiddlewareExecution().catch(console.error);