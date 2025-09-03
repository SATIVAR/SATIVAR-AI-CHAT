/**
 * Script simplificado para testar a integração WAHA-SatiZap
 * Não tenta configurar webhooks via API (isso é feito via Docker)
 */

const dotenv = require('dotenv');
dotenv.config();

async function testWAHAConnection() {
  console.log('🔍 Testando conexão com WAHA...');
  
  try {
    const wahaUrl = process.env.WAHA_API_URL || `http://localhost:${process.env.WAHA_PORT || 3000}`;
    const apiKey = process.env.WAHA_API_KEY;
    
    console.log(`📡 WAHA URL: ${wahaUrl}`);
    console.log(`🔑 API Key: ${apiKey ? 'Configurada' : 'Não configurada'}`);
    
    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }
    
    const response = await fetch(`${wahaUrl}/api/sessions`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`WAHA retornou status ${response.status}: ${response.statusText}`);
    }
    
    const sessions = await response.json();
    console.log('✅ WAHA conectado com sucesso!');
    console.log(`📱 Sessões ativas: ${sessions.length}`);
    
    if (sessions.length > 0) {
      console.log('📋 Sessões encontradas:');
      sessions.forEach(session => {
        console.log(`  - ${session.name}: ${session.status}`);
      });
    }
    
    return { success: true, sessions };
    
  } catch (error) {
    console.error('❌ Erro ao conectar com WAHA:', error.message);
    return { success: false, error: error.message };
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔍 Testando endpoint do webhook SatiZap...');
  
  try {
    const webhookUrl = 'http://localhost:9002/api/webhooks/whatsapp';
    
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}: ${response.statusText}`);
    }
    
    const health = await response.json();
    console.log('✅ Webhook endpoint acessível!');
    console.log('📊 Status:', health);
    
    return { success: true, health };
    
  } catch (error) {
    console.error('❌ Erro ao acessar webhook:', error.message);
    return { success: false, error: error.message };
  }
}

async function testWebhookWithMockMessage() {
  console.log('\n🔍 Testando webhook com mensagem simulada...');
  
  try {
    const webhookUrl = 'http://localhost:9002/api/webhooks/whatsapp';
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET;
    
    const mockPayload = {
      event: 'message',
      session: 'default',
      payload: {
        from: '5511999999999@c.us',
        body: 'Teste de integração WAHA-SatiZap',
        type: 'text',
        timestamp: Date.now()
      }
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(mockPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook retornou status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Webhook processou mensagem com sucesso!');
    console.log('📊 Resultado:', result);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error.message);
    return { success: false, error: error.message };
  }
}

async function runSimpleTests() {
  console.log('🚀 TESTE SIMPLIFICADO DA INTEGRAÇÃO WHATSAPP');
  console.log('='.repeat(60));
  
  const results = {
    waha: await testWAHAConnection(),
    webhook: await testWebhookEndpoint(),
    webhookTest: await testWebhookWithMockMessage()
  };
  
  console.log('\n📊 RESUMO DOS TESTES:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${test.padEnd(20)}: ${status}`);
    if (!result.success && result.error) {
      console.log(`  Erro: ${result.error}`);
    }
  });
  
  const allPassed = Object.values(results).every(r => r.success);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 INTEGRAÇÃO FUNCIONANDO!');
    console.log('\n📱 PRÓXIMOS PASSOS:');
    console.log('1. Acesse http://localhost:3000 para conectar WhatsApp via QR Code');
    console.log('2. Envie uma mensagem para o número conectado');
    console.log('3. Acesse /admin/inbox no SatiZap para ver as conversas');
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM - Verifique os erros acima');
  }
  
  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runSimpleTests().catch(console.error);
}

module.exports = { runSimpleTests };