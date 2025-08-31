/**
 * Script para listar associações no banco de dados
 */

const { PrismaClient } = require('@prisma/client');

async function listAssociations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Listando associações no banco...');
    
    const associations = await prisma.association.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        wordpressUrl: true,
        isActive: true,
        wordpressAuth: true,
        apiConfig: true
      }
    });
    
    if (associations.length === 0) {
      console.log('❌ Nenhuma associação encontrada');
      return;
    }
    
    console.log(`✅ ${associations.length} associação(ões) encontrada(s):\n`);
    
    associations.forEach((assoc, index) => {
      console.log(`${index + 1}. ${assoc.name}`);
      console.log(`   ID: ${assoc.id}`);
      console.log(`   Subdomain: ${assoc.subdomain}`);
      console.log(`   WordPress URL: ${assoc.wordpressUrl}`);
      console.log(`   Ativa: ${assoc.isActive ? 'Sim' : 'Não'}`);
      console.log(`   WordPress Auth: ${assoc.wordpressAuth ? 'Configurado' : 'Não configurado'}`);
      console.log(`   API Config: ${assoc.apiConfig ? 'Configurado' : 'Não configurado'}`);
      console.log('');
    });
    
    // Retornar a primeira associação ativa para uso no diagnóstico
    const activeAssoc = associations.find(a => a.isActive);
    if (activeAssoc) {
      console.log(`🎯 Associação ativa para diagnóstico: ${activeAssoc.name} (${activeAssoc.subdomain})`);
      return activeAssoc;
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar associações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  listAssociations();
}

module.exports = { listAssociations };