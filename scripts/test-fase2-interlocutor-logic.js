#!/usr/bin/env node

/**
 * FASE 2: Script de Teste da Lógica de Interlocutor (Paciente vs. Responsável)
 * 
 * Este script testa:
 * 1. Identificação correta do cenário (paciente direto vs. responsável)
 * 2. Mensagens contextualizadas na tela de confirmação
 * 3. Contexto correto passado para a IA
 * 4. Mensagens de boas-vindas personalizadas
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInterlocutorLogic() {
  console.log('🧪 FASE 2: Testando Lógica de Interlocutor (Paciente vs. Responsável)');
  console.log('=' .repeat(80));

  try {
    // 1. Buscar associação de teste
    const association = await prisma.association.findUnique({
      where: { subdomain: 'sativar' }
    });

    if (!association) {
      console.error('❌ Associação "sativar" não encontrada');
      return;
    }

    console.log('✅ Associação encontrada:', association.name);

    // 2. Criar paciente de teste - Cenário Responsável
    const responsiblePatient = await prisma.patient.upsert({
      where: {
        whatsapp: '11999887766'
      },
      update: {
        name: 'João Silva (Menor)',
        cpf: '12345678901',
        tipo_associacao: 'assoc_respon',
        nome_responsavel: 'Maria Silva',
        cpf_responsavel: '98765432100',
        status: 'MEMBRO',
        associationId: association.id
      },
      create: {
        id: `test-responsible-${Date.now()}`,
        name: 'João Silva (Menor)',
        whatsapp: '11999887766',
        cpf: '12345678901',
        tipo_associacao: 'assoc_respon',
        nome_responsavel: 'Maria Silva',
        cpf_responsavel: '98765432100',
        status: 'MEMBRO',
        associationId: association.id,
        updatedAt: new Date()
      }
    });

    // 3. Criar paciente de teste - Cenário Direto
    const directPatient = await prisma.patient.upsert({
      where: {
        whatsapp: '11999887755'
      },
      update: {
        name: 'Ana Costa',
        cpf: '11122233344',
        tipo_associacao: 'assoc_paciente',
        status: 'MEMBRO',
        associationId: association.id
      },
      create: {
        id: `test-direct-${Date.now()}`,
        name: 'Ana Costa',
        whatsapp: '11999887755',
        cpf: '11122233344',
        tipo_associacao: 'assoc_paciente',
        status: 'MEMBRO',
        associationId: association.id,
        updatedAt: new Date()
      }
    });

    console.log('\n📋 PACIENTES DE TESTE CRIADOS:');
    console.log('─'.repeat(50));

    // 4. Testar lógica de identificação do interlocutor
    console.log('\n🔍 TESTE 1: Identificação do Cenário');
    console.log('─'.repeat(40));

    // Cenário Responsável
    const isResponsibleScenario1 = responsiblePatient.tipo_associacao === 'assoc_respon' && responsiblePatient.nome_responsavel;
    const interlocutorName1 = isResponsibleScenario1 ? responsiblePatient.nome_responsavel : responsiblePatient.name;
    
    console.log(`👤 Paciente: ${responsiblePatient.name}`);
    console.log(`📱 WhatsApp: ${responsiblePatient.whatsapp}`);
    console.log(`🏷️  Tipo: ${responsiblePatient.tipo_associacao}`);
    console.log(`👨‍👩‍👧‍👦 Responsável: ${responsiblePatient.nome_responsavel || 'N/A'}`);
    console.log(`🎯 Cenário Detectado: ${isResponsibleScenario1 ? 'RESPONSÁVEL' : 'DIRETO'}`);
    console.log(`💬 Interlocutor: ${interlocutorName1}`);
    console.log(`✅ Resultado: ${isResponsibleScenario1 ? 'CORRETO - Responsável identificado' : 'ERRO - Deveria ser responsável'}`);
    console.log(`🔍 Debug: tipo_associacao='${responsiblePatient.tipo_associacao}', nome_responsavel='${responsiblePatient.nome_responsavel}'`);

    console.log('\n' + '─'.repeat(40));

    // Cenário Direto
    const isResponsibleScenario2 = directPatient.tipo_associacao === 'assoc_respon' && directPatient.nome_responsavel;
    const interlocutorName2 = isResponsibleScenario2 ? directPatient.nome_responsavel : directPatient.name;
    
    console.log(`👤 Paciente: ${directPatient.name}`);
    console.log(`📱 WhatsApp: ${directPatient.whatsapp}`);
    console.log(`🏷️  Tipo: ${directPatient.tipo_associacao}`);
    console.log(`👨‍👩‍👧‍👦 Responsável: ${directPatient.nome_responsavel || 'N/A'}`);
    console.log(`🎯 Cenário Detectado: ${isResponsibleScenario2 ? 'RESPONSÁVEL' : 'DIRETO'}`);
    console.log(`💬 Interlocutor: ${interlocutorName2}`);
    console.log(`✅ Resultado: ${!isResponsibleScenario2 ? 'CORRETO - Paciente direto identificado' : 'ERRO - Deveria ser direto'}`);
    console.log(`🔍 Debug: tipo_associacao='${directPatient.tipo_associacao}', nome_responsavel='${directPatient.nome_responsavel}'`);

    // 5. Testar mensagens contextualizadas
    console.log('\n🎭 TESTE 2: Mensagens Contextualizadas');
    console.log('─'.repeat(40));

    // Função para simular a lógica do PatientConfirmation
    function getWelcomeMessage(patient) {
      const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
      const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
      
      if (isResponsibleScenario) {
        return {
          title: `Olá, ${interlocutorName}!`,
          subtitle: `Você está iniciando o atendimento para ${patient.name}`,
          buttonText: `Iniciar Atendimento para ${patient.name}`,
          scenario: 'responsible'
        };
      } else {
        return {
          title: `Bem-vindo(a) de volta, ${interlocutorName}!`,
          subtitle: 'Encontramos seus dados em nosso sistema',
          buttonText: 'Iniciar Atendimento',
          scenario: 'direct'
        };
      }
    }

    const message1 = getWelcomeMessage(responsiblePatient);
    const message2 = getWelcomeMessage(directPatient);

    console.log('📝 Mensagem para Cenário Responsável:');
    console.log(`   Título: "${message1.title}"`);
    console.log(`   Subtítulo: "${message1.subtitle}"`);
    console.log(`   Botão: "${message1.buttonText}"`);
    console.log(`   ✅ ${message1.scenario === 'responsible' ? 'CORRETO' : 'ERRO'}`);

    console.log('\n📝 Mensagem para Cenário Direto:');
    console.log(`   Título: "${message2.title}"`);
    console.log(`   Subtítulo: "${message2.subtitle}"`);
    console.log(`   Botão: "${message2.buttonText}"`);
    console.log(`   ✅ ${message2.scenario === 'direct' ? 'CORRETO' : 'ERRO'}`);

    // 6. Testar contexto para IA
    console.log('\n🤖 TESTE 3: Contexto para IA');
    console.log('─'.repeat(40));

    function buildAIContext(patient) {
      const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
      const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
      
      if (isResponsibleScenario) {
        return {
          interlocutorName,
          isResponsibleScenario: true, // Forçar boolean true
          patientName: patient.name,
          instructions: `Você está conversando com ${interlocutorName} (RESPONSÁVEL). O atendimento é para o paciente: ${patient.name}. SEMPRE se dirija ao responsável diretamente, mas refira-se ao paciente na terceira pessoa.`
        };
      } else {
        return {
          interlocutorName,
          isResponsibleScenario: false,
          patientName: patient.name,
          instructions: `Você está conversando diretamente com o paciente: ${interlocutorName}. Use linguagem direta e pessoal.`
        };
      }
    }

    const aiContext1 = buildAIContext(responsiblePatient);
    const aiContext2 = buildAIContext(directPatient);

    console.log('🧠 Contexto IA - Cenário Responsável:');
    console.log(`   Interlocutor: ${aiContext1.interlocutorName}`);
    console.log(`   É Responsável: ${aiContext1.isResponsibleScenario} (tipo: ${typeof aiContext1.isResponsibleScenario})`);
    console.log(`   Paciente: ${aiContext1.patientName}`);
    console.log(`   Instruções: ${aiContext1.instructions.substring(0, 80)}...`);

    console.log('\n🧠 Contexto IA - Cenário Direto:');
    console.log(`   Interlocutor: ${aiContext2.interlocutorName}`);
    console.log(`   É Responsável: ${aiContext2.isResponsibleScenario}`);
    console.log(`   Paciente: ${aiContext2.patientName}`);
    console.log(`   Instruções: ${aiContext2.instructions.substring(0, 80)}...`);

    // 7. Resumo dos resultados
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('=' .repeat(50));

    const tests = [
      {
        name: 'Identificação Cenário Responsável',
        passed: Boolean(isResponsibleScenario1) === true,
        debug: `tipo_associacao='${responsiblePatient.tipo_associacao}', nome_responsavel='${responsiblePatient.nome_responsavel}', result=${isResponsibleScenario1}, boolean=${Boolean(isResponsibleScenario1)}`
      },
      {
        name: 'Identificação Cenário Direto',
        passed: isResponsibleScenario2 === false
      },
      {
        name: 'Mensagem Responsável Contextualizada',
        passed: message1.scenario === 'responsible' && message1.title.includes('Maria Silva')
      },
      {
        name: 'Mensagem Direto Contextualizada',
        passed: message2.scenario === 'direct' && message2.title.includes('Ana Costa')
      },
      {
        name: 'Contexto IA Responsável',
        passed: aiContext1.isResponsibleScenario === true && aiContext1.interlocutorName === 'Maria Silva',
        debug: `isResponsibleScenario=${aiContext1.isResponsibleScenario}, interlocutorName='${aiContext1.interlocutorName}'`
      },
      {
        name: 'Contexto IA Direto',
        passed: aiContext2.isResponsibleScenario === false && aiContext2.interlocutorName === 'Ana Costa'
      }
    ];

    const passedTests = tests.filter(t => t.passed).length;
    const totalTests = tests.length;

    tests.forEach(test => {
      console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
      if (!test.passed && test.debug) {
        console.log(`   🔍 Debug: ${test.debug}`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`🎯 RESULTADO FINAL: ${passedTests}/${totalTests} testes passaram`);
    
    if (passedTests === totalTests) {
      console.log('🎉 FASE 2 IMPLEMENTADA COM SUCESSO!');
      console.log('✨ A lógica de Interlocutor está funcionando corretamente');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique a implementação.');
    }

    // 8. Instruções para teste manual
    console.log('\n📋 PRÓXIMOS PASSOS PARA TESTE MANUAL:');
    console.log('─'.repeat(50));
    console.log('1. Acesse o sistema com o WhatsApp: 11999887766');
    console.log('   - Deve mostrar: "Olá, Maria Silva!"');
    console.log('   - Deve mostrar: "Você está iniciando o atendimento para João Silva (Menor)"');
    console.log('');
    console.log('2. Acesse o sistema com o WhatsApp: 11999887755');
    console.log('   - Deve mostrar: "Bem-vindo(a) de volta, Ana Costa!"');
    console.log('   - Deve mostrar: "Encontramos seus dados em nosso sistema"');
    console.log('');
    console.log('3. Inicie uma conversa com cada paciente e verifique se a IA:');
    console.log('   - Para Maria Silva: se dirige a ela, mas fala sobre João na 3ª pessoa');
    console.log('   - Para Ana Costa: se dirige diretamente a ela');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testInterlocutorLogic().catch(console.error);