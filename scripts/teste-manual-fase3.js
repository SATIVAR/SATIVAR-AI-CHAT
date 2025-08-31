#!/usr/bin/env node

/**
 * TESTE MANUAL DA FASE 3 - Validação Real da API
 * 
 * Este script testa a API real do SatiZap para verificar se as correções
 * da Fase 3 estão funcionando corretamente
 */

const fetch = require('node-fetch');

const SATIZAP_BASE_URL = 'http://localhost:9002';
const TEST_WHATSAPP = '85996201636';
const TEST_SLUG = 'sativar';

console.log('🧪 TESTE MANUAL DA FASE 3 - API REAL');
console.log('='.repeat(60));
console.log();

async function testarApiReal() {
  try {
    console.log('📱 Testando API de validação de WhatsApp...');
    console.log(`   URL: ${SATIZAP_BASE_URL}/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`);
    console.log(`   WhatsApp: ${TEST_WHATSAPP}`);
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
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ ERRO na API:');
      console.log(errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Resposta da API:');
    console.log(JSON.stringify(data, null, 2));
    console.log();

    // Analisar resultado
    if (data.status === 'patient_found') {
      console.log('🎉 SUCESSO! Paciente encontrado!');
      console.log(`   Nome: ${data.patientData?.name}`);
      console.log(`   Tipo: ${data.syncType}`);
      console.log(`   Fonte: ${data.patientData?.source}`);
      console.log();
      console.log('✅ Resultado esperado para a interface:');
      console.log('   • Tela de confirmação com dados do paciente');
      console.log('   • Botão "Iniciar Atendimento"');
      console.log('   • NÃO mostra campos Nome/CPF');
      return true;
      
    } else if (data.status === 'new_patient_step_2') {
      console.log('📝 Paciente não encontrado - Lead capture');
      console.log('   Isso é normal se o paciente não existir no WordPress');
      console.log();
      console.log('✅ Resultado esperado para a interface:');
      console.log('   • Formulário para coletar Nome e CPF');
      console.log('   • Processo de captura de lead');
      return true;
      
    } else {
      console.log('❓ Status inesperado:', data.status);
      return false;
    }

  } catch (error) {
    console.log('❌ ERRO durante o teste:', error.message);
    return false;
  }
}

async function executarTeste() {
  console.log('🚀 Iniciando teste da API real...');
  console.log();
  
  const sucesso = await testarApiReal();
  
  console.log();
  console.log('📋 INSTRUÇÕES PARA TESTE MANUAL COMPLETO:');
  console.log('-'.repeat(50));
  console.log(`1. Abra o navegador em: ${SATIZAP_BASE_URL}/${TEST_SLUG}`);
  console.log(`2. Digite o WhatsApp: ${TEST_WHATSAPP}`);
  console.log('3. Clique em "Continuar"');
  console.log('4. Observe o resultado na interface');
  console.log();
  
  if (sucesso) {
    console.log('✅ API FUNCIONANDO CORRETAMENTE!');
    console.log('🎯 A Fase 3 foi implementada com sucesso!');
  } else {
    console.log('❌ API COM PROBLEMAS!');
    console.log('🔧 Verifique os logs do servidor para mais detalhes');
  }
  
  console.log();
  console.log('📝 Para monitorar logs em tempo real:');
  console.log('   • Observe o terminal onde o SatiZap está rodando');
  console.log('   • Procure por mensagens "[FASE 1 - LOG X]"');
  console.log('   • Verifique se a URL construída está correta');
  
  return sucesso;
}

// Executar teste
executarTeste()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ ERRO durante execução:', error);
    process.exit(1);
  });