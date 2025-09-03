#!/usr/bin/env node

/**
 * Script para validar se as correções da Fase 1 foram aplicadas corretamente
 */

const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    console.error(`❌ Erro ao ler arquivo ${filePath}:`, error.message);
    return null;
  }
}

function validateCorrections() {
  console.log('🔍 VALIDAÇÃO DAS CORREÇÕES FASE 1');
  console.log('=================================');
  console.log();
  
  const corrections = [
    {
      name: 'WordPress API Service - normalizeWordPressUser',
      file: 'src/lib/services/wordpress-api.service.ts',
      checks: [
        {
          description: 'Logging detalhado adicionado',
          pattern: /\[FASE 1 - CORREÇÃO\] Normalizando dados do WordPress/,
          required: true
        },
        {
          description: 'Preservação dos dados ACF',
          pattern: /const acfData = userData\.acf \|\| \{\};/,
          required: true
        },
        {
          description: 'Logging dos dados ACF preservados',
          pattern: /\[FASE 1 - CORREÇÃO\] Dados ACF preservados/,
          required: true
        }
      ]
    },
    {
      name: 'Patient Service - syncPatientWithWordPressACF',
      file: 'src/lib/services/patient.service.ts',
      checks: [
        {
          description: 'Logging detalhado da correção',
          pattern: /\[Patient Service\] FASE 1 - CORREÇÃO: Syncing patient/,
          required: true
        },
        {
          description: 'Verificação detalhada dos dados ACF',
          pattern: /\[Patient Service\] FASE 1 - CORREÇÃO: Dados ACF detalhados recebidos/,
          required: true
        },
        {
          description: 'Mapeamento de nome_completo_responc',
          pattern: /nome_responsavel: acfData\.nome_responsavel \|\| acfData\.nome_completo_responc/,
          required: true
        }
      ]
    },
    {
      name: 'API Route - validate-whatsapp-simple',
      file: 'src/app/api/patients/validate-whatsapp-simple/route.ts',
      checks: [
        {
          description: 'Logging da correção na API',
          pattern: /\[API\] FASE 1 - CORREÇÃO: Paciente encontrado no WordPress/,
          required: true
        },
        {
          description: 'Logging dos dados ACF recebidos',
          pattern: /\[API\] FASE 1 - CORREÇÃO: Dados ACF recebidos do WordPress/,
          required: true
        }
      ]
    }
  ];
  
  let allCorrectionsApplied = true;
  
  for (const correction of corrections) {
    console.log(`📋 Validando: ${correction.name}`);
    
    const fileContent = readFile(correction.file);
    if (!fileContent) {
      console.log(`   ❌ Arquivo não encontrado: ${correction.file}`);
      allCorrectionsApplied = false;
      continue;
    }
    
    let correctionValid = true;
    
    for (const check of correction.checks) {
      const found = check.pattern.test(fileContent);
      
      if (check.required && !found) {
        console.log(`   ❌ ${check.description}`);
        correctionValid = false;
        allCorrectionsApplied = false;
      } else if (found) {
        console.log(`   ✅ ${check.description}`);
      }
    }
    
    if (correctionValid) {
      console.log(`   🎉 Todas as correções aplicadas em ${correction.name}`);
    }
    
    console.log();
  }
  
  console.log('=== RESUMO DA VALIDAÇÃO ===');
  
  if (allCorrectionsApplied) {
    console.log('🎉 TODAS AS CORREÇÕES FASE 1 FORAM APLICADAS!');
    console.log();
    console.log('✅ Correções implementadas:');
    console.log('   • Logging detalhado para debug');
    console.log('   • Preservação integral dos dados ACF');
    console.log('   • Mapeamento correto dos campos');
    console.log('   • Tratamento de variações de nomes');
    console.log();
    console.log('🚀 PRÓXIMOS PASSOS:');
    console.log('   1. Testar com servidor em execução');
    console.log('   2. Verificar logs detalhados');
    console.log('   3. Implementar Fase 2 (Lógica de Interlocutor)');
    console.log('   4. Implementar Fase 3 (Interface Contextual)');
    console.log('   5. Implementar Fase 4 (IA Contextual)');
  } else {
    console.log('❌ ALGUMAS CORREÇÕES NÃO FORAM APLICADAS');
    console.log('   Verifique os arquivos marcados com ❌ acima');
  }
}

if (require.main === module) {
  validateCorrections();
}

module.exports = { validateCorrections };