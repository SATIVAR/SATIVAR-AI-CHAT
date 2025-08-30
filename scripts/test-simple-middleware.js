#!/usr/bin/env node

/**
 * Simple test to check if middleware is working at all
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
        'User-Agent': 'Simple-Middleware-Test/1.0',
        'X-Test-Middleware': 'true',
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testSimpleMiddleware() {
  console.log('🔍 Teste simples do middleware...\n');
  
  try {
    // Test a route that should definitely trigger middleware
    const response = await makeRequest('/test-middleware-route-that-does-not-exist');
    
    console.log('📊 Resposta para rota inexistente:');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   URL: ${response.url}`);
    
    // Check if it's a 404 from Next.js or if middleware intercepted
    if (response.statusCode === 404) {
      console.log('   ✅ Next.js retornou 404 (normal)');
    } else if (response.statusCode >= 300 && response.statusCode < 400) {
      console.log('   🔄 Redirecionamento detectado:');
      console.log(`      Location: ${response.headers.location}`);
      
      if (response.headers.location && response.headers.location.includes('/dev-error')) {
        console.log('   ✅ MIDDLEWARE ESTÁ FUNCIONANDO! (redirecionamento para dev-error)');
      }
    }
    
    // Check for any custom headers
    const customHeaders = Object.entries(response.headers)
      .filter(([key]) => key.toLowerCase().startsWith('x-') && key !== 'x-powered-by');
    
    if (customHeaders.length > 0) {
      console.log('   🔧 Headers customizados encontrados:');
      customHeaders.forEach(([key, value]) => {
        console.log(`      ${key}: ${value}`);
      });
      console.log('   ✅ MIDDLEWARE ESTÁ FUNCIONANDO! (headers customizados)');
    } else {
      console.log('   ❌ Nenhum header customizado encontrado');
    }
    
    // Check response body for middleware traces
    if (response.body.includes('middleware') || response.body.includes('Middleware')) {
      console.log('   ✅ MIDDLEWARE ESTÁ FUNCIONANDO! (conteúdo relacionado ao middleware)');
    }
    
    console.log('');
    
    // Test with a known route
    console.log('🔍 Testando rota conhecida /sativar...\n');
    
    const sativarResponse = await makeRequest('/sativar');
    console.log('📊 Resposta para /sativar:');
    console.log(`   Status: ${sativarResponse.statusCode}`);
    
    // Look for any signs of middleware processing
    const middlewareHeaders = Object.entries(sativarResponse.headers)
      .filter(([key]) => key.toLowerCase().includes('tenant') || 
                        key.toLowerCase().includes('dev') ||
                        key.toLowerCase().includes('middleware'));
    
    if (middlewareHeaders.length > 0) {
      console.log('   ✅ MIDDLEWARE ESTÁ FUNCIONANDO! Headers relacionados:');
      middlewareHeaders.forEach(([key, value]) => {
        console.log(`      ${key}: ${value}`);
      });
    } else {
      console.log('   ❌ Nenhum header relacionado ao middleware encontrado');
    }
    
    // Check if it redirects to dev-error
    if (sativarResponse.statusCode >= 300 && sativarResponse.statusCode < 400) {
      console.log(`   🔄 Redirecionamento para: ${sativarResponse.headers.location}`);
      if (sativarResponse.headers.location && sativarResponse.headers.location.includes('/dev-error')) {
        console.log('   ✅ MIDDLEWARE ESTÁ FUNCIONANDO! (redirecionamento para dev-error)');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Run the test
testSimpleMiddleware().catch(console.error);