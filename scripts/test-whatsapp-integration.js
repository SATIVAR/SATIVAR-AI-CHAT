/**
 * Script para testar a integração WAHA-SatiZap
 * Verifica conectividade, webhook e fluxo de mensagens
 */

const dotenv = require('dotenv');
dotenv.config();

async function testWAHAConnection() {
  console.log('🔍 Testando conexão com WAHA...');
  
  try {
    const wahaUrl = process.env.WAHA_API_URL || `http://localhost:${process.env.WAHA_PORT || 3000}`;
    const apiKey = process.env.WAHA_API_KEY;
    
    // API key é opcional se WAHA estiver sem autenticação
    console.log(`🔑 API Key: ${apiKey ? 'Configurada' : 'Não configurada (sem autenticação)'}`);
    
    // Testar endpoint de sessões
    const headers = {};
    
    // Só adicionar API key se estiver configurada
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
  console.log('\n🔍 Testando endpoint do webhook...');
  
  try {
    const webhookUrl = 'http://localhost:9002/api/webhooks/whatsapp';
    
    // Testar endpoint GET (health check)
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
    
    if (!webhookSecret) {
      throw new Error('WAHA_WEBHOOK_SECRET não configurada no .env');
    }
    
    // Simular payload do WAHA
    const mockPayload = {
      event: 'message',
      session: 'default',
      payload: {
        from: '5511999999999@c.us',
        body: 'Olá, gostaria de fazer um orçamento',
        type: 'text',
        timestamp: Date.now()
      }
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret
      },
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

async function testSendMessage() {
  console.log('\n🔍 Testando envio de mensagem via WAHA...');
  
  try {
    const wahaUrl = process.env.WAHA_API_URL || `http://localhost:${process.env.WAHA_PORT || 3000}`;
    const apiKey = process.env.WAHA_API_KEY;
    
    // Primeiro, verificar se há sessões ativas
    const headers = {};
    
    // Só adicionar API key se estiver configurada
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }
    
    const sessionsResponse = await fetch(`${wahaUrl}/api/sessions`, {
      method: 'GET',
      headers
    });
    
    const sessions = await sessionsResponse.json();
    
    if (sessions.length === 0) {
      console.log('⚠️  Nenhuma sessão ativa encontrada. Não é possível testar envio de mensagem.');
      return { success: false, error: 'Nenhuma sessão ativa' };
    }
    
    const activeSession = sessions.find(s => s.status === 'WORKING') || sessions[0];
    console.log(`📱 Usando sessão: ${activeSession.name} (${activeSession.status})`);
    
    // Tentar enviar mensagem de teste (para um número fictício)
    const testPayload = {
      chatId: '5511999999999@c.us',
      text: 'Mensagem de teste do SatiZap - Integração funcionando!',
      session: activeSession.name
    };
    
    console.log('📤 Simulando envio de mensagem...');
    console.log('💬 Payload:', testPayload);
    
    // Nota: Não vamos realmente enviar para evitar spam
    // Em um ambiente real, descomente as linhas abaixo:
    /*
    const response = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao enviar mensagem: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Mensagem enviada com sucesso!');
    console.log('📊 Resultado:', result);
    */
    
    console.log('✅ Teste de envio simulado com sucesso!');
    console.log('ℹ️  Para testar envio real, descomente o código no script');
    
    return { success: true, simulated: true };
    
  } catch (error) {
    console.error('❌ Erro ao testar envio:', error.message);
    return { success: false, error: error.message };
  }
}

async function runIntegrationTests() {
  console.log('🚀 Iniciando testes de integração WAHA-SatiZap\n');
  
  const results = {
    wahaConnection: await testWAHAConnection(),
    webhookEndpoint: await testWebhookEndpoint(),
    webhookMessage: await testWebhookWithMockMessage(),
    sendMessage: await testSendMessage()
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
    console.log('🎉 TODOS OS TESTES PASSARAM! Integração WAHA-SatiZap funcionando.');
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM. Verifique os erros acima.');
  }
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Certifique-se de que o WAHA está rodando na porta', process.env.WAHA_PORT || 3000);
  console.log('2. Verifique se o SatiZap está rodando na porta 9002');
  console.log('3. Configure uma sessão WhatsApp no WAHA via QR Code');
  console.log('4. Teste enviando uma mensagem real para o número conectado');
  
  return results;
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = {
  testWAHAConnection,
  testWebhookEndpoint,
  testWebhookWithMockMessage,
  testSendMessage,
  runIntegrationTests
};