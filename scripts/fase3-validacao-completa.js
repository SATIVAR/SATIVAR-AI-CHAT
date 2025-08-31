#!/usr/bin/env node

/**
 * FASE 3: Validação Completa do Fluxo End-to-End
 * 
 * Este script valida se todas as correções foram implementadas
 * e se o fluxo completo está funcionando corretamente.
 */

const fetch = require('node-fetch');

const SATIZAP_BASE_URL = 'http://localhost:9002';
const WORDPRESS_BASE_URL = 'https://teste.sativar.com.br';
const TEST_WHATSAPP = '85996201636';
const TEST_SLUG = 'sativar';

// Credenciais WordPress (ajustar conforme necessário)
const WORDPRESS_USERNAME = 'seu_usuario';
const WORDPRESS_PASSWORD = 'sua_senha_de_aplicacao';

async function executeFase3Validacao() {
  console.log('='.repeat(80));
  console.log('FASE 3: VALIDAÇÃO COMPLETA DO FLUXO END-TO-END');
  console.log('='.repeat(80));
  console.log();
  
  let allTestsPassed = true;
  
  // TESTE 1: Verificar se o WordPress está respondendo corretamente
  console.log('🔄 TESTE 1: Validação do WordPress Smart Search');
  console.log('-'.repeat(50));
  
  try {
    const credentials = Buffer.from(`${WORDPRESS_USERNAME}:${WORDPRESS_PASSWORD}`).toString('base64');
    const testUrl = `${WORDPRESS_BASE_URL}/wp-json/sativar/v1/test-phone-search?telefone=${TEST_WHATSAPP}`;
    
    console.log(`   URL: ${testUrl}`);
    
    const wpResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (wpResponse.ok) {
      const wpData = await wpResponse.json();
      console.log(`   Status: ${wpResponse.status} ✅`);
      console.log(`   Test Status: ${wpData.test_status}`);
      console.log(`   Results Count: ${wpData.results_count}`);
      console.log(`   Message: ${wpData.message}`);
      
      if (wpData.test_status === 'SUCCESS' && wpData.results_count > 0) {
        console.log('   ✅ TESTE 1 PASSOU: WordPress encontrou o paciente!');
      } else {
        console.log('   ❌ TESTE 1 FALHOU: WordPress não encontrou o paciente');
        allTestsPassed = false;
      }
    } else {
      console.log(`   ❌ TESTE 1 FALHOU: Status ${wpResponse.status}`);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.log(`   ❌ TESTE 1 FALHOU: ${error.message}`);
    allTestsPassed = false;
  }
  
  console.log();
  
  // TESTE 2: Verificar se o SatiZap está processando corretamente
  console.log('🔄 TESTE 2: Validação do SatiZap Backend');
  console.log('-'.repeat(50));
  
  try {
    const satizapResponse = await fetch(`${SATIZAP_BASE_URL}/api/patients/validate-whatsapp-simple?slug=${TEST_SLUG}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        whatsapp: TEST_WHATSAPP
      })
    });
    
    console.log(`   Status: ${satizapResponse.status}`);
    
    if (satizapResponse.ok) {
      const satizapData = await satizapResponse.json();
      console.log(`   Response Status: ${satizapData.status}`);
      
      if (satizapData.status === 'patient_found') {
        console.log('   ✅ TESTE 2 PASSOU: SatiZap encontrou o paciente!');
        console.log(`   📋 Nome: ${satizapData.patientData?.name}`);
        console.log(`   📋 Tipo: ${satizapData.syncType}`);
        console.log(`   📋 Fonte: ${satizapData.patientData?.source}`);
      } else if (satizapData.status === 'new_patient_step_2') {
        console.log('   ❌ TESTE 2 FALHOU: SatiZap não encontrou o paciente');
        console.log('   💡 Isso indica que o WordPress ainda não está retornando dados');
        allTestsPassed = false;
      } else {
        console.log(`   ❓ TESTE 2 INCONCLUSIVO: Status inesperado ${satizapData.status}`);
        allTestsPassed = false;
      }
    } else {
      console.log(`   ❌ TESTE 2 FALHOU: Status ${satizapResponse.status}`);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.log(`   ❌ TESTE 2 FALHOU: ${error.message}`);
    allTestsPassed = false;
  }
  
  console.log();
  
  // TESTE 3: Verificar se a interface está funcionando
  console.log('🔄 TESTE 3: Validação da Interface (Simulação)');
  console.log('-'.repeat(50));
  
  console.log('   📝 Para testar a interface completa:');
  console.log(`   1. Acesse: ${SATIZAP_BASE_URL}/${TEST_SLUG}`);
  console.log(`   2. Digite o WhatsApp: ${TEST_WHATSAPP}`);
  console.log('   3. Clique em "Continuar"');
  console.log();
  
  if (allTestsPassed) {
    console.log('   ✅ Se os testes 1 e 2 passaram, a interface deve mostrar:');
    console.log('      • Tela de confirmação com dados do paciente');
    console.log('      • Botão "Iniciar Atendimento"');
    console.log('      • NÃO deve mostrar campos Nome/CPF');
  } else {
    console.log('   ⚠️  Como os testes anteriores falharam, a interface mostrará:');
    console.log('      • Formulário de Nome/CPF (captura de lead)');
    console.log('      • Isso confirma que o problema ainda não foi resolvido');
  }
  
  console.log();
  
  // RESULTADO FINAL
  console.log('📊 RESULTADO FINAL');
  console.log('='.repeat(50));
  
  if (allTestsPassed) {
    console.log('🎉 SUCESSO! Todas as correções foram implementadas com sucesso!');
    console.log();
    console.log('✅ O que foi corrigido:');
    console.log('   • WordPress agora encontra pacientes independente da formatação');
    console.log('   • SatiZap processa corretamente a resposta do WordPress');
    console.log('   • Interface mostra tela de confirmação para pacientes existentes');
    console.log();
    console.log('🎯 Próximos passos:');
    console.log('   • Teste manualmente a interface web');
    console.log('   • Verifique se o chat funciona após "Iniciar Atendimento"');
    console.log('   • Considere implementar testes automatizados');
    
  } else {
    console.log('❌ FALHA: Ainda há problemas que precisam ser resolvidos');
    console.log();
    console.log('🔧 Ações necessárias:');
    
    if (WORDPRESS_USERNAME === 'seu_usuario') {
      console.log('   1. ⚠️  Configure as credenciais do WordPress neste script');
    }
    
    console.log('   2. 📋 Verifique se o código PHP foi adicionado ao plugin WordPress');
    console.log('   3. 🔄 Reative o plugin WordPress após adicionar o código');
    console.log('   4. 📊 Execute novamente este script após as correções');
    console.log();
    console.log('💡 Dicas de troubleshooting:');
    console.log('   • Verifique os logs do WordPress (wp-content/debug.log)');
    console.log('   • Verifique os logs do SatiZap no terminal');
    console.log('   • Teste os endpoints individualmente com Postman/Insomnia');
  }
  
  console.log();
  console.log('='.repeat(80));
  
  return allTestsPassed;
}

// Executar validação
executeFase3Validacao()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ ERRO durante a validação:', error);
    process.exit(1);
  });