#!/usr/bin/env node

/**
 * FASE 1: Teste da Correção do Bug de Mapeamento
 * 
 * Este script testa se a correção implementada resolve o problema
 * de sincronização dos dados ACF do WordPress para o SatiZap.
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
const TEST_CASES = [
  {
    name: 'Telefone que existe no WordPress',
    whatsapp: '85988776655',
    expectedResult: 'patient_found',
    expectedACF: true
  },
  {
    name: 'Telefone que não existe no WordPress',
    whatsapp: '85996201636',
    expectedResult: 'new_patient_step_2',
    expectedACF: false
  }
];
const TEST_SLUG = 'sativar';

async function testFase1Correction() {
  console.log('🔧 FASE 1: TESTE DA CORREÇÃO DO BUG DE MAPEAMENTO');
  console.log('================================================');
  console.log(`URL Base: ${SATIZAP_BASE_URL}`);
  console.log(`Slug: ${TEST_SLUG}`);
  console.log();
  
  for (const testCase of TEST_CASES) {
    console.log(`🔄 Testando: ${testCase.name}`);
    console.log(`   WhatsApp: ${testCase.whatsapp}`);
    console.log(`   Resultado esperado: ${testCase.expectedResult}`);
    console.log();
    
    try {
      const response = await fetch(`${SATIZAP_BASE_URL}/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsapp: testCase.whatsapp
        })
      });
      
      console.log(`   📊 Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('   ❌ ERRO na resposta:');
        console.log(`   ${errorText}`);
        continue;
      }
      
      const responseData = await response.json();
      
      console.log('   📋 Resposta:');
      console.log(`      Status: ${responseData.status}`);
      console.log(`      Tipo: ${responseData.syncType || 'N/A'}`);
      
      if (responseData.patientData) {
        console.log(`      Nome: ${responseData.patientData.name}`);
        console.log(`      CPF: ${responseData.patientData.cpf || 'NULL'}`);
        console.log(`      Tipo Associação: ${responseData.patientData.tipo_associacao || 'NULL'}`);
        console.log(`      Nome Responsável: ${responseData.patientData.nome_responsavel || 'NULL'}`);
        console.log(`      CPF Responsável: ${responseData.patientData.cpf_responsavel || 'NULL'}`);
      }
      
      // Validação do resultado
      if (responseData.status === testCase.expectedResult) {
        console.log('   ✅ Status correto!');
        
        if (testCase.expectedACF && responseData.patientData) {
          const hasACFData = responseData.patientData.cpf || 
                           responseData.patientData.tipo_associacao || 
                           responseData.patientData.nome_responsavel || 
                           responseData.patientData.cpf_responsavel;
          
          if (hasACFData) {
            console.log('   ✅ CORREÇÃO FUNCIONOU: Dados ACF sincronizados!');
          } else {
            console.log('   ❌ CORREÇÃO FALHOU: Dados ACF ainda estão NULL');
          }
        } else if (!testCase.expectedACF) {
          console.log('   ✅ Comportamento esperado para telefone inexistente');
        }
      } else {
        console.log(`   ❌ Status incorreto! Esperado: ${testCase.expectedResult}, Recebido: ${responseData.status}`);
      }
      
    } catch (error) {
      console.error(`   ❌ ERRO: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   💡 SOLUÇÃO: Inicie o servidor SatiZap com "npm run dev"');
        break;
      }
    }
    
    console.log();
  }
  
  console.log('=== RESUMO DA CORREÇÃO ===');
  console.log('Se os dados ACF foram sincronizados corretamente,');
  console.log('a Fase 1 foi concluída com sucesso!');
  console.log();
  console.log('Próximos passos:');
  console.log('- Fase 2: Implementar lógica de interlocutor');
  console.log('- Fase 3: Adaptar interface para responsáveis');
  console.log('- Fase 4: Configurar IA contextual');
}

if (require.main === module) {
  testFase1Correction().catch(console.error);
}

module.exports = { testFase1Correction };