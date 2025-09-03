#!/usr/bin/env node

/**
 * Script para criar usuário de teste no WordPress com dados ACF completos
 * para validar a correção da Fase 1
 */

const { PrismaClient } = require('@prisma/client');

async function createTestUserInSatiZap() {
  console.log('🔧 CRIANDO USUÁRIO DE TESTE PARA VALIDAR CORREÇÃO FASE 1');
  console.log('======================================================');
  
  const prisma = new PrismaClient();
  
  try {
    // Buscar associação
    const association = await prisma.association.findFirst({
      where: { subdomain: 'sativar' }
    });
    
    if (!association) {
      console.log('❌ Associação não encontrada');
      return;
    }
    
    console.log(`✅ Associação: ${association.name}`);
    
    // Dados do usuário de teste com ACF completo
    const testUserData = {
      id: 'test-user-fase1-' + Date.now(),
      name: 'HENRIQUE GUERRA TESTE',
      whatsapp: '85996201636',
      email: 'henrique.teste@sativar.com.br',
      cpf: '12345678901',
      tipo_associacao: 'assoc_respon', // Tipo responsável para testar cenário
      nome_responsavel: 'CAROLINA GUERRA',
      cpf_responsavel: '98765432100',
      status: 'MEMBRO',
      wordpress_id: '999',
      associationId: association.id
    };
    
    // Verificar se já existe
    const existingPatient = await prisma.patient.findFirst({
      where: {
        whatsapp: testUserData.whatsapp,
        associationId: association.id
      }
    });
    
    if (existingPatient) {
      console.log('⚠️ Usuário de teste já existe, atualizando...');
      
      const updatedPatient = await prisma.patient.update({
        where: { id: existingPatient.id },
        data: {
          name: testUserData.name,
          email: testUserData.email,
          cpf: testUserData.cpf,
          tipo_associacao: testUserData.tipo_associacao,
          nome_responsavel: testUserData.nome_responsavel,
          cpf_responsavel: testUserData.cpf_responsavel,
          status: testUserData.status,
          wordpress_id: testUserData.wordpress_id,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Usuário de teste atualizado:');
      console.log(`   ID: ${updatedPatient.id}`);
      console.log(`   Nome: ${updatedPatient.name}`);
      console.log(`   WhatsApp: ${updatedPatient.whatsapp}`);
      console.log(`   Tipo Associação: ${updatedPatient.tipo_associacao}`);
      console.log(`   Nome Responsável: ${updatedPatient.nome_responsavel}`);
      
    } else {
      console.log('📝 Criando novo usuário de teste...');
      
      const newPatient = await prisma.patient.create({
        data: testUserData
      });
      
      console.log('✅ Usuário de teste criado:');
      console.log(`   ID: ${newPatient.id}`);
      console.log(`   Nome: ${newPatient.name}`);
      console.log(`   WhatsApp: ${newPatient.whatsapp}`);
      console.log(`   Tipo Associação: ${newPatient.tipo_associacao}`);
      console.log(`   Nome Responsável: ${newPatient.nome_responsavel}`);
    }
    
    console.log();
    console.log('🎯 USUÁRIO DE TESTE CONFIGURADO PARA VALIDAR:');
    console.log('   ✅ Sincronização de dados ACF');
    console.log('   ✅ Cenário de responsável (assoc_respon)');
    console.log('   ✅ Dados completos para Fase 2');
    console.log();
    console.log('📋 Para testar, use:');
    console.log(`   WhatsApp: ${testUserData.whatsapp}`);
    console.log('   Execute: node scripts/test-fase1-correction.js');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createTestUserInSatiZap().catch(console.error);
}

module.exports = { createTestUserInSatiZap };