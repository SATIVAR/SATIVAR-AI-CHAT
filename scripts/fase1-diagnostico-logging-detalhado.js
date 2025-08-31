#!/usr/bin/env node

/**
 * FASE 1: Diagnóstico com Logging Detalhado
 * 
 * Este script executa o teste do endpoint de validação de WhatsApp
 * com logging detalhado para identificar onde exatamente a busca
 * do paciente está falhando na comunicação com o WordPress.
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
const TEST_WHATSAPP = '85996201636';
const TEST_SLUG = 'sativar';

async function executeFase1Diagnostico() {
  console.log('='.repeat(80));
  console.log('FASE 1: DIAGNÓSTICO COM LOGGING DETALHADO');
  console.log('='.repeat(80));
  console.log();
  
  console.log('📋 Configuração do Teste:');
  console.log(`   • WhatsApp: ${TEST_WHATSAPP}`);
  console.log(`   • Slug: ${TEST_SLUG}`);
  console.log(`   • URL Base: ${SATIZAP_BASE_URL}`);
  console.log();
  
  try {
    console.log('🔄 Executando chamada para o endpoint de validação...');
    console.log();
    
    const response = await fetch(`${SATIZAP_BASE_URL}/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        whatsapp: TEST_WHATSAPP
      })
    });
    
    console.log(`📊 Status da Resposta: ${response.status}`);
    console.log(`📊 Status Text: ${response.statusText}`);
    console.log();
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ ERRO na resposta:');
      console.log(errorText);
      return;
    }
    
    const responseData = await response.json();
    
    console.log('📋 RESPOSTA DO ENDPOINT:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log();
    
    // Análise da resposta
    console.log('🔍 ANÁLISE DA RESPOSTA:');
    
    if (responseData.status === 'patient_found') {
      console.log('✅ SUCESSO: Paciente foi encontrado!');
      console.log(`   • Tipo de Sincronização: ${responseData.syncType}`);
      console.log(`   • Nome do Paciente: ${responseData.patientData?.name}`);
      console.log(`   • Fonte: ${responseData.patientData?.source}`);
    } else if (responseData.status === 'new_patient_step_2') {
      console.log('⚠️  FALHA: Paciente NÃO foi encontrado');
      console.log('   • Sistema direcionou para captura de lead');
      console.log('   • Isso indica que a busca no WordPress falhou');
    } else {
      console.log('❓ RESPOSTA INESPERADA:');
      console.log(`   • Status: ${responseData.status}`);
    }
    
    console.log();
    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('   1. Verifique os logs do servidor SatiZap para os logs FASE 1');
    console.log('   2. Procure pelos logs [FASE 1 - LOG 1] até [FASE 1 - LOG 4D]');
    console.log('   3. O LOG 4 mostrará exatamente o que o WordPress está retornando');
    console.log();
    
    if (responseData.status === 'new_patient_step_2') {
      console.log('🎯 DIAGNÓSTICO ESPERADO:');
      console.log('   • LOG 4A, 4B, 4C devem mostrar arrays vazios [] ou erros 404');
      console.log('   • Isso confirmará que o problema está no WordPress');
      console.log('   • A busca não consegue encontrar "(85) 99620-1636" usando "85996201636"');
    }
    
  } catch (error) {
    console.error('❌ ERRO durante o teste:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log();
      console.log('💡 SOLUÇÃO:');
      console.log('   • Certifique-se de que o servidor SatiZap está rodando');
      console.log('   • Execute: npm run dev');
      console.log('   • Aguarde o servidor inicializar na porta 9002');
    }
  }
  
  console.log();
  console.log('='.repeat(80));
}

// Executar o diagnóstico
executeFase1Diagnostico().catch(console.error);