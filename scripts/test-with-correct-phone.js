#!/usr/bin/env node

/**
 * Teste com o telefone correto que existe no WordPress
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

const SATIZAP_BASE_URL = 'http://localhost:9002';
const CORRECT_WHATSAPP = '85988776655'; // Telefone que existe no WordPress
const TEST_SLUG = 'sativar';

async function testWithCorrectPhone() {
  console.log('🔍 TESTE COM TELEFONE CORRETO');
  console.log('=============================');
  console.log(`WhatsApp: ${CORRECT_WHATSAPP} (existe no WordPress)`);
  console.log(`Slug: ${TEST_SLUG}`);
  console.log(`URL Base: ${SATIZAP_BASE_URL}`);
  console.log();
  
  try {
    console.log('🔄 Executando chamada para o endpoint de validação...');
    
    const response = await fetch(`${SATIZAP_BASE_URL}/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        whatsapp: CORRECT_WHATSAPP
      })
    });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ ERRO na resposta:');
      console.log(errorText);
      return;
    }
    
    const responseData = await response.json();
    
    console.log('📋 RESPOSTA COMPLETA:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log();
    
    // Análise detalhada
    if (responseData.status === 'patient_found') {
      console.log('✅ PACIENTE ENCONTRADO!');
      console.log(`   Nome: ${responseData.patientData?.name}`);
      console.log(`   Tipo: ${responseData.syncType}`);
      console.log(`   Fonte: ${responseData.patientData?.source}`);
      console.log();
      
      console.log('🎯 DADOS ACF SINCRONIZADOS:');
      console.log(`   CPF: ${responseData.patientData?.cpf || 'NULL'}`);
      console.log(`   Tipo Associação: ${responseData.patientData?.tipo_associacao || 'NULL'}`);
      console.log(`   Nome Responsável: ${responseData.patientData?.nome_responsavel || 'NULL'}`);
      console.log(`   CPF Responsável: ${responseData.patientData?.cpf_responsavel || 'NULL'}`);
      console.log();
      
      if (responseData.patientData?.cpf || responseData.patientData?.tipo_associacao) {
        console.log('✅ SUCESSO: Dados ACF foram sincronizados corretamente!');
      } else {
        console.log('❌ PROBLEMA: Dados ACF não foram sincronizados (todos NULL)');
        console.log('   Isso confirma o bug descrito no ia.md');
      }
    } else {
      console.log('❌ PACIENTE NÃO ENCONTRADO');
      console.log(`   Status: ${responseData.status}`);
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUÇÃO: Inicie o servidor SatiZap com "npm run dev"');
    }
  }
}

if (require.main === module) {
  testWithCorrectPhone().catch(console.error);
}

module.exports = { testWithCorrectPhone };