#!/usr/bin/env node

/**
 * Script para verificar os dados de exibição pública da associação SATIVAR
 */

const { PrismaClient } = require('@prisma/client');

async function checkSativarDisplayData() {
  console.log('🔍 Verificando dados de exibição pública da SATIVAR...\n');
  
  const prisma = new PrismaClient();
  
  try {
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
        descricaoPublica: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!association) {
      console.log('❌ Associação SATIVAR não encontrada');
      return;
    }
    
    console.log('✅ Associação SATIVAR encontrada:');
    console.log(`   ID: ${association.id}`);
    console.log(`   Nome: ${association.name}`);
    console.log(`   Subdomain: ${association.subdomain}`);
    console.log(`   Ativa: ${association.isActive}`);
    console.log('');
    
    console.log('📋 Campos de Exibição Pública:');
    console.log(`   publicDisplayName: ${association.publicDisplayName || '❌ NÃO DEFINIDO'}`);
    console.log(`   logoUrl: ${association.logoUrl || '❌ NÃO DEFINIDO'}`);
    console.log(`   welcomeMessage: ${association.welcomeMessage || '❌ NÃO DEFINIDO'}`);
    console.log(`   descricaoPublica: ${association.descricaoPublica || '❌ NÃO DEFINIDO'}`);
    console.log('');
    
    console.log('📅 Datas:');
    console.log(`   Criado em: ${association.createdAt}`);
    console.log(`   Atualizado em: ${association.updatedAt}`);
    
    // Diagnóstico do problema
    console.log('\n🔧 DIAGNÓSTICO DO PROBLEMA:');
    
    const missingFields = [];
    if (!association.publicDisplayName) missingFields.push('publicDisplayName');
    if (!association.logoUrl) missingFields.push('logoUrl');
    if (!association.welcomeMessage) missingFields.push('welcomeMessage');
    
    if (missingFields.length > 0) {
      console.log('❌ PROBLEMA IDENTIFICADO:');
      console.log(`   Os seguintes campos estão vazios: ${missingFields.join(', ')}`);
      console.log('   Isso explica por que o card está mostrando dados genéricos do SatiZap');
      console.log('   em vez dos dados específicos da SATIVAR.');
      console.log('');
      console.log('💡 SOLUÇÃO:');
      console.log('   1. Preencher os campos de exibição pública da associação SATIVAR');
      console.log('   2. Ou ajustar o código para usar fallbacks apropriados');
    } else {
      console.log('✅ Todos os campos de exibição pública estão preenchidos');
      console.log('   O problema pode estar na lógica de carregamento dos dados');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a verificação
checkSativarDisplayData().catch(console.error);