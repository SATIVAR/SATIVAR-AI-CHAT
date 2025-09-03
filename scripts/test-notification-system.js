const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationSystem() {
  console.log('🧪 Testando Sistema de Notificações SatiZap\n');

  try {
    // 1. Verificar estrutura do banco
    console.log('1. Verificando estrutura do banco de dados...');
    
    const conversationCount = await prisma.conversation.count();
    const patientCount = await prisma.patient.count();
    const messageCount = await prisma.message.count();
    
    console.log(`   ✅ Conversas: ${conversationCount}`);
    console.log(`   ✅ Pacientes: ${patientCount}`);
    console.log(`   ✅ Mensagens: ${messageCount}\n`);

    // 2. Verificar conversas na fila
    console.log('2. Verificando conversas na fila...');
    
    const queueConversations = await prisma.conversation.findMany({
      where: {
        status: 'fila_humano',
      },
      include: {
        Patient: true,
        Message: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    console.log(`   📋 Conversas na fila: ${queueConversations.length}`);
    
    if (queueConversations.length > 0) {
      queueConversations.forEach((conv, index) => {
        const waitTime = Math.floor((Date.now() - new Date(conv.updatedAt).getTime()) / (1000 * 60));
        console.log(`   ${index + 1}. ${conv.Patient.name} - ${waitTime} min na fila`);
      });
    } else {
      console.log('   ℹ️  Nenhuma conversa na fila no momento');
    }
    console.log('');

    // 3. Simular nova conversa na fila (se não houver)
    if (queueConversations.length === 0) {
      console.log('3. Criando conversa de teste na fila...');
      
      // Buscar ou criar paciente de teste
      let testPatient = await prisma.patient.findFirst({
        where: {
          name: 'Paciente Teste Notificação',
        },
      });

      if (!testPatient) {
        // Buscar uma associação para o teste
        const association = await prisma.association.findFirst();
        if (!association) {
          console.log('   ❌ Nenhuma associação encontrada. Execute o seed primeiro.');
          return;
        }

        testPatient = await prisma.patient.create({
          data: {
            id: `test_patient_${Date.now()}`,
            name: 'Paciente Teste Notificação',
            whatsapp: '+5511999999999',
            associationId: association.id,
            updatedAt: new Date(),
          },
        });
      }

      // Criar conversa de teste
      const testConversation = await prisma.conversation.create({
        data: {
          id: `test_conv_${Date.now()}`,
          patientId: testPatient.id,
          status: 'fila_humano',
          updatedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutos atrás
        },
      });

      // Criar mensagem de teste
      await prisma.message.create({
        data: {
          id: `test_msg_${Date.now()}`,
          conversationId: testConversation.id,
          content: 'Olá, preciso de ajuda com meu pedido de cannabis medicinal.',
          senderType: 'paciente',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
        },
      });

      console.log(`   ✅ Conversa de teste criada: ${testConversation.id}`);
      console.log(`   📱 Paciente: ${testPatient.name}`);
      console.log(`   ⏰ Tempo na fila: 20 minutos\n`);
    }

    // 4. Testar cálculo de estatísticas
    console.log('4. Calculando estatísticas da fila...');
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allQueueConversations = await prisma.conversation.findMany({
      where: {
        status: 'fila_humano',
      },
    });

    const waitTimes = allQueueConversations.map(conv => {
      const waitTimeMs = now.getTime() - new Date(conv.updatedAt).getTime();
      return Math.floor(waitTimeMs / (1000 * 60));
    });

    const stats = {
      totalInQueue: allQueueConversations.length,
      averageWaitTime: waitTimes.length > 0 
        ? Math.round(waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length)
        : 0,
      longestWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      urgentConversations: waitTimes.filter(time => time >= 60).length,
    };

    console.log(`   📊 Total na fila: ${stats.totalInQueue}`);
    console.log(`   ⏱️  Tempo médio: ${stats.averageWaitTime} min`);
    console.log(`   🔥 Maior espera: ${stats.longestWaitTime} min`);
    console.log(`   🚨 Urgentes (60+ min): ${stats.urgentConversations}\n`);

    // 5. Testar endpoints da API
    console.log('5. Testando endpoints da API...');
    
    const baseUrl = 'http://localhost:9002';
    
    try {
      // Testar endpoint de estatísticas
      const statsResponse = await fetch(`${baseUrl}/api/attendant/stats`);
      if (statsResponse.ok) {
        console.log('   ✅ /api/attendant/stats - OK');
      } else {
        console.log('   ❌ /api/attendant/stats - Falhou');
      }

      // Testar endpoint de fila
      const queueResponse = await fetch(`${baseUrl}/api/attendant/queue`);
      if (queueResponse.ok) {
        console.log('   ✅ /api/attendant/queue - OK');
      } else {
        console.log('   ❌ /api/attendant/queue - Falhou');
      }

      // Testar endpoint de notificações
      const notificationsResponse = await fetch(`${baseUrl}/api/notifications`);
      if (notificationsResponse.ok) {
        console.log('   ✅ /api/notifications - OK');
      } else {
        console.log('   ❌ /api/notifications - Falhou');
      }

      // Testar endpoint de monitoramento
      const monitorResponse = await fetch(`${baseUrl}/api/notifications/monitor`);
      if (monitorResponse.ok) {
        console.log('   ✅ /api/notifications/monitor - OK');
      } else {
        console.log('   ❌ /api/notifications/monitor - Falhou');
      }

    } catch (error) {
      console.log('   ⚠️  Não foi possível testar APIs (servidor pode estar offline)');
      console.log('   💡 Execute: npm run dev');
    }

    console.log('\n6. Instruções para teste manual:');
    console.log('   1. Execute: npm run dev');
    console.log('   2. Acesse: http://localhost:9002/atendimento');
    console.log('   3. Observe o sino de notificações no header');
    console.log('   4. Verifique as estatísticas no dashboard');
    console.log('   5. Clique no ícone de configurações para ajustar preferências');
    console.log('   6. Aguarde notificações automáticas de timeout\n');

    console.log('✅ Teste do sistema de notificações concluído!');
    console.log('📚 Documentação: docs/sistema-notificacoes.md');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar teste
testNotificationSystem().catch(console.error);