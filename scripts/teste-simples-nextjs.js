#!/usr/bin/env node

/**
 * Teste Simples - Correção Next.js
 * 
 * Script simples para testar a correção implementada no Next.js
 * sem dependências externas.
 */

const http = require('http');
const { URL } = require('url');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testarCorrecaoNextJS() {
  console.log('='.repeat(60));
  console.log('TESTE DA CORREÇÃO NEXT.JS');
  console.log('='.repeat(60));
  console.log();
  
  const TEST_WHATSAPP = '85996201636';
  const TEST_SLUG = 'sativar';
  const SATIZAP_URL = `http://localhost:9002/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`;
  
  console.log('📋 Configuração:');
  console.log(`   • WhatsApp: ${TEST_WHATSAPP}`);
  console.log(`   • Slug: ${TEST_SLUG}`);
  console.log(`   • URL: ${SATIZAP_URL}`);
  console.log();
  
  try {
    console.log('🔄 Testando endpoint do SatiZap...');
    
    const response = await makeRequest(SATIZAP_URL, {
      method: 'POST',
      body: JSON.stringify({ whatsapp: TEST_WHATSAPP })
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log();
    
    if (!response.ok) {
      console.log('❌ ERRO na resposta:');
      console.log(response.data);
      return;
    }
    
    console.log('📋 RESPOSTA:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log();
    
    // Análise do resultado
    if (response.data.status === 'patient_found') {
      console.log('🎉 SUCESSO! Paciente foi encontrado!');
      console.log(`   ✅ Nome: ${response.data.patientData?.name}`);
      console.log(`   ✅ Tipo: ${response.data.syncType}`);
      console.log(`   ✅ Fonte: ${response.data.patientData?.source}`);
      console.log();
      console.log('🎯 CORREÇÃO FUNCIONOU:');
      console.log('   • Next.js agora busca todos os clientes do WordPress');
      console.log('   • Faz busca inteligente normalizando telefones');
      console.log('   • Encontra pacientes independente da formatação');
      
    } else if (response.data.status === 'new_patient_step_2') {
      console.log('⚠️  Paciente não encontrado - direcionado para captura de lead');
      console.log();
      console.log('💡 POSSÍVEIS CAUSAS:');
      console.log('   • WordPress não tem dados do paciente');
      console.log('   • Problema na conexão com WordPress');
      console.log('   • Dados estão em formato não reconhecido');
      console.log();
      console.log('🔍 VERIFIQUE OS LOGS DO SERVIDOR para mais detalhes');
      
    } else {
      console.log(`❓ Status inesperado: ${response.data.status}`);
    }
    
  } catch (error) {
    console.log('❌ ERRO durante o teste:');
    console.log(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log();
      console.log('💡 SOLUÇÃO:');
      console.log('   • Certifique-se de que o SatiZap está rodando');
      console.log('   • Execute: npm run dev');
      console.log('   • Aguarde o servidor inicializar na porta 9002');
    }
  }
  
  console.log();
  console.log('='.repeat(60));
}

// Executar teste
testarCorrecaoNextJS().catch(console.error);