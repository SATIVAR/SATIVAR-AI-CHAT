/**
 * Script para verificar todos os usuários (User e Owner)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllUsers() {
  try {
    console.log('🔍 Verificando todos os usuários...');
    
    // Verificar tabela User
    console.log('\n📋 Tabela User:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Total de usuários User: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Sem nome'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tem senha: ${user.passwordHash ? '✅' : '❌'}`);
      console.log(`   Ativo: ${user.isActive ? '✅' : '❌'}`);
      console.log('');
    });
    
    // Verificar tabela Owner
    console.log('\n📋 Tabela Owner:');
    const owners = await prisma.owner.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
        Association: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📊 Total de usuários Owner: ${owners.length}`);
    owners.forEach((owner, index) => {
      console.log(`${index + 1}. ${owner.name || 'Sem nome'}`);
      console.log(`   Email: ${owner.email}`);
      console.log(`   Tem senha: ${owner.passwordHash ? '✅' : '❌'}`);
      console.log(`   Associação: ${owner.Association?.name || 'N/A'}`);
      console.log('');
    });
    
    return { users, owners };
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
    return { users: [], owners: [], error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkAllUsers().catch(console.error);
}

module.exports = { checkAllUsers };