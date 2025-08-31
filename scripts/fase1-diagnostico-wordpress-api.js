/**
 * FASE 1: Diagnóstico Definitivo da Resposta da API do WordPress (A Causa Raiz)
 * 
 * Este script testa diretamente o endpoint do WordPress para confirmar seu comportamento
 * e identificar a causa raiz do problema na busca de pacientes.
 */

const https = require('https');
const http = require('http');

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: 'https://teste.sativar.com.br',
  testPhone: '85996201636', // Número normalizado sem máscara
  originalPhone: '(85) 99620-1636', // Formato original no banco
  patientName: 'HENRIQUE GUERRA',
  // Credenciais de teste (serão lidas do ambiente ou solicitadas)
  username: process.env.WP_USERNAME || 'sativar_app',
  password: process.env.WP_PASSWORD || null
};

// Função para fazer requisições HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
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

    const req = client.request(url, requestOptions, (res) => {
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

// Teste 1: Verificar conectividade básica do WordPress
async function testWordPressConnectivity() {
  console.log('\n=== TESTE 1: Conectividade Básica do WordPress ===');
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/`;
    console.log(`Testando: ${url}`);
    
    const response = await makeRequest(url);
    
    if (response.status === 200) {
      console.log('✅ WordPress está acessível');
      console.log(`   Versão: ${response.data?.name || 'N/A'}`);
      console.log(`   Namespaces disponíveis: ${response.data?.namespaces?.join(', ') || 'N/A'}`);
      return true;
    } else {
      console.log(`❌ WordPress não acessível - Status: ${response.status}`);
      console.log(`   Resposta: ${response.rawData}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro de conectividade: ${error.message}`);
    return false;
  }
}

// Teste 2: Verificar autenticação
async function testAuthentication() {
  console.log('\n=== TESTE 2: Verificação de Autenticação ===');
  
  if (!TEST_CONFIG.password) {
    console.log('❌ Senha não configurada. Configure WP_PASSWORD no ambiente ou edite o script.');
    return false;
  }
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/wp/v2/users/me`;
    const headers = createAuthHeaders(TEST_CONFIG.username, TEST_CONFIG.password);
    
    console.log(`Testando autenticação: ${TEST_CONFIG.username}`);
    console.log(`URL: ${url}`);
    
    const response = await makeRequest(url, { headers });
    
    if (response.status === 200) {
      console.log('✅ Autenticação bem-sucedida');
      console.log(`   Usuário: ${response.data?.name || 'N/A'}`);
      console.log(`   Roles: ${response.data?.roles?.join(', ') || 'N/A'}`);
      return true;
    } else {
      console.log(`❌ Falha na autenticação - Status: ${response.status}`);
      console.log(`   Resposta: ${response.rawData}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro na autenticação: ${error.message}`);
    return false;
  }
}

// Teste 3: Busca direta no endpoint de clientes (TESTE CRÍTICO)
async function testClientEndpointDirect() {
  console.log('\n=== TESTE 3: Endpoint de Clientes - Busca Direta (CRÍTICO) ===');
  
  if (!TEST_CONFIG.password) {
    console.log('❌ Senha não configurada. Pulando teste.');
    return false;
  }
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`;
    const headers = createAuthHeaders(TEST_CONFIG.username, TEST_CONFIG.password);
    
    console.log(`Testando endpoint crítico: ${url}`);
    console.log(`Buscando por telefone: ${TEST_CONFIG.testPhone}`);
    console.log(`Esperando encontrar: ${TEST_CONFIG.patientName}`);
    
    const response = await makeRequest(url, { headers });
    
    console.log(`Status da resposta: ${response.status}`);
    console.log(`Dados retornados:`, response.data);
    
    if (response.status === 200) {
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('✅ SUCESSO: Paciente encontrado!');
        console.log(`   Nome encontrado: ${response.data[0]?.acf?.nome_completo || response.data[0]?.name || 'N/A'}`);
        console.log(`   ID: ${response.data[0]?.id || 'N/A'}`);
        console.log(`   Telefone no ACF: ${response.data[0]?.acf?.telefone || 'N/A'}`);
        return { success: true, data: response.data[0] };
      } else if (Array.isArray(response.data) && response.data.length === 0) {
        console.log('❌ PROBLEMA IDENTIFICADO: Array vazio retornado');
        console.log('   Isso confirma que o endpoint está funcionando, mas não encontra o paciente');
        console.log('   CAUSA RAIZ: Problema na lógica de busca inteligente do WordPress');
        return { success: false, cause: 'empty_array' };
      } else {
        console.log('❌ PROBLEMA: Resposta inesperada');
        console.log(`   Tipo de resposta: ${typeof response.data}`);
        console.log(`   Conteúdo: ${JSON.stringify(response.data)}`);
        return { success: false, cause: 'unexpected_response' };
      }
    } else if (response.status === 404) {
      console.log('❌ PROBLEMA IDENTIFICADO: Endpoint não encontrado (404)');
      console.log('   CAUSA RAIZ: Endpoint /wp-json/sativar/v1/clientes não existe ou não está ativo');
      return { success: false, cause: 'endpoint_not_found' };
    } else {
      console.log(`❌ PROBLEMA: Status HTTP ${response.status}`);
      console.log(`   Resposta: ${response.rawData}`);
      return { success: false, cause: 'http_error', status: response.status };
    }
  } catch (error) {
    console.log(`❌ ERRO na requisição: ${error.message}`);
    return { success: false, cause: 'request_error', error: error.message };
  }
}

// Teste 4: Busca com variações de formato
async function testPhoneVariations() {
  console.log('\n=== TESTE 4: Busca com Variações de Formato ===');
  
  if (!TEST_CONFIG.password) {
    console.log('❌ Senha não configurada. Pulando teste.');
    return false;
  }
  
  const phoneVariations = [
    TEST_CONFIG.testPhone,           // 85996201636
    TEST_CONFIG.originalPhone,       // (85) 99620-1636
    '85 99620-1636',                // 85 99620-1636
    '85-99620-1636',                // 85-99620-1636
    '85 99620 1636'                 // 85 99620 1636
  ];
  
  console.log('Testando múltiplas variações de formato do telefone...');
  
  for (const phone of phoneVariations) {
    try {
      const url = `${TEST_CONFIG.baseUrl}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${encodeURIComponent(phone)}`;
      const headers = createAuthHeaders(TEST_CONFIG.username, TEST_CONFIG.password);
      
      console.log(`\nTestando: "${phone}"`);
      console.log(`URL: ${url}`);
      
      const response = await makeRequest(url, { headers });
      
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ ENCONTRADO com formato: "${phone}"`);
        console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || response.data[0]?.name || 'N/A'}`);
        return { success: true, workingFormat: phone, data: response.data[0] };
      } else {
        console.log(`❌ Não encontrado com formato: "${phone}"`);
      }
    } catch (error) {
      console.log(`❌ Erro com formato "${phone}": ${error.message}`);
    }
  }
  
  console.log('\n❌ Nenhuma variação de formato funcionou');
  return { success: false };
}

// Teste 5: Verificar endpoint alternativo (wp/v2/clientes)
async function testAlternativeEndpoint() {
  console.log('\n=== TESTE 5: Endpoint Alternativo (wp/v2/clientes) ===');
  
  if (!TEST_CONFIG.password) {
    console.log('❌ Senha não configurada. Pulando teste.');
    return false;
  }
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/wp/v2/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`;
    const headers = createAuthHeaders(TEST_CONFIG.username, TEST_CONFIG.password);
    
    console.log(`Testando endpoint alternativo: ${url}`);
    
    const response = await makeRequest(url, { headers });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('✅ Paciente encontrado no endpoint alternativo!');
        console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || response.data[0]?.title?.rendered || 'N/A'}`);
        return { success: true, data: response.data[0] };
      } else {
        console.log('❌ Endpoint alternativo também retorna array vazio');
      }
    } else {
      console.log(`❌ Endpoint alternativo falhou: ${response.status}`);
    }
    
    return { success: false };
  } catch (error) {
    console.log(`❌ Erro no endpoint alternativo: ${error.message}`);
    return { success: false };
  }
}

// Função principal de diagnóstico
async function runDiagnostic() {
  console.log('🔍 FASE 1: DIAGNÓSTICO DEFINITIVO DA API DO WORDPRESS');
  console.log('====================================================');
  console.log(`Ambiente de teste: ${TEST_CONFIG.baseUrl}`);
  console.log(`Telefone de teste: ${TEST_CONFIG.testPhone} (original: ${TEST_CONFIG.originalPhone})`);
  console.log(`Paciente esperado: ${TEST_CONFIG.patientName}`);
  
  // Executar testes sequencialmente
  const connectivityOk = await testWordPressConnectivity();
  if (!connectivityOk) {
    console.log('\n❌ DIAGNÓSTICO INTERROMPIDO: WordPress não está acessível');
    return;
  }
  
  const authOk = await testAuthentication();
  if (!authOk) {
    console.log('\n❌ DIAGNÓSTICO INTERROMPIDO: Falha na autenticação');
    return;
  }
  
  // Teste crítico: endpoint de clientes
  const endpointResult = await testClientEndpointDirect();
  
  if (endpointResult.success) {
    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO: API do WordPress está funcionando corretamente');
    console.log('   O problema está na interpretação da resposta pelo SatiZap');
    return;
  }
  
  // Se o teste crítico falhou, tentar variações
  console.log('\n🔄 Testando variações de formato...');
  const variationResult = await testPhoneVariations();
  
  if (variationResult.success) {
    console.log(`\n✅ CAUSA RAIZ IDENTIFICADA: Problema de formatação`);
    console.log(`   Formato que funciona: "${variationResult.workingFormat}"`);
    console.log(`   Formato que não funciona: "${TEST_CONFIG.testPhone}"`);
    console.log('   SOLUÇÃO: Implementar busca inteligente no WordPress');
    return;
  }
  
  // Testar endpoint alternativo
  const altResult = await testAlternativeEndpoint();
  
  if (altResult.success) {
    console.log('\n✅ CAUSA RAIZ IDENTIFICADA: Endpoint incorreto');
    console.log('   O endpoint correto é wp/v2/clientes, não sativar/v1/clientes');
    console.log('   SOLUÇÃO: Corrigir URL do endpoint no SatiZap');
    return;
  }
  
  // Diagnóstico final
  console.log('\n=== DIAGNÓSTICO FINAL ===');
  
  if (endpointResult.cause === 'endpoint_not_found') {
    console.log('❌ CAUSA RAIZ: Endpoint /wp-json/sativar/v1/clientes não existe');
    console.log('   SOLUÇÃO: Verificar se o plugin WordPress está ativo e configurado');
  } else if (endpointResult.cause === 'empty_array') {
    console.log('❌ CAUSA RAIZ: Lógica de busca inteligente não implementada no WordPress');
    console.log('   SOLUÇÃO: Implementar normalização de telefone no plugin WordPress');
  } else {
    console.log('❌ CAUSA RAIZ: Problema não identificado automaticamente');
    console.log('   AÇÃO: Verificar logs do WordPress e configuração do plugin');
  }
}

// Executar diagnóstico
if (require.main === module) {
  runDiagnostic().catch(error => {
    console.error('\n💥 ERRO FATAL no diagnóstico:', error);
    process.exit(1);
  });
}

module.exports = {
  runDiagnostic,
  testWordPressConnectivity,
  testAuthentication,
  testClientEndpointDirect,
  testPhoneVariations,
  testAlternativeEndpoint
};