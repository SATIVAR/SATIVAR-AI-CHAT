/**
 * Script para configurar o webhook do WAHA automaticamente
 * Configura o WAHA para enviar mensagens para o SatiZap
 */

const dotenv = require('dotenv');
dotenv.config();

async function setupWebhook() {
  console.log('🔧 Configurando webhook WAHA -> SatiZap...');
  
  try {
    const wahaUrl = `http://localhost:${process.env.WAHA_PORT || 3000}`;
    const apiKey = process.env.WAHA_API_KEY;
    const webhookUrl = process.env.WAHA_WEBHOOK_URL || 'http://host.docker.internal:9002/api/webhooks/whatsapp';
    
    // API key é opcional se WAHA estiver sem autenticação
    console.log(`🔑 API Key: ${apiKey ? 'Configurada' : 'Não configurada (sem autenticação)'}`);
    
    console.log(`📡 WAHA URL: ${wahaUrl}`);
    console.log(`🎯 Webhook URL: ${webhookUrl}`);
    
    // Configurar webhook global
    const webhookConfig = {
      url: webhookUrl,
      events: ['message', 'message.any'],
      hmac: {
        key: process.env.WAHA_WEBHOOK_SECRET || ''
      }
    };
    
    console.log('📝 Configuração do webhook:', JSON.stringify(webhookConfig, null, 2));
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Só adicionar API key se estiver configurada
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }
    
    const response = await fetch(`${wahaUrl}/api/webhooks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhookConfig)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao configurar webhook: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Webhook configurado com sucesso!');
    console.log('📊 Resultado:', result);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.message);
    return { success: false, error: error.message };
  }
}

async function listWebhooks() {
  console.log('\n🔍 Listando webhooks configurados...');
  
  try {
    const wahaUrl = `http://localhost:${process.env.WAHA_PORT || 3000}`;
    const apiKey = process.env.WAHA_API_KEY;
    
    const headers = {};
    
    // Só adicionar API key se estiver configurada
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }
    
    const response = await fetch(`${wahaUrl}/api/webhooks`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao listar webhooks: ${response.status}`);
    }
    
    const webhooks = await response.json();
    console.log('📋 Webhooks configurados:', JSON.stringify(webhooks, null, 2));
    
    return { success: true, webhooks };
    
  } catch (error) {
    console.error('❌ Erro ao listar webhooks:', error.message);
    return { success: false, error: error.message };
  }
}

async function testWebhookConnection() {
  console.log('\n🧪 Testando conectividade do webhook...');
  
  try {
    const webhookUrl = process.env.WAHA_WEBHOOK_URL || 'http://host.docker.internal:9002/api/webhooks/whatsapp';
    
    // Testar se o endpoint está acessível
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Webhook endpoint acessível!');
      console.log('📊 Status:', health);
      return { success: true, health };
    } else {
      throw new Error(`Webhook endpoint retornou: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Webhook endpoint não acessível:', error.message);
    console.log('💡 Certifique-se de que o SatiZap está rodando na porta 9002');
    return { success: false, error: error.message };
  }
}

async function removeAllWebhooks() {
  console.log('\n🗑️  Removendo todos os webhooks...');
  
  try {
    const wahaUrl = `http://localhost:${process.env.WAHA_PORT || 3000}`;
    const apiKey = process.env.WAHA_API_KEY;
    
    // Primeiro, listar webhooks existentes
    const headers = {};
    
    // Só adicionar API key se estiver configurada
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }
    
    const listResponse = await fetch(`${wahaUrl}/api/webhooks`, {
      method: 'GET',
      headers
    });
    
    if (!listResponse.ok) {
      throw new Error(`Erro ao listar webhooks: ${listResponse.status}`);
    }
    
    const webhooks = await listResponse.json();
    
    if (webhooks.length === 0) {
      console.log('ℹ️  Nenhum webhook configurado para remover');
      return { success: true, removed: 0 };
    }
    
    // Remover cada webhook
    let removed = 0;
    for (const webhook of webhooks) {
      try {
        const deleteHeaders = {};
        
        // Só adicionar API key se estiver configurada
        if (apiKey) {
          deleteHeaders['X-Api-Key'] = apiKey;
        }
        
        const deleteResponse = await fetch(`${wahaUrl}/api/webhooks/${webhook.id}`, {
          method: 'DELETE',
          headers: deleteHeaders
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Webhook removido: ${webhook.url}`);
          removed++;
        } else {
          console.log(`⚠️  Falha ao remover webhook: ${webhook.url}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao remover webhook ${webhook.url}:`, error.message);
      }
    }
    
    console.log(`🎯 Total removido: ${removed}/${webhooks.length} webhooks`);
    return { success: true, removed };
    
  } catch (error) {
    console.error('❌ Erro ao remover webhooks:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      await setupWebhook();
      break;
      
    case 'list':
      await listWebhooks();
      break;
      
    case 'test':
      await testWebhookConnection();
      break;
      
    case 'remove':
      await removeAllWebhooks();
      break;
      
    case 'reset':
      console.log('🔄 Resetando configuração de webhooks...');
      await removeAllWebhooks();
      await setupWebhook();
      break;
      
    default:
      console.log('🚀 Script de configuração WAHA Webhook');
      console.log('');
      console.log('Comandos disponíveis:');
      console.log('  setup  - Configurar webhook');
      console.log('  list   - Listar webhooks configurados');
      console.log('  test   - Testar conectividade do webhook');
      console.log('  remove - Remover todos os webhooks');
      console.log('  reset  - Remover e reconfigurar webhook');
      console.log('');
      console.log('Exemplos:');
      console.log('  node scripts/setup-waha-webhook.js setup');
      console.log('  node scripts/setup-waha-webhook.js list');
      console.log('  node scripts/setup-waha-webhook.js test');
      break;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupWebhook,
  listWebhooks,
  testWebhookConnection,
  removeAllWebhooks
};