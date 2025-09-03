#!/usr/bin/env node

/**
 * Teste direto do endpoint WordPress para ver dados ACF
 */

const https = require('https');

const TEST_PHONE = '85996201636';
const BASE_URL = 'https://teste.sativar.com.br';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      ...options,
      timeout: 15000,
      headers: {
        'User-Agent': 'SATIZAP-Test/1.0',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            data: jsonData,
            rawData: data
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testWordPressDirect() {
  console.log('🔍 TESTE DIRETO DO WORDPRESS');
  console.log('============================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Telefone: ${TEST_PHONE}`);
  console.log();

  // Testar diferentes endpoints e métodos de autenticação
  const testCases = [
    {
      name: 'Endpoint customizado sem auth',
      url: `${BASE_URL}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_PHONE}`,
      headers: {}
    },
    {
      name: 'Endpoint customizado com auth básica (teste)',
      url: `${BASE_URL}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_PHONE}`,
      headers: {
        'Authorization': 'Basic ' + Buffer.from('test:test').toString('base64')
      }
    },
    {
      name: 'Endpoint WP Users com meta',
      url: `${BASE_URL}/wp-json/wp/v2/users?meta_key=telefone&meta_value=${TEST_PHONE}`,
      headers: {}
    },
    {
      name: 'Endpoint WP Users search',
      url: `${BASE_URL}/wp-json/wp/v2/users?search=${TEST_PHONE}`,
      headers: {}
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔄 Testando: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const response = await makeRequest(testCase.url, { headers: testCase.headers });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        if (response.data) {
          console.log('   ✅ Dados recebidos:');
          
          if (Array.isArray(response.data)) {
            console.log(`   📊 Array com ${response.data.length} item(s)`);
            
            if (response.data.length > 0) {
              const firstItem = response.data[0];
              console.log('   📋 Primeiro item:');
              console.log(`      ID: ${firstItem.id || 'N/A'}`);
              console.log(`      Nome: ${firstItem.name || firstItem.display_name || 'N/A'}`);
              
              if (firstItem.acf) {
                console.log('   🎯 DADOS ACF ENCONTRADOS:');
                Object.keys(firstItem.acf).forEach(key => {
                  console.log(`      ${key}: ${firstItem.acf[key]}`);
                });
              } else {
                console.log('   ❌ Nenhum dado ACF encontrado');
              }
            }
          } else {
            console.log('   📋 Objeto único:');
            console.log(`      ID: ${response.data.id || 'N/A'}`);
            console.log(`      Nome: ${response.data.name || response.data.display_name || 'N/A'}`);
            
            if (response.data.acf) {
              console.log('   🎯 DADOS ACF ENCONTRADOS:');
              Object.keys(response.data.acf).forEach(key => {
                console.log(`      ${key}: ${response.data.acf[key]}`);
              });
            } else {
              console.log('   ❌ Nenhum dado ACF encontrado');
            }
          }
        } else {
          console.log('   ❌ Resposta vazia');
        }
      } else if (response.status === 401) {
        console.log('   🔒 Requer autenticação');
      } else if (response.status === 404) {
        console.log('   ❌ Endpoint não encontrado');
      } else {
        console.log(`   ❌ Erro: ${response.status}`);
        if (response.rawData) {
          console.log(`   Resposta: ${response.rawData.substring(0, 200)}...`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
    }
  }

  console.log('\n=== CONCLUSÃO ===');
  console.log('Se algum teste retornou dados ACF, o problema está na');
  console.log('sincronização do SatiZap. Se nenhum retornou dados ACF,');
  console.log('o problema está no WordPress ou nas credenciais.');
}

if (require.main === module) {
  testWordPressDirect().catch(console.error);
}

module.exports = { testWordPressDirect };