/**
 * Script para criar usuário super admin
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Criando usuário super admin...');
    
    const adminEmail = 'admin@sativar.com.br';
    const adminPassword = 'admin123';
    
    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingUser) {
      console.log('✅ Usuário super admin já existe!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log('🔑 Senha: admin123');
      return { success: true, existing: true };
    }
    
    // Criar hash da senha
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        name: 'Super Admin'
      }
    });
    
    console.log('✅ Usuário super admin criado com sucesso!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log('🔑 Senha: admin123');
    console.log(`🆔 ID: ${newUser.id}`);
    console.log(`👤 Nome: ${newUser.name}`);
    
    return { success: true, user: newUser };
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário super admin:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createSuperAdmin().catch(console.error);
}

module.exports = { createSuperAdmin };