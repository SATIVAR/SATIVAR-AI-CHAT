const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Script de Verificação de Saúde do Ambiente de Desenvolvimento
 * 
 * Este script verifica:
 * 1. Conectividade com banco de dados
 * 2. Dados de teste corretos (associação "sativar")
 * 3. Variáveis de ambiente necessárias
 * 4. Estrutura de arquivos essenciais
 */

class EnvironmentHealthChecker {
  constructor() {
    this.results = {
      database: {
        connection: false,
        error: null
      },
      testData: {
        sativarExists: false,
        sativarActive: false,
        patientsCount: 0,
        error: null
      },
      environment: {
        requiredVars: [],
        missingVars: [],
        optionalVars: [],
        error: null
      },
      files: {
        essential: [],
        missing: [],
        error: null
      },
      overall: {
        healthy: false,
        errors: [],
        warnings: []
      }
    };
  }

  async checkDatabaseConnectivity() {
    console.log('🔍 1. Verificando conectividade com banco de dados...');
    
    try {
      await prisma.$connect();
      
      // Teste básico de query
      await prisma.$queryRaw`SELECT 1 as test`;
      
      this.results.database.connection = true;
      console.log('   ✅ Conexão com banco de dados estabelecida com sucesso');
      
      // Verificar se as tabelas principais existem
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_name IN ('Association', 'Patient', 'User')
      `;
      
      console.log(`   ✅ Tabelas encontradas: ${tables.length} de 3 esperadas`);
      
      if (tables.length < 3) {
        this.results.overall.warnings.push('Algumas tabelas do banco podem estar faltando');
      }
      
    } catch (error) {
      this.results.database.connection = false;
      this.results.database.error = error.message;
      this.results.overall.errors.push(`Erro de conexão com banco: ${error.message}`);
      console.log('   ❌ Falha na conexão com banco de dados:', error.message);
    }
  }

  async checkTestData() {
    console.log('\n🔍 2. Verificando dados de teste...');
    
    if (!this.results.database.connection) {
      console.log('   ⏭️  Pulando verificação (banco não conectado)');
      return;
    }

    try {
      // Verificar associação "sativar"
      const sativarAssoc = await prisma.association.findUnique({
        where: { subdomain: 'sativar' },
        include: {
          Patient: {
            where: { isActive: true },
            select: { id: true, name: true, whatsapp: true }
          }
        }
      });

      if (sativarAssoc) {
        this.results.testData.sativarExists = true;
        this.results.testData.sativarActive = sativarAssoc.isActive;
        this.results.testData.patientsCount = sativarAssoc.Patient.length;

        console.log('   ✅ Associação "sativar" encontrada:');
        console.log(`      - ID: ${sativarAssoc.id}`);
        console.log(`      - Nome: ${sativarAssoc.name}`);
        console.log(`      - Status: ${sativarAssoc.isActive ? '✅ Ativa' : '❌ Inativa'}`);
        console.log(`      - WordPress URL: ${sativarAssoc.wordpressUrl}`);
        console.log(`      - Pacientes ativos: ${sativarAssoc.Patient.length}`);

        if (!sativarAssoc.isActive) {
          this.results.overall.errors.push('Associação "sativar" existe mas não está ativa');
        }

        if (sativarAssoc.Patient.length === 0) {
          this.results.overall.warnings.push('Nenhum paciente de teste encontrado para associação "sativar"');
        }

      } else {
        this.results.testData.sativarExists = false;
        this.results.overall.errors.push('Associação "sativar" não encontrada no banco de dados');
        console.log('   ❌ Associação "sativar" NÃO encontrada!');
      }

      // Verificar total de associações
      const totalAssociations = await prisma.association.count();
      console.log(`   📊 Total de associações no banco: ${totalAssociations}`);

    } catch (error) {
      this.results.testData.error = error.message;
      this.results.overall.errors.push(`Erro ao verificar dados de teste: ${error.message}`);
      console.log('   ❌ Erro ao verificar dados de teste:', error.message);
    }
  }

  checkEnvironmentVariables() {
    console.log('\n🔍 3. Verificando variáveis de ambiente...');

    const requiredVars = [
      'DATABASE_URL'
    ];

    const optionalVars = [
      'ENCRYPTION_KEY',
      'NEXT_PUBLIC_CONTACT_WHATSAPP_NUMBER',
      'GEMINI_API_KEY'
    ];

    // Verificar variáveis obrigatórias
    const missingRequired = requiredVars.filter(varName => !process.env[varName]);
    const presentRequired = requiredVars.filter(varName => process.env[varName]);

    // Verificar variáveis opcionais
    const presentOptional = optionalVars.filter(varName => process.env[varName]);
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);

    this.results.environment.requiredVars = presentRequired;
    this.results.environment.missingVars = missingRequired;
    this.results.environment.optionalVars = presentOptional;

    console.log('   📋 Variáveis obrigatórias:');
    presentRequired.forEach(varName => {
      console.log(`      ✅ ${varName}: Definida`);
    });

    if (missingRequired.length > 0) {
      console.log('   ❌ Variáveis obrigatórias faltando:');
      missingRequired.forEach(varName => {
        console.log(`      ❌ ${varName}: Não definida`);
        this.results.overall.errors.push(`Variável obrigatória ${varName} não definida`);
      });
    }

    console.log('   📋 Variáveis opcionais:');
    presentOptional.forEach(varName => {
      console.log(`      ✅ ${varName}: Definida`);
    });

    if (missingOptional.length > 0) {
      console.log('   ⚠️  Variáveis opcionais não definidas:');
      missingOptional.forEach(varName => {
        console.log(`      ⚠️  ${varName}: Não definida`);
        this.results.overall.warnings.push(`Variável opcional ${varName} não definida`);
      });
    }
  }

  checkEssentialFiles() {
    console.log('\n🔍 4. Verificando arquivos essenciais...');

    const essentialFiles = [
      'package.json',
      'next.config.ts',
      'middleware.ts',
      'prisma/schema.prisma',
      'src/lib/middleware/tenant.ts',
      '.env'
    ];

    const essentialDirs = [
      'src/app',
      'src/components',
      'src/lib',
      'scripts'
    ];

    // Verificar arquivos
    essentialFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.results.files.essential.push(filePath);
        console.log(`   ✅ ${filePath}: Encontrado`);
      } else {
        this.results.files.missing.push(filePath);
        console.log(`   ❌ ${filePath}: Não encontrado`);
        this.results.overall.errors.push(`Arquivo essencial não encontrado: ${filePath}`);
      }
    });

    // Verificar diretórios
    essentialDirs.forEach(dirPath => {
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        console.log(`   ✅ ${dirPath}/: Encontrado`);
      } else {
        console.log(`   ❌ ${dirPath}/: Não encontrado`);
        this.results.overall.errors.push(`Diretório essencial não encontrado: ${dirPath}`);
      }
    });
  }

  generateReport() {
    console.log('\n📋 RELATÓRIO DE SAÚDE DO AMBIENTE');
    console.log('=====================================');

    // Status geral
    const hasErrors = this.results.overall.errors.length > 0;
    const hasWarnings = this.results.overall.warnings.length > 0;
    
    this.results.overall.healthy = !hasErrors;

    console.log(`\n🏥 Status Geral: ${this.results.overall.healthy ? '✅ SAUDÁVEL' : '❌ PROBLEMAS ENCONTRADOS'}`);

    // Resumo por categoria
    console.log('\n📊 Resumo por Categoria:');
    console.log(`   🗄️  Banco de Dados: ${this.results.database.connection ? '✅ Conectado' : '❌ Falha'}`);
    console.log(`   📝 Dados de Teste: ${this.results.testData.sativarExists && this.results.testData.sativarActive ? '✅ OK' : '❌ Problemas'}`);
    console.log(`   🔧 Variáveis de Ambiente: ${this.results.environment.missingVars.length === 0 ? '✅ OK' : '❌ Faltando'}`);
    console.log(`   📁 Arquivos Essenciais: ${this.results.files.missing.length === 0 ? '✅ OK' : '❌ Faltando'}`);

    // Detalhes dos dados de teste
    if (this.results.testData.sativarExists) {
      console.log('\n📋 Detalhes dos Dados de Teste:');
      console.log(`   • Associação "sativar": ${this.results.testData.sativarActive ? '✅ Ativa' : '❌ Inativa'}`);
      console.log(`   • Pacientes de teste: ${this.results.testData.patientsCount}`);
    }

    // Erros encontrados
    if (hasErrors) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      this.results.overall.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Avisos
    if (hasWarnings) {
      console.log('\n⚠️  AVISOS:');
      this.results.overall.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    
    if (!this.results.database.connection) {
      console.log('   🔧 Execute: Verifique a variável DATABASE_URL e conectividade');
    }
    
    if (!this.results.testData.sativarExists || !this.results.testData.sativarActive) {
      console.log('   🔧 Execute: npm run seed:test');
    }
    
    if (this.results.environment.missingVars.length > 0) {
      console.log('   🔧 Configure as variáveis de ambiente faltando no arquivo .env');
    }
    
    if (this.results.files.missing.length > 0) {
      console.log('   🔧 Verifique se todos os arquivos do projeto estão presentes');
    }

    if (this.results.overall.healthy) {
      console.log('\n🎉 Ambiente está saudável e pronto para desenvolvimento!');
      console.log('💡 URLs para teste:');
      console.log('   • http://localhost:9002/ (Hero Section)');
      console.log('   • http://localhost:9002/sativar (Página da associação)');
    }

    console.log('\n=====================================');
    
    return this.results;
  }

  async run() {
    console.log('🚀 Iniciando Verificação de Saúde do Ambiente - SatiZap\n');

    try {
      await this.checkDatabaseConnectivity();
      await this.checkTestData();
      this.checkEnvironmentVariables();
      this.checkEssentialFiles();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Erro fatal durante verificação:', error.message);
      this.results.overall.errors.push(`Erro fatal: ${error.message}`);
      this.results.overall.healthy = false;
      return this.results;
      
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Execute apenas se chamado diretamente
if (require.main === module) {
  const checker = new EnvironmentHealthChecker();
  
  checker.run()
    .then(results => {
      const exitCode = results.overall.healthy ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { EnvironmentHealthChecker };