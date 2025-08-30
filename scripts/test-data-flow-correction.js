#!/usr/bin/env node

/**
 * Script para testar a correção do fluxo de dados da Fase 1
 */

const { PrismaClient } = require('@prisma/client');

async function testDataFlowCorrection() {
  console.log('🔧 Testando correção do fluxo de dados - Fase 1...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Verificar se os dados da SATIVAR estão corretos
    console.log('1️⃣ Verificando dados da associação SATIVAR:');
    const association = await prisma.association.findUnique({
      where: { subdomain: 'sativar' },
      select: {
        id: true,
        name: true,
        subdomain: true,
        isActive: true,
        publicDisplayName: true,
        logoUrl: true,
        welcomeMessage: true,
        descricaoPublica: true
      }
    });
    
    if (!association) {
      console.log('❌ Associação SATIVAR não encontrada');
      return;
    }
    
    console.log('✅ Dados da associação SATIVAR:');
    console.log(`   Nome: ${association.name}`);
    console.log(`   Nome de Exibição: ${association.publicDisplayName}`);
    console.log(`   Logo URL: ${association.logoUrl}`);
    console.log(`   Mensagem de Boas-vindas: ${association.welcomeMessage}`);
    console.log('');
    
    // 2. Simular o fluxo de dados corrigido
    console.log('2️⃣ Simulando fluxo de dados corrigido:');
    
    // Simular dados que seriam retornados pela API tenant-info
    const apiResponse = {
      association: {
        id: association.id,
        name: association.name,
        subdomain: association.subdomain,
        isActive: association.isActive,
        publicDisplayName: association.publicDisplayName,
        logoUrl: association.logoUrl,
        welcomeMessage: association.welcomeMessage,
        descricaoPublica: association.descricaoPublica,
      }
    };
    
    console.log('✅ Dados que seriam passados para PatientOnboarding:');
    console.log(`   associationData.name: ${apiResponse.association.name}`);
    console.log(`   associationData.publicDisplayName: ${apiResponse.association.publicDisplayName}`);
    console.log(`   associationData.logoUrl: ${apiResponse.association.logoUrl}`);
    console.log(`   associationData.welcomeMessage: ${apiResponse.association.welcomeMessage}`);
    console.log('');
    
    // 3. Simular lógica do componente PatientOnboarding
    console.log('3️⃣ Simulando lógica do componente PatientOnboarding:');
    
    const displayName = apiResponse.association.publicDisplayName || apiResponse.association.name || 'SatiZap';
    const welcomeMessage = apiResponse.association.welcomeMessage || 
      'Para começar, precisamos de algumas informações para dar início ao seu atendimento de forma segura e personalizada.';
    const hasCustomLogo = !!apiResponse.association.logoUrl;
    
    console.log('✅ Valores calculados no componente:');
    console.log(`   displayName: ${displayName}`);
    console.log(`   welcomeMessage: ${welcomeMessage}`);
    console.log(`   hasCustomLogo: ${hasCustomLogo}`);
    console.log('');
    
    // 4. Simular dados passados para AssociationCard
    console.log('4️⃣ Simulando dados passados para AssociationCard:');
    
    const associationCardData = {
      name: displayName,
      logoUrl: apiResponse.association.logoUrl,
      welcomeMessage: apiResponse.association.welcomeMessage
    };
    
    console.log('✅ Props do AssociationCard:');
    console.log(`   name: ${associationCardData.name}`);
    console.log(`   logoUrl: ${associationCardData.logoUrl}`);
    console.log(`   welcomeMessage: ${associationCardData.welcomeMessage}`);
    console.log('');
    
    // 5. Verificar se a correção resolve o problema
    console.log('5️⃣ Verificação da correção:');
    
    if (displayName === 'SATIVAR' && hasCustomLogo && welcomeMessage.includes('SATIVAR')) {
      console.log('✅ CORREÇÃO BEM-SUCEDIDA!');
      console.log('   O card agora deve exibir:');
      console.log(`   - Nome: ${displayName} (não mais "SatiZap")`);
      console.log(`   - Logo: Logo personalizada da SATIVAR`);
      console.log(`   - Mensagem: Mensagem personalizada da SATIVAR`);
    } else {
      console.log('❌ Ainda há problemas na correção');
      console.log('   Verifique os dados e a lógica implementada');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testDataFlowCorrection().catch(console.error);