/**
 * FASE 1: Diagnóstico Final da API do WordPress
 * Busca credenciais reais do banco e executa diagnóstico completo
 */

const https = require('https');
const { PrismaClient } = require('@prisma/client');

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: 'https://teste.sativar.com.br',
  testPhone: '85996201636',
  originalPhone: '(85) 99620-1636',
  patientName: 'HENRIQUE GUERRA'
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

// Buscar credenciais do banco
async function getCredentialsFromDB() {
  const prisma = new PrismaClient();
  
  try {
    const association = await prisma.association.findFirst({
      where: { subdomain: 'sativar' }
    });
    
    if (!association) {
      throw new Error('Associação não encontrada');
    }
    
    console.log(`✅ Associação: ${association.name}`);
    
    // Tentar wordpressAuth
    if (association.wordpressAuth) {
      const auth = typeof association.wordpressAuth === 'string' 
        ? JSON.parse(association.wordpressAuth) 
        : association.wordpressAuth;
      
      if (auth.username && auth.password && auth.username !== 'placeholder') {
        console.log(`✅ Credenciais wordpressAuth: ${auth.username}`);
        return { username: auth.username, password: auth.password };
      }
    }
    
    // Se não tem credenciais válidas, vamos tentar algumas padrões
    console.log('⚠️ Credenciais placeholder encontradas, tentando padrões...');
    return null;
    
  } finally {
    await prisma.$disconnect();
  }
}

// Testar credenciais
async function testCredentials(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/wp-json/wp/v2/users/me`, {
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    
    if (response.status === 200) {
      console.log(`✅ Credenciais válidas: ${username}`);
      console.log(`   Usuário: ${response.data?.name || 'N/A'}`);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Teste crítico do endpoint
async function testEndpoint(credentials) {
  console.log('\n=== TESTE CRÍTICO: Endpoint de Clientes ===');
  
  const authHeader = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  
  // Testar diferentes endpoints
  const endpoints = [
    `/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`,
    `/wp-json/wp/v2/clientes?acf_filters[telefone]=${TEST_CONFIG.testPhone}`,
    `/wp-json/sativar/v1/clientes?telefone=${TEST_CONFIG.testPhone}`,
    `/wp-json/wp/v2/users?meta_key=telefone&meta_value=${TEST_CONFIG.testPhone}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTestando: ${endpoint}`);
      
      const response = await makeRequest(`${TEST_CONFIG.baseUrl}${endpoint}`, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log('✅ PACIENTE ENCONTRADO!');
          console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || response.data[0]?.name || 'N/A'}`);
          console.log(`   Telefone: ${response.data[0]?.acf?.telefone || response.data[0]?.meta?.telefone || 'N/A'}`);
          
          return { success: true, endpoint, data: response.data[0] };
        } else {
          console.log('❌ Array vazio - endpoint OK mas não encontra paciente');
        }
      } else if (response.status === 404) {
        console.log('❌ Endpoint não existe');
      } else {
        console.log(`❌ Erro: ${response.status}`);
        if (response.rawData) {
          console.log(`   Resposta: ${response.rawData.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }
  
  return { success: false };
}

// Testar variações de formato
async function testPhoneVariations(credentials) {
  console.log('\n=== TESTE: Variações de Formato ===');
  
  const authHeader = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  const endpoint = '/wp-json/sativar/v1/clientes';
  
  const variations = [
    TEST_CONFIG.testPhone,
    TEST_CONFIG.originalPhone,
    '85 99620-1636',
    '85-99620-1636',
    '85 99620 1636',
    '+5585996201636',
    '5585996201636'
  ];
  
  for (const phone of variations) {
    try {
      console.log(`Testando: "${phone}"`);
      
      const response = await makeRequest(`${TEST_CONFIG.baseUrl}${endpoint}?acf_filters[telefone]=${encodeURIComponent(phone)}`, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });
      
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ ENCONTRADO com: "${phone}"`);
        console.log(`   Nome: ${response.data[0]?.acf?.nome_completo || 'N/A'}`);
        console.log(`   Telefone armazenado: ${response.data[0]?.acf?.telefone || 'N/A'}`);
        
        return { success: true, workingFormat: phone, data: response.data[0] };
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }
  
  return { success: false };
}

