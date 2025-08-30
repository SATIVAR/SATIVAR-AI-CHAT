const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseHealth() {
  console.log('🏥 Verificação de Saúde do Banco de Dados - SatiZap\n');

  const results = {
    connection: false,
    associations: 0,
    sativarExists: false,
    sativarActive: false,
    patients: 0,
    errors: []
  };

  try {
    // 1. Teste de conexão
    console.log('1️⃣ Testando conexão com banco de dados...');
    await prisma.$connect();
    results.connection = true;
    console.log('   ✅ Conexão estabelecida com sucesso\n');

    // 2. Verificar associações
    console.log('2️⃣ Verificando associações...');
    const associations = await prisma.association.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        isActive: true,
        createdAt: true
      }
    });
    
    results.associations = associations.length;
    console.log(`   📊 Total de associações: ${associations.length}`);
    
    if (associations.length > 0) {
      console.log('   📋 Lista de associações:');
      associations.forEach(assoc => {
        const status = assoc.isActive ? '✅ Ativa' : '❌ Inativa';
        console.log(`     • ${assoc.name} (${assoc.subdomain}) - ${status}`);
      });
    }
    console.log();

    // 3. Verificar associação "sativar" especificamente
    console.log('3️⃣ Verificando associação "sativar"...');
    const sativarAssoc = await prisma.association.findUnique({
      where: { subdomain: 'sativar' },
      include: {
        Patient: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            isActive: true
          },
          take: 10
        }
      }
    });

    if (sativarAssoc) {
      results.sativarExists = true;
      results.sativarActive = sativarAssoc.isActive;
      results.patients = sativarAssoc.Patient.length;

      console.log('   ✅ Associação "sativar" encontrada:');
      console.log(`     - ID: ${sativarAssoc.id}`);
      console.log(`     - Nome: ${sativarAssoc.name}`);
      console.log(`     - Status: ${sativarAssoc.isActive ? '✅ Ativa' : '❌ Inativa'}`);
      console.log(`     - WordPress URL: ${sativarAssoc.wordpressUrl}`);
      console.log(`     - Pacientes: ${sativarAssoc.Patient.length}`);
      
      if (sativarAssoc.Patient.length > 0) {
        console.log('     - Lista de pacientes:');
        sativarAssoc.Patient.forEach(patient => {
          const status = patient.isActive ? '✅' : '❌';
          console.log(`       ${status} ${patient.name} (${patient.whatsapp})`);
        });
      }
    } else {
      results.sativarExists = false;
      console.log('   ❌ Associação "sativar" NÃO encontrada!');
      results.errors.push('Associação "sativar" não existe no banco de dados');
    }
    console.log();

    // 4. Verificar variáveis de ambiente
    console.log('4️⃣ Verificando variáveis de ambiente...');
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length === 0) {
      console.log('   ✅ Todas as variáveis de ambiente necessárias estão definidas');
    } else {
      console.log('   ❌ Variáveis de ambiente faltando:');
      missingEnvVars.forEach(varName => {
        console.log(`     • ${varName}`);
        results.errors.push(`Variável de ambiente ${varName} não definida`);
      });
    }
    console.log();

    // 5. Resumo final
    console.log('📋 RESUMO DA VERIFICAÇÃO:');
    console.log(`   Conexão com banco: ${results.connection ? '✅' : '❌'}`);
    console.log(`   Total de associações: ${results.associations}`);
    console.log(`   Associação "sativar" existe: ${results.sativarExists ? '✅' : '❌'}`);
    console.log(`   Associação "sativar" ativa: ${results.sativarActive ? '✅' : '❌'}`);
    console.log(`   Pacientes da "sativar": ${results.patients}`);

    if (results.errors.length > 0) {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('\n💡 Execute o script de seed para corrigir: npm run seed:test');
    } else {
      console.log('\n🎉 Banco de dados está saudável e pronto para desenvolvimento!');
    }

  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
    results.errors.push(`Erro de conexão: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }

  return results;
}

// Execute apenas se chamado diretamente
if (require.main === module) {
  checkDatabaseHealth()
    .then(results => {
      const hasErrors = results.errors.length > 0 || !results.sativarExists || !results.sativarActive;
      process.exit(hasErrors ? 1 : 0);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseHealth };