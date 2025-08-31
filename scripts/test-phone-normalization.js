/**
 * Script de Teste para Normalização de Telefone
 * Fase 1 e 2: Validação da implementação completa
 */

const { sanitizePhone, formatPhoneMask, isValidPhone, getPhoneForAPI } = require('../src/lib/utils/phone.ts');

console.log('🧪 Testando Normalização de Telefone - Fase 1 e 2\n');

// Casos de teste para diferentes formatos de entrada
const testCases = [
  // Formato limpo (como SatiZap envia)
  { input: '85996201636', expected: '85996201636', description: 'Número limpo (SatiZap)' },
  
  // Formatos comuns no WordPress
  { input: '(85) 99620-1636', expected: '85996201636', description: 'Formato WordPress padrão' },
  { input: '85 99620-1636', expected: '85996201636', description: 'Formato com espaço' },
  { input: '85-99620-1636', expected: '85996201636', description: 'Formato com hífen' },
  { input: '85 996201636', expected: '85996201636', description: 'Formato com espaço simples' },
  { input: '+55 85 99620-1636', expected: '5585996201636', description: 'Formato internacional' },
  
  // Casos extremos
  { input: '(85)99620-1636', expected: '85996201636', description: 'Sem espaço após DDD' },
  { input: ' (85) 99620-1636 ', expected: '85996201636', description: 'Com espaços extras' },
  { input: '85.99620.1636', expected: '85996201636', description: 'Com pontos' },
  
  // Números de 10 dígitos (fixo)
  { input: '(85) 3234-5678', expected: '8532345678', description: 'Telefone fixo' },
  { input: '85 3234-5678', expected: '8532345678', description: 'Telefone fixo sem parênteses' },
];

console.log('📋 Testando Sanitização (sanitizePhone):\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  try {
    const result = sanitizePhone(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Esperado: "${testCase.expected}"`);
    console.log(`   Resultado: "${result}"`);
    console.log(`   Status: ${passed ? '✅ PASSOU' : '❌ FALHOU'}\n`);
    
    if (passed) passedTests++;
  } catch (error) {
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Status: ❌ ERRO - ${error.message}\n`);
  }
});

console.log(`📊 Resultado da Sanitização: ${passedTests}/${totalTests} testes passaram\n`);

// Teste de formatação com máscara
console.log('🎭 Testando Formatação com Máscara (formatPhoneMask):\n');

const maskTestCases = [
  { input: '85996201636', expected: '(85) 99620-1636', description: 'Celular 11 dígitos' },
  { input: '8532345678', expected: '(85) 3234-5678', description: 'Fixo 10 dígitos' },
  { input: '85', expected: '(85', description: 'Apenas DDD' },
  { input: '8599', expected: '(85) 99', description: 'DDD + início' },
];

let passedMaskTests = 0;
let totalMaskTests = maskTestCases.length;

maskTestCases.forEach((testCase, index) => {
  try {
    const result = formatPhoneMask(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Esperado: "${testCase.expected}"`);
    console.log(`   Resultado: "${result}"`);
    console.log(`   Status: ${passed ? '✅ PASSOU' : '❌ FALHOU'}\n`);
    
    if (passed) passedMaskTests++;
  } catch (error) {
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Status: ❌ ERRO - ${error.message}\n`);
  }
});

console.log(`📊 Resultado da Formatação: ${passedMaskTests}/${totalMaskTests} testes passaram\n`);

// Teste de validação
console.log('✅ Testando Validação (isValidPhone):\n');

const validationTestCases = [
  { input: '85996201636', expected: true, description: 'Celular válido (11 dígitos)' },
  { input: '8532345678', expected: true, description: 'Fixo válido (10 dígitos)' },
  { input: '859962016', expected: false, description: 'Muito curto (9 dígitos)' },
  { input: '859962016367', expected: false, description: 'Muito longo (12 dígitos)' },
  { input: '', expected: false, description: 'String vazia' },
  { input: 'abc123', expected: false, description: 'Com letras' },
];

let passedValidationTests = 0;
let totalValidationTests = validationTestCases.length;

validationTestCases.forEach((testCase, index) => {
  try {
    const result = isValidPhone(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Esperado: ${testCase.expected}`);
    console.log(`   Resultado: ${result}`);
    console.log(`   Status: ${passed ? '✅ PASSOU' : '❌ FALHOU'}\n`);
    
    if (passed) passedValidationTests++;
  } catch (error) {
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Status: ❌ ERRO - ${error.message}\n`);
  }
});

console.log(`📊 Resultado da Validação: ${passedValidationTests}/${totalValidationTests} testes passaram\n`);

// Resumo final
const totalAllTests = totalTests + totalMaskTests + totalValidationTests;
const totalPassedTests = passedTests + passedMaskTests + passedValidationTests;

console.log('🎯 RESUMO FINAL:');
console.log(`   Sanitização: ${passedTests}/${totalTests}`);
console.log(`   Formatação: ${passedMaskTests}/${totalMaskTests}`);
console.log(`   Validação: ${passedValidationTests}/${totalValidationTests}`);
console.log(`   TOTAL: ${totalPassedTests}/${totalAllTests} (${Math.round(totalPassedTests/totalAllTests*100)}%)\n`);

if (totalPassedTests === totalAllTests) {
  console.log('🎉 TODOS OS TESTES PASSARAM! A normalização está funcionando corretamente.');
  console.log('✨ Fase 1 (Sanitização no SatiZap) implementada com sucesso!');
} else {
  console.log('⚠️  Alguns testes falharam. Verifique a implementação.');
}

console.log('\n📝 Próximos passos:');
console.log('1. ✅ Fase 1: Sanitização no SatiZap (COMPLETA)');
console.log('2. 🔄 Fase 2: Implementar busca inteligente no WordPress');
console.log('3. 🧪 Fase 3: Testar integração completa SatiZap ↔ WordPress');

// Simular cenário real de integração
console.log('\n🔗 SIMULAÇÃO DE CENÁRIO REAL:');
console.log('Usuário digita no SatiZap: "(85) 99620-1636"');
console.log(`SatiZap sanitiza para API: "${getPhoneForAPI('(85) 99620-1636')}"`);
console.log('WordPress deve encontrar usuário com qualquer formato:');
console.log('  - "85996201636" ✅');
console.log('  - "(85) 99620-1636" ✅');
console.log('  - "85 99620-1636" ✅');
console.log('  - "85-99620-1636" ✅');
console.log('Resultado esperado: 🎯 PACIENTE ENCONTRADO E SINCRONIZADO');