#!/usr/bin/env node

/**
 * Script para simular uma resposta do WordPress com dados ACF completos
 * e testar a função de sincronização diretamente
 */

const { PrismaClient } = require('@prisma/client');

// Simular dados do WordPress com ACF completo
const mockWordPressResponse = {
  id: 999,
  name: 'HENRIQUE GUERRA TESTE',
  username: 'henrique_teste',
  first_name: 'HENRIQUE',
  last_name: 'GUERRA TESTE',
  email: 'henrique.teste@sativar.com.br',
  acf: {
    nome_completo: 'HENRIQUE GUERRA TESTE',
    telefone: '85996201636',
    cpf: '12345678901',
    tipo_associacao: 'assoc_respon',
    nome_responsavel: 'CAROLINA GUERRA',
    nome_completo_responc: 'CAROLINA GUERRA SILVA',
    cpf_responsavel: '98765432100',
    rg: '1234567',
    data_nascimento: '1990-01-01',
    genero: 'masculino',
    profissao: 'desenvolvedor',
    plano_escolhas: 'sim',
    plano_saude: 'Unimed',
    endereco: 'Rua das Flores, 123',
    numero: '123',
    complemento: 'Apt 45',
    cep: '60000000',
    bairro: 'Centro',
    cidade: 'Fortaleza',
    estado: 'CE',
    email: 'henrique.teste@sativar.com.br',
    associado: true,
    associado_ativado: true,
    observacoes: 'Usuário de teste para validar Fase 1',
    concorda: 'concorda'
  }
};

async function simulateWordPressSync() {
  console.log('🧪 SIMULAÇÃO: Sincronização com dados WordPress ACF completos');
  console.log('============================================================');
  
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
    console.log();
    
    // Importar e executar a função de sincronização
    console.log('📋 Dados simulados do WordPress:');
    console.log(`   ID: ${mockWordPressResponse.id}`);
    console.log(`   Nome: ${mockWordPressResponse.name}`);
    console.log(`   Email: ${mockWordPressResponse.email}`);
    console.log(`   Campos ACF: ${Object.keys(mockWordPressResponse.acf).length}`);
    console.log();
    
    console.log('🎯 Campos ACF críticos:');
    console.log(`   telefone: ${mockWordPressResponse.acf.telefone}`);
    console.log(`   nome_completo: ${mockWordPressResponse.acf.nome_completo}`);
    console.log(`   cpf: ${mockWordPressResponse.acf.cpf}`);
    console.log(`   tipo_associacao: ${mockWordPressResponse.acf.tipo_associacao}`);
    console.log(`   nome_responsavel: ${mockWordPressResponse.acf.nome_responsavel}`);
    console.log(`   cpf_responsavel: ${mockWordPressResponse.acf.cpf_responsavel}`);
    console.log();
    
    // Importar a função de sincronização
    const { syncPatientWithWordPressACF } = require('../src/lib/services/patient.service');
    
    console.log('🔄 Executando sincronização...');
    const syncResult = await syncPatientWithWordPressACF(
      mockWordPressResponse.acf.telefone,
      mockWordPressResponse,
      association.id
    );
    
    console.log();
    console.log('📊 RESULTADO DA SINCRONIZAÇÃO:');
    console.log(`   Sucesso: ${syncResult.success}`);
    
    if (syncResult.success && syncResult.data) {
      console.log('✅ DADOS SINCRONIZADOS:');
      console.log(`   ID: ${syncResult.data.id}`);
      console.log(`   Nome: ${syncResult.data.name}`);
      console.log(`   WhatsApp: ${syncResult.data.whatsapp}`);
      console.log(`   Status: ${syncResult.data.status}`);
      console.log(`   WordPress ID: ${syncResult.data.wordpress_id}`);
      console.log();
      console.log('🎯 DADOS ACF SINCRONIZADOS:');
      console.log(`   CPF: ${syncResult.data.cpf || 'NULL'}`);
      console.log(`   Tipo Associação: ${syncResult.data.tipo_associacao || 'NULL'}`);
      console.log(`   Nome Responsável: ${syncResult.data.nome_responsavel || 'NULL'}`);
      console.log(`   CPF Responsável: ${syncResult.data.cpf_responsavel || 'NULL'}`);
      console.log();
      
      // Validar se a correção funcionou
      const hasACFData = syncResult.data.cpf || 
                        syncResult.data.tipo_associacao || 
                        syncResult.data.nome_responsavel || 
                        syncResult.data.cpf_responsavel;
      
      if (hasACFData) {
        console.log('🎉 CORREÇÃO FASE 1: SUCESSO!');
        console.log('   ✅ Dados ACF foram sincronizados corretamente');
        console.log('   ✅ Bug de mapeamento foi corrigido');
        console.log('   ✅ Pronto para implementar Fase 2');
      } else {
        console.log('❌ CORREÇÃO FASE 1: FALHOU!');
        console.log('   ❌ Dados ACF ainda estão NULL');
        console.log('   ❌ Bug de mapeamento persiste');
      }
      
    } else {
      console.log('❌ ERRO na sincronização:');
      console.log(`   ${syncResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Erro na simulação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  simulateWordPressSync().catch(console.error);
}

module.exports = { simulateWordPressSync, mockWordPressResponse };