const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabaseConnection() {
  console.log('🔍 Verificando conexão com banco de dados...');
  try {
    await prisma.$connect();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error.message);
    return false;
  }
}

async function verifyAssociationData() {
  console.log('\n🔍 Verificando dados da associação "sativar"...');
  
  try {
    const association = await prisma.association.findUnique({
      where: { subdomain: 'sativar' }
    });

    if (!association) {
      console.log('⚠️  Associação "sativar" não encontrada no banco de dados');
      return null;
    }

    console.log('✅ Associação "sativar" encontrada:');
    console.log(`   - ID: ${association.id}`);
    console.log(`   - Nome: ${association.name}`);
    console.log(`   - Subdomain: ${association.subdomain}`);
    console.log(`   - Ativa: ${association.isActive ? '✅ Sim' : '❌ Não'}`);
    console.log(`   - WordPress URL: ${association.wordpressUrl}`);
    console.log(`   - Criada em: ${association.createdAt}`);

    if (!association.isActive) {
      console.log('⚠️  ATENÇÃO: Associação existe mas não está ativa!');
    }

    return association;
  } catch (error) {
    console.error('❌ Erro ao verificar associação:', error.message);
    return null;
  }
}

async function createOrUpdateAssociation() {
  console.log('\n🔧 Criando/atualizando associação "sativar"...');
  
  try {
    const associationData = {
      name: 'Associação Sativar',
      subdomain: 'sativar',
      wordpressUrl: 'https://sativar.com.br',
      wordpressUrlDev: 'https://dev.sativar.com.br',
      wordpressAuth: JSON.stringify({
        apiKey: 'test-api-key',
        username: 'test-user',
        password: 'test-password'
      }),
      publicDisplayName: 'Sativar',
      logoUrl: 'https://sativar.com.br/wp-content/uploads/2023/logo.png',
      welcomeMessage: 'Bem-vindo à Sativar! Estamos aqui para cuidar da sua saúde com carinho e dedicação.',
      isActive: true
    };

    const association = await prisma.association.upsert({
      where: { subdomain: 'sativar' },
      update: {
        ...associationData,
        updatedAt: new Date()
      },
      create: associationData
    });

    console.log('✅ Associação "sativar" criada/atualizada com sucesso:');
    console.log(`   - ID: ${association.id}`);
    console.log(`   - Nome: ${association.name}`);
    console.log(`   - Ativa: ${association.isActive ? '✅ Sim' : '❌ Não'}`);

    return association;
  } catch (error) {
    console.error('❌ Erro ao criar/atualizar associação:', error.message);
    throw error;
  }
}

async function createTestPatient(associationId) {
  console.log('\n👤 Verificando/criando paciente de teste...');
  
  try {
    const existingPatient = await prisma.patient.findUnique({
      where: { whatsapp: '11987654321' }
    });

    if (existingPatient) {
      console.log('✅ Paciente de teste já existe:', existingPatient.name);
      return existingPatient;
    }

    const patient = await prisma.patient.create({
      data: {
        id: 'test-patient-sativar-1',
        name: 'João Silva',
        whatsapp: '11987654321',
        email: 'joao.silva@test.com',
        associationId: associationId,
        isActive: true
      }
    });

    console.log('✅ Paciente de teste criado:', patient.name);
    return patient;
  } catch (error) {
    console.error('❌ Erro ao criar paciente de teste:', error.message);
    // Não falha o processo se não conseguir criar o paciente
    return null;
  }
}

async function verifyFinalState() {
  console.log('\n🔍 Verificação final dos dados...');
  
  try {
    const association = await prisma.association.findUnique({
      where: { subdomain: 'sativar' },
      include: {
        Patient: {
          take: 5 // Apenas os primeiros 5 pacientes
        }
      }
    });

    if (!association) {
      console.log('❌ ERRO: Associação não encontrada após criação!');
      return false;
    }

    console.log('✅ Estado final da associação "sativar":');
    console.log(`   - ID: ${association.id}`);
    console.log(`   - Nome: ${association.name}`);
    console.log(`   - Subdomain: ${association.subdomain}`);
    console.log(`   - Ativa: ${association.isActive ? '✅ Sim' : '❌ Não'}`);
    console.log(`   - Pacientes associados: ${association.Patient.length}`);
    
    if (association.Patient.length > 0) {
      console.log('   - Pacientes:');
      association.Patient.forEach(patient => {
        console.log(`     • ${patient.name} (${patient.whatsapp})`);
      });
    }

    if (!association.isActive) {
      console.log('❌ ERRO: Associação não está ativa!');
      return false;
    }

    console.log('\n✅ Todos os dados de teste estão corretos e prontos para desenvolvimento!');
    return true;
  } catch (error) {
    console.error('❌ Erro na verificação final:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando verificação e correção dos dados de teste...\n');

  try {
    // 1. Verificar conexão com banco
    const connected = await verifyDatabaseConnection();
    if (!connected) {
      process.exit(1);
    }

    // 2. Verificar se associação existe e está correta
    const existingAssociation = await verifyAssociationData();

    // 3. Criar ou atualizar associação se necessário
    let association;
    if (!existingAssociation || !existingAssociation.isActive) {
      association = await createOrUpdateAssociation();
    } else {
      association = existingAssociation;
      console.log('\n✅ Associação "sativar" já está correta, nenhuma alteração necessária');
    }

    // 4. Criar paciente de teste se necessário
    await createTestPatient(association.id);

    // 5. Verificação final
    const success = await verifyFinalState();

    if (success) {
      console.log('\n🎉 Processo concluído com sucesso!');
      console.log('💡 Agora você pode testar as URLs:');
      console.log('   - http://localhost:9002/ (Hero Section)');
      console.log('   - http://localhost:9002/sativar (Página da associação)');
    } else {
      console.log('\n❌ Processo concluído com erros. Verifique os logs acima.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Erro fatal durante execução:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexão com banco de dados encerrada');
  }
}

// Execute apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  verifyDatabaseConnection,
  verifyAssociationData,
  createOrUpdateAssociation,
  verifyFinalState
};