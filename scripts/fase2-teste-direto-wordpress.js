#!/usr/bin/env node

/**
 * FASE 2: Teste Direto do Endpoint WordPress
 * 
 * Este script testa diretamente o endpoint do WordPress para confirmar
 * se o problema está na busca de clientes ou na comunicação.
 */

const fetch = require('node-fetch');

// Configurações - AJUSTE CONFORME NECESSÁRIO
const WORDPRESS_BASE_URL = 'https://teste.sativar.com.br';
const TEST_WHATSAPP = '85996201636';

// Credenciais - você precisará configurar estas
const WORDPRESS_USERNAME = 'seu_usuario'; // SUBSTITUA
const WORDPRESS_PASSWORD = 'sua_senha_de_aplicacao'; // SUBSTITUA

async function testWordPressDirectly() {
  console.log('='.repeat(80));
  console.log('FASE 2: TESTE DIRETO DO ENDPOINT WORDPRESS');
  console.log('='.repeat(80));
  console.log();
  
  console.log('📋 Configuração:');
  console.log(`   • WordPress URL: ${WORDPRESS_BASE_URL}`);
  console.log(`   • Telefone de Teste: ${TEST_WHATSAPP}`);
  console.log(`   • Username: ${WORDPRESS_USERNAME}`);
  console.log();
  
  // Preparar autenticação
  const credentials = Buffer.from(`${WORDPRESS_USERNAME}:${WORDPRESS_PASSWORD}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'User-Agent': 'SATIZAP-Direct-Test/1.0'
  };
  
  // Lista de endpoints para testar
  const endpointsToTest = [
    {
      name: 'Endpoint ACF Clientes (wp/v2)',
      url: `${WORDPRESS_BASE_URL}/wp-json/wp/v2/clientes?acf_filters[telefone]=${TEST_WHATSAPP}`
    },
    {
      name: 'Endpoint Sativar Custom (sativar/v1)',
      url: `${WORDPRESS_BASE_URL}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_WHATSAPP}`
    },
    {
      name: 'Smart Search Endpoint',
      url: `${WORDPRESS_BASE_URL}/wp-json/sativar/v1/clientes/smart-search?telefone=${TEST_WHATSAPP}`
    },
    {
      name: 'Teste com Formato Original',
      url: `${WORDPRESS_BASE_URL}/wp-json/wp/v2/clientes?acf_filters[telefone]=(85) 99620-1636`
    }
  ];
  
  for (const endpoint of endpointsToTest) {
    console.log(`🔄 Testando: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: headers,
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   Resposta:`, JSON.stringify(data, null, 2));
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('   ✅ SUCESSO: Dados encontrados!');
          console.log(`   📋 Primeiro resultado: ${data[0].name || data[0].title?.rendered || 'Nome não encontrado'}`);
        } else if (data && data.id) {
          console.log('   ✅ SUCESSO: Usuário encontrado!');
          console.log(`   📋 Nome: ${data.name || data.title?.rendered || 'Nome não encontrado'}`);
        } else {
          console.log('   ⚠️  Array vazio ou sem dados');
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ ERRO: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ EXCEÇÃO: ${error.message}`);
      
      if (error.code === 'ENOTFOUND') {
        console.log('   💡 Verifique se a URL do WordPress está correta');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   💡 Verifique se o WordPress está acessível');
      }
    }
    
    console.log();
  }
  
  console.log('🔍 ANÁLISE DOS RESULTADOS:');
  console.log();
  console.log('Se TODOS os endpoints retornaram arrays vazios ou erros 404:');
  console.log('   ❌ O problema está no WordPress - busca não funciona');
  console.log('   🔧 Solução: Implementar busca inteligente no plugin WordPress');
  console.log();
  console.log('Se ALGUM endpoint retornou dados:');
  console.log('   ✅ WordPress tem os dados, problema está no SatiZap');
  console.log('   🔧 Solução: Ajustar lógica de busca no SatiZap');
  console.log();
  console.log('Se houve erros de autenticação (401/403):');
  console.log('   🔑 Problema nas credenciais');
  console.log('   🔧 Solução: Verificar username/password no script');
  console.log();
  
  console.log('📝 PRÓXIMOS PASSOS:');
  console.log('1. Analise os resultados acima');
  console.log('2. Se necessário, ajuste as credenciais no topo deste script');
  console.log('3. Execute novamente após correções');
  console.log();
  console.log('='.repeat(80));
}

// Verificar se as credenciais foram configuradas
if (WORDPRESS_USERNAME === 'seu_usuario' || WORDPRESS_PASSWORD === 'sua_senha_de_aplicacao') {
  console.log('❌ ERRO: Credenciais não configuradas!');
  console.log();
  console.log('📝 CONFIGURE AS CREDENCIAIS:');
  console.log('1. Abra este arquivo: scripts/fase2-teste-direto-wordpress.js');
  console.log('2. Substitua "seu_usuario" pelo username do WordPress');
  console.log('3. Substitua "sua_senha_de_aplicacao" pela Application Password');
  console.log('4. Execute novamente o script');
  console.log();
  process.exit(1);
}

// Executar o teste
testWordPressDirectly().catch(console.error);