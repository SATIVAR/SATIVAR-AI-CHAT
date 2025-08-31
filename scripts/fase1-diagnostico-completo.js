/**
 * FASE 1: Diagnóstico Definitivo da Resposta da API do WordPress (A Causa Raiz)
 * Versão completa com busca automática de credenciais
 */

const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: 'https://teste.sativar.com.br',
  testPhone: '85996201636', // Número normalizado sem máscara
  originalPhone: '(85) 99620-1636', // Formato original no banco
  patientName: 'HENRIQUE GUERRA',
  associationSubdomain: 'sativar'
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

// Função para buscar credenciais do banco
async function getCredentials() {
  const prisma = new PrismaClient();
  
  try {
    console.log(`🔍 Buscando credenciais da associação: ${TEST_CONFIG.associationSubdomain}`);
    
    const association = await prisma.association.findFirst({
      where: {
        subdomain: TEST_CONFIG.associationSubdomain
      }
    });
    
    if (!association) {
      throw new Error(`Associação "${TEST_CONFIG.associationSubdomain}" não encontrada`);
    }
    
    console.log(`✅ Associação encontrada: ${association.name}`);
    
    // Tentar wordpressAuth primeiro
    if (association.wordpressAuth) {
      const auth = typeof association.wordpressAuth === 'string' 
        ? JSON.parse(association.wordpressAuth) 
        : association.wordpressAuth;
      
      if (auth.username && auth.password) {
        console.log('✅ Usando credenciais wordpressAuth');
        return {
          username: auth.username,
          password: auth.password
        };
      }
    }
    
    // Tentar apiConfig
    if (association.apiConfig) {
      try {
        const { decryptApiConfig } = require('../src/lib/crypto');
        const apiConfig = await decryptApiConfig(association.apiConfig);
        
        if (apiConfig.credentials?.applicationPassword) {
          console.log('✅ Usando credenciais apiConfig (Application Password)');
          return {
            username: apiConfig.credentials.applicationPassword.username,
            password: apiConfig.credentials.applicationPassword.password
          };
        }
      } catch (decryptError) {
        console.log('⚠️ Erro ao descriptografar apiConfig, tentando wordpressAuth...');
      }
    }
    
    throw new Error('Nenhuma credencial válida encontrada');
    
  } finally {
    await prisma.$disconnect();
  }
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
      
      // Verificar se o namespace sativar/v1 está disponível
      if (response.data?.namespaces?.includes('sativar/v1')) {
        console.log('✅ Namespace sativar/v1 está disponível');
      } else {
        console.log('⚠️ Namespace sativar/v1 NÃO está disponível');
      }
      
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
async function testAuthentication(credentials) {
  console.log('\n=== TESTE 2: Verificação de Autenticação ===');
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/wp/v2/users/me`;
    const headers = createAuthHeaders(credentials.username, credentials.password);
    
    console.log(`Testando autenticação: ${credentials.username}`);
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
async function testClientEndpointDirect(credentials) {
  console.log('\n=== TESTE 3: Endpoint de Clientes - Busca Direta (CRÍTICO) ===');
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`;
    const headers = createAuthHeaders(credentials.username, credentials.password);
    
    console.log(`Testando endpoint crítico: ${url}`);
    console.log(`Buscando por telefone: ${TEST_CONFIG.testPhone}`);
    console.log(`Esperando encontrar: ${TEST_CONFIG.patientName}`);
    
    const response = await makeRequest(url, { headers });
    
    console.log(`Status da resposta: ${response.status}`);
    console.log(`Dados retornados:`, JSON.stringify(response.data, null, 2));
    
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
async function testPhoneVariations(credentials) {
  console.log('\n=== TESTE 4: Busca com Variações de Formato ===');
  
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
      const headers = createAuthHeaders(credentials.username, credentials.password);
      
      console.log(`\nTestando: "${phone}"`);
      console.log(`URL: ${url}`);
      
      const response = await makeRequest(url, { headers });
      
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ ENCONTRADO com formato: "${phone}"`);
        console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || response.data[0]?.name || 'N/A'}`);
        console.log(`   Telefone no banco: ${response.data[0]?.acf?.telefone || 'N/A'}`);
        return { success: true, workingFormat: phone, data: response.data[0] };
      } else {
        console.log(`❌ Não encontrado com formato: "${phone}" (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Erro com formato "${phone}": ${error.message}`);
    }
  }
  
  console.log('\n❌ Nenhuma variação de formato funcionou');
  return { success: false };
}

// Teste 5: Verificar endpoint alternativo (wp/v2/clientes)
async function testAlternativeEndpoint(credentials) {
  console.log('\n=== TESTE 5: Endpoint Alternativo (wp/v2/clientes) ===');
  
  try {
    const url = `${TEST_CONFIG.baseUrl}/wp-json/wp/v2/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`;
    const headers = createAuthHeaders(credentials.username, credentials.password);
    
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
  
  // Buscar credenciais
  let credentials;
  try {
    credentials = await getCredentials();
  } catch (error) {
    console.log(`\n❌ DIAGNÓSTICO INTERROMPIDO: ${error.message}`);
    return;
  }
  
  // Executar testes sequencialmente
  const connectivityOk = await testWordPressConnectivity();
  if (!connectivityOk) {
    console.log('\n❌ DIAGNÓSTICO INTERROMPIDO: WordPress não está acessível');
    return;
  }
  
  const authOk = await testAuthentication(credentials);
  if (!authOk) {
    console.log('\n❌ DIAGNÓSTICO INTERROMPIDO: Falha na autenticação');
    return;
  }
  
  // Teste crítico: endpoint de clientes
  const endpointResult = await testClientEndpointDirect(credentials);
  
  if (endpointResult.success) {
    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO: API do WordPress está funcionando corretamente');
    console.log('   O problema está na interpretação da resposta pelo SatiZap');
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar lógica de processamento da resposta no SatiZap');
    console.log('   2. Implementar Fase 2: Refatoração da Lógica de Decisão');
    console.log('   3. Implementar Fase 3: Interface de Confirmação do Paciente');
    return;
  }
  
  // Se o teste crítico falhou, tentar variações
  console.log('\n🔄 Testando variações de formato...');
  const variationResult = await testPhoneVariations(credentials);
  
  if (variationResult.success) {
    console.log(`\n✅ CAUSA RAIZ IDENTIFICADA: Problema de formatação`);
    console.log(`   Formato que funciona: "${variationResult.workingFormat}"`);
    console.log(`   Formato que não funciona: "${TEST_CONFIG.testPhone}"`);
    console.log(`   Telefone no banco: "${variationResult.data?.acf?.telefone}"`);
    console.log('\n🔧 SOLUÇÃO NECESSÁRIA:');
    console.log('   1. Implementar busca inteligente no plugin WordPress');
    console.log('   2. Normalizar dados de telefone durante a consulta SQL');
    console.log('   3. Usar REGEXP ou REPLACE para comparar números limpos');
    return;
  }
  
  // Testar endpoint alternativo
  const altResult = await testAlternativeEndpoint(credentials);
  
  if (altResult.success) {
    console.log('\n✅ CAUSA RAIZ IDENTIFICADA: Endpoint incorreto');
    console.log('   O endpoint correto é wp/v2/clientes, não sativar/v1/clientes');
    console.log('\n🔧 SOLUÇÃO NECESSÁRIA:');
    console.log('   1. Corrigir URL do endpoint no SatiZap');
    console.log('   2. Atualizar WordPressApiService para usar endpoint correto');
    return;
  }
  
  // Diagnóstico final
  console.log('\n=== DIAGNÓSTICO FINAL ===');
  
  if (endpointResult.cause === 'endpoint_not_found') {
    console.log('❌ CAUSA RAIZ: Endpoint /wp-json/sativar/v1/clientes não existe');
    console.log('\n🔧 SOLUÇÕES POSSÍVEIS:');
    console.log('   1. Verificar se o plugin WordPress está ativo');
    console.log('   2. Verificar se o endpoint está registrado corretamente');
    console.log('   3. Verificar logs do WordPress para erros do plugin');
  } else if (endpointResult.cause === 'empty_array') {
    console.log('❌ CAUSA RAIZ: Lógica de busca inteligente não implementada no WordPress');
    console.log('\n🔧 SOLUÇÕES NECESSÁRIAS:');
    console.log('   1. Implementar normalização de telefone no plugin WordPress');
    console.log('   2. Modificar consulta SQL para usar REGEXP ou REPLACE');
    console.log('   3. Criar função PHP para limpar e comparar telefones');
  } else {
    console.log('❌ CAUSA RAIZ: Problema não identificado automaticamente');
    console.log('\n🔧 AÇÕES RECOMENDADAS:');
    console.log('   1. Verificar logs do WordPress');
    console.log('   2. Verificar configuração do plugin');
    console.log('   3. Testar endpoint manualmente via Postman/Insomnia');
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
  getCredentials,
  testWordPressConnectivity,
  testAuthentication,
  testClientEndpointDirect,
  testPhoneVariations,
  testAlternativeEndpoint
};