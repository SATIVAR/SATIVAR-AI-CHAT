#!/usr/bin/env node

/**
 * Test script to debug association lookup directly
 */

const { PrismaClient } = require('@prisma/client');

async function testAssociationLookup() {
  console.log('🔍 Testando busca de associação diretamente no banco...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test direct Prisma query
    console.log('1️⃣ Testando query direta no Prisma:');
    const directResult = await prisma.association.findUnique({
      where: { subdomain: 'sativar' }
    });
    
    console.log('   Resultado da query direta:');
    if (directResult) {
      console.log('   ✅ Associação encontrada:');
      console.log(`      ID: ${directResult.id}`);
      console.log(`      Nome: ${directResult.name}`);
      console.log(`      Subdomain: ${directResult.subdomain}`);
      console.log(`      Ativa: ${directResult.isActive}`);
      console.log(`      WordPress URL: ${directResult.wordpressUrl}`);
    } else {
      console.log('   ❌ Associação NÃO encontrada');
    }
    console.log('');
    
    // Test case sensitivity
    console.log('2️⃣ Testando sensibilidade a maiúsculas/minúsculas:');
    const testCases = ['sativar', 'SATIVAR', 'Sativar', 'SatiVar'];
    
    for (const testCase of testCases) {
      const result = await prisma.association.findUnique({
        where: { subdomain: testCase }
      });
      console.log(`   "${testCase}": ${result ? '✅ Encontrado' : '❌ Não encontrado'}`);
    }
    console.log('');
    
    // List all associations
    console.log('3️⃣ Listando todas as associações no banco:');
    const allAssociations = await prisma.association.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        isActive: true
      }
    });
    
    console.log(`   Total de associações: ${allAssociations.length}`);
    allAssociations.forEach((assoc, index) => {
      console.log(`   ${index + 1}. "${assoc.name}" (subdomain: "${assoc.subdomain}") - ${assoc.isActive ? 'Ativa' : 'Inativa'}`);
    });
    console.log('');
    
    // Test the service function
    console.log('4️⃣ Testando função do serviço getAssociationBySubdomain:');
    try {
      // Import the service function
      const path = require('path');
      const projectRoot = process.cwd();
      
      // We need to use dynamic import for ES modules
      const { getAssociationBySubdomain } = await import(path.join(projectRoot, 'src/lib/services/association.service.ts'));
      
      const serviceResult = await getAssociationBySubdomain('sativar');
      
      if (serviceResult) {
        console.log('   ✅ Serviço encontrou a associação:');
        console.log(`      ID: ${serviceResult.id}`);
        console.log(`      Nome: ${serviceResult.name}`);
        console.log(`      Subdomain: ${serviceResult.subdomain}`);
        console.log(`      Ativa: ${serviceResult.isActive}`);
      } else {
        console.log('   ❌ Serviço NÃO encontrou a associação');
      }
    } catch (serviceError) {
      console.log('   ❌ Erro ao testar serviço:');
      console.log(`      ${serviceError.message}`);
      console.log('   💡 Isso pode ser normal devido ao ambiente de teste');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAssociationLookup().catch(console.error);