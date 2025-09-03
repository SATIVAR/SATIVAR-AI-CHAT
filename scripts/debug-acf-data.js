#!/usr/bin/env node

/**
 * Script para debugar dados ACF do WordPress
 * Mostra exatamente quais dados estão sendo retornados
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const TEST_PHONE = '85996201636';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      ...options,
      timeout: 15000,
      headers: {
        'User-Agent': 'SATIZAP-Debug/1.0',
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

async function debugACFData() {
  console.log('🔍 DEBUG: Dados ACF do WordPress');
  console.log('================================');
  
  const prisma = new PrismaClient();
  
  try {
    // Buscar associação
    const association = await prisma.association.findFirst({
      where: { subdomain: 'sativar' }
    });
    
    if (!association) {
      console.log('❌ Associação não encontrada');
      return;
    }
    
    console.log(`✅ Associação: ${association.name}`);
    console.log(`   URL: ${association.wordpressUrl}`);
    
    // Tentar buscar credenciais
    let credentials = null;
    
    if (association.wordpressAuth) {
      const auth = typeof association.wordpressAuth === 'string' 
        ? JSON.parse(association.wordpressAuth) 
        : association.wordpressAuth;
      
      if (auth.username && auth.password && auth.username !== 'placeholder') {
        credentials = { username: auth.username, password: auth.password };
      }
    }
    
    if (!credentials) {
      console.log('❌ Credenciais não encontradas ou são placeholder');
      console.log('   Tentando busca sem autenticação...');
    }
    
    // Testar endpoint customizado
    const baseUrl = association.wordpressUrl.replace(/\/$/, '');
    const endpointUrl = `${baseUrl}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${TEST_PHONE}`;
    
    console.log(`\n🔄 Testando endpoint: ${endpointUrl}`);
    
    const headers = {};
    if (credentials) {
      const authHeader = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${authHeader}`;
    }
    
    const response = await makeRequest(endpointUrl, { headers });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('\n📋 DADOS RETORNADOS:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const client = response.data[0];
        console.log('\n🔍 ANÁLISE DOS DADOS ACF:');
        console.log(`   ID: ${client.id || 'N/A'}`);
        console.log(`   Nome: ${client.name || client.acf?.nome_completo || 'N/A'}`);
        
        if (client.acf) {
          console.log('\n📋 CAMPOS ACF ENCONTRADOS:');
          Object.keys(client.acf).forEach(key => {
            console.log(`   ${key}: ${client.acf[key]}`);
          });
          
          // Verificar campos específicos
          console.log('\n🎯 CAMPOS CRÍTICOS:');
          console.log(`   telefone: ${client.acf.telefone || 'AUSENTE'}`);
          console.log(`   nome_completo: ${client.acf.nome_completo || 'AUSENTE'}`);
          console.log(`   tipo_associacao: ${client.acf.tipo_associacao || 'AUSENTE'}`);
          console.log(`   nome_responsavel: ${client.acf.nome_responsavel || 'AUSENTE'}`);
          console.log(`   cpf_responsavel: ${client.acf.cpf_responsavel || 'AUSENTE'}`);
          console.log(`   cpf: ${client.acf.cpf || 'AUSENTE'}`);
        } else {
          console.log('\n❌ NENHUM CAMPO ACF ENCONTRADO!');
        }
      } else {
        console.log('\n❌ NENHUM CLIENTE ENCONTRADO');
      }
    } else {
      console.log(`\n❌ Erro: ${response.status}`);
      console.log(`   Resposta: ${response.rawData}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  debugACFData().catch(console.error);
}

module.exports = { debugACFData };