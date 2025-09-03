/**
 * Script para atualizar usuário admin com nome
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminUser() {
  try {
    console.log('🔧 Atualizando usuário admin...');
    
    const adminEmail = 'admin@sativar.com.br';
    
    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: 'Super Admin'
      }
    });
    
    console.log('✅ Usuário admin atualizado com sucesso!');
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`👤 Nome: ${updatedUser.name}`);
    console.log(`🆔 ID: ${updatedUser.id}`);
    
    return { success: true, user: updatedUser };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário admin:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updateAdminUser().catch(console.error);
}

module.exports = { updateAdminUser };