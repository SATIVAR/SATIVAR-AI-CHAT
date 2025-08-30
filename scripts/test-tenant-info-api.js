#!/usr/bin/env node

/**
 * Test script to verify tenant-info API directly
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
        'User-Agent': 'Tenant-Info-API-Test/1.0',
        'Accept': 'application/json',
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

async function testTenantInfoAPI() {
  console.log('🔍 Testando API /api/tenant-info...\n');
  
  const testCases = [
    {
      name: 'Sem parâmetros',
      url: '/api/tenant-info',
      description: 'Deve falhar sem slug ou headers de tenant'
    },
    {
      name: 'Com slug sativar',
      url: '/api/tenant-info?slug=sativar',
      description: 'Deve funcionar com slug válido'
    },
    {
      name: 'Com slug inválido',
      url: '/api/tenant-info?slug=inexistente',
      description: 'Deve retornar 404 para slug inválido'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📍 ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Descrição: ${testCase.description}`);
    
    try {
      const response = await makeRequest(testCase.url);
      
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      
      // Parse JSON response if possible
      try {
        const jsonData = JSON.parse(response.body);
        console.log('   Resposta JSON:');
        console.log(`      ${JSON.stringify(jsonData, null, 6)}`);
        
        if (jsonData.association) {
          console.log('   ✅ Associação encontrada na resposta');
          console.log(`      Nome: ${jsonData.association.name}`);
          console.log(`      Subdomain: ${jsonData.association.subdomain}`);
          console.log(`      Ativa: ${jsonData.association.isActive}`);
        } else if (jsonData.error) {
          console.log(`   ❌ Erro na resposta: ${jsonData.error}`);
        }
        
      } catch (parseError) {
        console.log('   ❌ Resposta não é JSON válido');
        console.log(`   Conteúdo (primeiros 200 chars): ${response.body.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
    }
    
    console.log('');
  }
}

// Run the test
testTenantInfoAPI().catch(console.error);