#!/usr/bin/env node

/**
 * Quick Health Check Script
 * 
 * Script rápido para verificar se o ambiente está pronto para desenvolvimento.
 * Executa verificações essenciais e fornece feedback imediato.
 */

const { EnvironmentHealthChecker } = require('./verify-environment-health');

async function quickCheck() {
  console.log('⚡ Quick Health Check - SatiZap\n');
  
  const checker = new EnvironmentHealthChecker();
  
  try {
    // Executar apenas verificações críticas
    await checker.checkDatabaseConnectivity();
    await checker.checkTestData();
    
    const dbOk = checker.results.database.connection;
    const dataOk = checker.results.testData.sativarExists && checker.results.testData.sativarActive;
    
    console.log('\n⚡ RESULTADO RÁPIDO:');
    console.log(`   🗄️  Banco: ${dbOk ? '✅' : '❌'}`);
    console.log(`   📝 Dados: ${dataOk ? '✅' : '❌'}`);
    
    if (dbOk && dataOk) {
      console.log('\n🎉 Tudo pronto! Você pode iniciar o desenvolvimento.');
      console.log('💡 Execute: npm run dev');
      return true;
    } else {
      console.log('\n⚠️  Problemas encontrados.');
      console.log('💡 Execute: npm run env:health (para diagnóstico completo)');
      console.log('💡 Execute: npm run dev:setup (para corrigir automaticamente)');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante verificação:', error.message);
    console.log('💡 Execute: npm run env:health (para diagnóstico completo)');
    return false;
  }
}

// Execute apenas se chamado diretamente
if (require.main === module) {
  quickCheck()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { quickCheck };