/**
 * Script para verificar usuários admin existentes
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    console.log('🔍 Verificando usuários admin...');
    
    // Verificar se existe tabela de usuários
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
    
    console.log(`📊 Total de usuários encontrados: ${users.length}`);
    
    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no sistema');
      return { hasUsers: false, users: [] };
    }
    
    console.log('\n👥 Usuários encontrados:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Sem nome'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tem senha: ${user.passwordHash ? '✅' : '❌'}`);
      console.log(`   Ativo: ${user.isActive ? '✅' : '❌'}`);
      console.log(`   Criado: ${user.createdAt}`);
      console.log('');
    });
    
    console.log(`🔑 Total de usuários: ${users.length}`);
    
    return { hasUsers: true, users };
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
    
    if (error.code === 'P2021') {
      console.log('ℹ️  A tabela "user" não existe no banco de dados');
      return { hasUsers: false, users: [], error: 'Tabela não existe' };
    }
    
    return { hasUsers: false, users: [], error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkAdminUsers().catch(console.error);
}

module.exports = { checkAdminUsers };