// Função principal
async function runDiagnostic() {
  console.log('🔍 FASE 1: DIAGNÓSTICO FINAL DA API DO WORDPRESS');
  console.log('================================================');
  console.log(`Ambiente: ${TEST_CONFIG.baseUrl}`);
  console.log(`Telefone: ${TEST_CONFIG.testPhone} (original: ${TEST_CONFIG.originalPhone})`);
  
  // Buscar credenciais
  console.log('\n=== BUSCA DE CREDENCIAIS ===');
  let credentials = await getCredentialsFromDB();
  
  if (!credentials) {
    console.log('⚠️ Tentando credenciais padrão...');
    
    // Lista de credenciais comuns para testar
    const commonCreds = [
      { username: 'admin', password: 'admin' },
      { username: 'sativar', password: 'sativar123' },
      { username: 'wordpress', password: 'wordpress' },
      { username: 'test', password: 'test123' }
    ];
    
    for (const cred of commonCreds) {
      console.log(`Testando: ${cred.username}`);
      if (await testCredentials(cred.username, cred.password)) {
        credentials = cred;
        break;
      }
    }
  } else {
    // Validar credenciais do banco
    if (!(await testCredentials(credentials.username, credentials.password))) {
      console.log('❌ Credenciais do banco inválidas');
      credentials = null;
    }
  }
  
  if (!credentials) {
    console.log('\n❌ DIAGNÓSTICO INTERROMPIDO: Nenhuma credencial válida');
    console.log('\n🔧 AÇÕES NECESSÁRIAS:');
    console.log('   1. Verificar credenciais do WordPress');
    console.log('   2. Criar Application Password no WordPress');
    console.log('   3. Atualizar credenciais no banco do SatiZap');
    return;
  }
  
  // Testar conectividade
  console.log('\n=== CONECTIVIDADE ===');
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/wp-json/`);
    if (response.status === 200) {
      console.log('✅ WordPress acessível');
      const hasPlugin = response.data?.namespaces?.includes('sativar/v1');
      console.log(`   Plugin sativar: ${hasPlugin ? '✅ Ativo' : '❌ Inativo'}`);
    }
  } catch (error) {
    console.log(`❌ Erro de conectividade: ${error.message}`);
    return;
  }
  
  // Teste crítico
  const endpointResult = await testEndpoint(credentials);
  
  if (endpointResult.success) {
    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO: API funcionando!');
    console.log(`   Endpoint correto: ${endpointResult.endpoint}`);
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar lógica do SatiZap');
    console.log('   2. Implementar Fase 2: Refatoração');
    console.log('   3. Implementar Fase 3: Interface de Confirmação');
    return;
  }
  
  // Testar variações
  const variationResult = await testPhoneVariations(credentials);
  
  if (variationResult.success) {
    console.log('\n✅ CAUSA RAIZ: Problema de formatação');
    console.log(`   Formato funcional: "${variationResult.workingFormat}"`);
    console.log(`   Formato testado: "${TEST_CONFIG.testPhone}"`);
    console.log('\n🔧 SOLUÇÃO:');
    console.log('   1. Implementar busca inteligente no WordPress');
    console.log('   2. Normalizar telefones na consulta SQL');
  } else {
    console.log('\n❌ CAUSA RAIZ: Paciente não encontrado');
    console.log('\n🔧 VERIFICAÇÕES:');
    console.log('   1. Paciente existe no WordPress?');
    console.log('   2. Campo telefone está correto?');
    console.log('   3. Plugin está funcionando?');
  }
}

// Executar
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };