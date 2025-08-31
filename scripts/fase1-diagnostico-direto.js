/**
 * FASE 1: Diagnóstico Direto da API do WordPress
 * Usando credenciais conhecidas para testar o endpoint crítico
 */

const https = require('https');

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: 'https://teste.sativar.com.br',
  testPhone: '85996201636', // Número normalizado sem máscara
  originalPhone: '(85) 99620-1636', // Formato original no banco
  patientName: 'HENRIQUE GUERRA',
  // Credenciais conhecidas (substitua pelas reais)
  credentials: [
    { username: 'sativar_app', password: 'Sativar2025!' },
    { username: 'admin', password: 'Sativar2025!' },
    { username: 'sativar', password: 'Sativar2025!' },
    { username: 'sativar_api', password: 'Sativar2025!' }
  ]
};

// Função para fazer requisições HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      ...options,
      timeout: 15000,
      headers: {
        'User-Agent': 'SATIZAP-Diagnostico/1.0',
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
            statusText: res.statusMessage,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Função para criar headers de autenticação
function createAuthHeaders(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`
  };
}

// Teste de autenticação
async function testAuth(username, password) {
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/wp/v2/users/me`;
    const headers = createAuthHeaders(username, password);
    
    const response = await makeRequest(url, { headers });
    
    if (response.status === 200) {
      console.log(`✅ Autenticação OK: ${username}`);
      console.log(`   Usuário: ${response.data?.name || 'N/A'}`);
      return { success: true, username, password };
    } else {
      console.log(`❌ Falha auth: ${username} (${response.status})`);
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ Erro auth: ${username} - ${error.message}`);
    return { success: false };
  }
}

// Teste crítico do endpoint de clientes
async function testClientEndpoint(credentials) {
  console.log('\n=== TESTE CRÍTICO: Endpoint de Clientes ===');
  
  const endpoints = [
    `/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`,
    `/wp-json/wp/v2/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`,
    `/wp-json/sativar/v1/clientes?telefone=${TEST_CONFIG.testPhone}`,
    `/wp-json/wp/v2/clientes?telefone=${TEST_CONFIG.testPhone}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
      const headers = createAuthHeaders(credentials.username, credentials.password);
      
      console.log(`\nTestando: ${endpoint}`);
      
      const response = await makeRequest(url, { headers });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log('✅ PACIENTE ENCONTRADO!');
          console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || response.data[0]?.name || 'N/A'}`);
          console.log(`   ID: ${response.data[0]?.id || 'N/A'}`);
          console.log(`   Telefone ACF: ${response.data[0]?.acf?.telefone || 'N/A'}`);
          
          return {
            success: true,
            endpoint,
            data: response.data[0],
            cause: 'found'
          };
        } else if (Array.isArray(response.data) && response.data.length === 0) {
          console.log('❌ Array vazio - endpoint funciona mas não encontra');
        } else {
          console.log(`❌ Resposta inesperada: ${typeof response.data}`);
        }
      } else if (response.status === 404) {
        console.log('❌ Endpoint não existe (404)');
      } else {
        console.log(`❌ Erro HTTP: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }
  
  return { success: false, cause: 'not_found' };
}

// Teste com variações de formato
async function testPhoneFormats(credentials) {
  console.log('\n=== TESTE: Variações de Formato ===');
  
  const phoneVariations = [
    TEST_CONFIG.testPhone,           // 85996201636
    TEST_CONFIG.originalPhone,       // (85) 99620-1636
    '85 99620-1636',                // 85 99620-1636
    '85-99620-1636',                // 85-99620-1636
    '85 99620 1636',                // 85 99620 1636
    '+5585996201636',               // +5585996201636
    '5585996201636'                 // 5585996201636
  ];
  
  const endpoint = '/wp-json/sativar/v1/clientes';
  
  for (const phone of phoneVariations) {
    try {
      const url = `${TEST_CONFIG.baseUrl}${endpoint}?acf_filters[telefone]=${encodeURIComponent(phone)}`;
      const headers = createAuthHeaders(credentials.username, credentials.password);
      
      console.log(`Testando: "${phone}"`);
      
      const response = await makeRequest(url, { headers });
      
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ ENCONTRADO com: "${phone}"`);
        console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || 'N/A'}`);
        console.log(`   Telefone no banco: ${response.data[0]?.acf?.telefone || 'N/A'}`);
        
        return {
          success: true,
          workingFormat: phone,
          storedFormat: response.data[0]?.acf?.telefone,
          data: response.data[0]
        };
      }
    } catch (error) {
      console.log(`❌ Erro com "${phone}": ${error.message}`);
    }
  }
  
  return { success: false };
}

// Função principal
async function runDiagnostic() {
  console.log('🔍 FASE 1: DIAGNÓSTICO DIRETO DA API DO WORDPRESS');
  console.log('=================================================');
  console.log(`Ambiente: ${TEST_CONFIG.baseUrl}`);
  console.log(`Telefone teste: ${TEST_CONFIG.testPhone} (original: ${TEST_CONFIG.originalPhone})`);
  console.log(`Paciente esperado: ${TEST_CONFIG.patientName}`);
  
  // Testar conectividade básica
  console.log('\n=== TESTE: Conectividade WordPress ===');
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/wp-json/`);
    if (response.status === 200) {
      console.log('✅ WordPress acessível');
      console.log(`   Namespaces: ${response.data?.namespaces?.join(', ') || 'N/A'}`);
      
      if (response.data?.namespaces?.includes('sativar/v1')) {
        console.log('✅ Namespace sativar/v1 disponível');
      } else {
        console.log('⚠️ Namespace sativar/v1 NÃO disponível');
      }
    } else {
      console.log(`❌ WordPress não acessível: ${response.status}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Erro de conectividade: ${error.message}`);
    return;
  }
  
  // Testar credenciais
  console.log('\n=== TESTE: Credenciais ===');
  let validCredentials = null;
  
  for (const cred of TEST_CONFIG.credentials) {
    const authResult = await testAuth(cred.username, cred.password);
    if (authResult.success) {
      validCredentials = authResult;
      break;
    }
  }
  
  if (!validCredentials) {
    console.log('\n❌ DIAGNÓSTICO INTERROMPIDO: Nenhuma credencial válida');
    console.log('   Verifique as credenciais no script ou configure novas');
    return;
  }
  
  // Teste crítico: endpoint de clientes
  const endpointResult = await testClientEndpoint(validCredentials);
  
  if (endpointResult.success) {
    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO: API funcionando corretamente');
    console.log(`   Endpoint correto: ${endpointResult.endpoint}`);
    console.log('   O problema pode estar na lógica do SatiZap');
    return;
  }
  
  // Testar variações de formato
  const formatResult = await testPhoneFormats(validCredentials);
  
  if (formatResult.success) {
    console.log('\n✅ CAUSA RAIZ IDENTIFICADA: Problema de formatação');
    console.log(`   Formato que funciona: "${formatResult.workingFormat}"`);
    console.log(`   Formato armazenado: "${formatResult.storedFormat}"`);
    console.log(`   Formato testado: "${TEST_CONFIG.testPhone}"`);
    console.log('\n🔧 SOLUÇÃO NECESSÁRIA:');
    console.log('   1. Implementar busca inteligente no WordPress');
    console.log('   2. Normalizar telefones durante a consulta SQL');
    console.log('   3. Usar REGEXP para comparar números limpos');
  } else {
    console.log('\n❌ CAUSA RAIZ: Paciente não encontrado com nenhum formato');
    console.log('   Possíveis causas:');
    console.log('   1. Paciente não existe no WordPress');
    console.log('   2. Campo telefone está em outro local');
    console.log('   3. Plugin não está funcionando corretamente');
  }
}

// Executar diagnóstico
if (require.main === module) {
  runDiagnostic().catch(error => {
    console.error('\n💥 ERRO FATAL:', error);
    process.exit(1);
  });
}

module.exports = { runDiagnostic };