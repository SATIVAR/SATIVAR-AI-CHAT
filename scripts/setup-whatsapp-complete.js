/**
 * Script de configuração completa da integração WhatsApp
 * Configura WAHA, webhook e testa toda a integração
 */

const dotenv = require('dotenv');
const { testWAHAConnection, testWebhookEndpoint, testWebhookWithMockMessage } = require('./test-whatsapp-integration');
const { setupWebhook, listWebhooks } = require('./setup-waha-webhook');

dotenv.config();

async function setupCompleteIntegration() {
  console.log('🚀 CONFIGURAÇÃO COMPLETA DA INTEGRAÇÃO WHATSAPP');
  console.log('='.repeat(60));
  
  const results = {};
  
  // Passo 1: Verificar WAHA
  console.log('\n📋 PASSO 1: Verificando WAHA...');
  results.waha = await testWAHAConnection();
  
  if (!results.waha.success) {
    console.log('❌ WAHA não está acessível. Verifique se está rodando.');
    return results;
  }
  
  // Passo 2: Verificar SatiZap
  console.log('\n📋 PASSO 2: Verificando SatiZap...');
  results.satizap = await testWebhookEndpoint();
  
  if (!results.satizap.success) {
    console.log('❌ SatiZap não está acessível. Inicie com: npm run dev');
    return results;
  }
  
  // Passo 3: Configurar webhook
  console.log('\n📋 PASSO 3: Configurando webhook...');
  results.webhook = await setupWebhook();
  
  // Passo 4: Testar webhook
  console.log('\n📋 PASSO 4: Testando webhook...');
  results.webhookTest = await testWebhookWithMockMessage();
  
  // Passo 5: Listar configuração final
  console.log('\n📋 PASSO 5: Verificando configuração final...');
  results.finalCheck = await listWebhooks();
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA CONFIGURAÇÃO:');
  console.log('='.repeat(60));
  
  const steps = [
    { name: 'WAHA Conectado', result: results.waha },
    { name: 'SatiZap Acessível', result: results.satizap },
    { name: 'Webhook Configurado', result: results.webhook },
    { name: 'Webhook Testado', result: results.webhookTest },
    { name: 'Configuração Final', result: results.finalCheck }
  ];
  
  steps.forEach(step => {
    const status = step.result?.success ? '✅ OK' : '❌ ERRO';
    console.log(`${step.name.padEnd(25)}: ${status}`);
  });
  
  const allSuccess = steps.every(step => step.result?.success);
  
  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('🎉 INTEGRAÇÃO CONFIGURADA COM SUCESSO!');
    console.log('\n📱 PRÓXIMOS PASSOS:');
    console.log('1. Conecte um número WhatsApp no WAHA via QR Code');
    console.log('2. Envie uma mensagem para o número conectado');
    console.log('3. Acesse /admin/inbox para ver as conversas');
  } else {
    console.log('⚠️  CONFIGURAÇÃO INCOMPLETA - Verifique os erros acima');
  }
  
  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  setupCompleteIntegration().catch(console.error);
}

module.exports = { setupCompleteIntegration };