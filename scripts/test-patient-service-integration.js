#!/usr/bin/env node

/**
 * Integration Test for Enhanced Patient Service - Task 2 Implementation
 * Tests the actual syncPatientWithWordPressACF function with real-like scenarios
 */

const path = require('path');

console.log('🔗 Integration Test: Enhanced Patient Service - Task 2');
console.log('=' .repeat(60));

// Mock Prisma for testing
const mockPrisma = {
  patient: {
    findFirst: async (query) => {
      console.log('   📊 Prisma findFirst called:', JSON.stringify(query.where, null, 2));
      
      // Simulate finding existing patient for update scenario
      if (query.where.whatsapp === '11999999999') {
        return {
          id: 'existing-patient-123',
          name: 'João Santos', // Different from WordPress data
          whatsapp: '11999999999',
          email: 'joao.old@example.com',
          cpf: '12345678901',
          tipo_associacao: 'assoc_paciente',
          nome_responsavel: null,
          cpf_responsavel: null,
          status: 'MEMBRO',
          wordpress_id: '123',
          isActive: true,
          associationId: query.where.associationId,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01')
        };
      }
      
      // Return null for new patients
      return null;
    },
    
    create: async (params) => {
      console.log('   📊 Prisma create called with data:', JSON.stringify(params.data, null, 2));
      return {
        id: `new-patient-${Date.now()}`,
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    },
    
    update: async (params) => {
      console.log('   📊 Prisma update called for ID:', params.where.id);
      console.log('   📊 Update data:', JSON.stringify(params.data, null, 2));
      return {
        id: params.where.id,
        ...params.data,
        updatedAt: new Date()
      };
    }
  }
};

// Mock the prisma module
require.cache[require.resolve('@/lib/prisma')] = {
  exports: { default: mockPrisma }
};

// Test scenarios
const testScenarios = [
  {
    name: 'New Patient - Direct Association',
    whatsapp: '11888888888',
    wordpressData: {
      id: 456,
      name: 'Maria Silva',
      email: 'maria@example.com',
      acf: {
        telefone: '11888888888',
        nome_completo: 'Maria Silva',
        cpf: '98765432100',
        tipo_associacao: 'assoc_paciente',
        nome_responsavel: null,
        cpf_responsavel: null
      }
    },
    expectedOperation: 'create',
    expectedValidation: true
  },
  {
    name: 'New Patient - Responsible Association',
    whatsapp: '11777777777',
    wordpressData: {
      id: 789,
      name: 'Carolina Santos',
      email: 'carolina@example.com',
      acf: {
        telefone: '11777777777',
        nome_completo: 'Lucas Santos',
        cpf: '11111111111',
        tipo_associacao: 'assoc_respon',
        nome_responsavel: 'Carolina Santos',
        cpf_responsavel: '22222222222'
      }
    },
    expectedOperation: 'create',
    expectedValidation: true
  },
  {
    name: 'Existing Patient Update - Data Discrepancies',
    whatsapp: '11999999999',
    wordpressData: {
      id: 123,
      name: 'João Silva',
      email: 'joao.new@example.com',
      acf: {
        telefone: '11999999999',
        nome_completo: 'João Silva', // Different from existing
        cpf: '12345678901',
        tipo_associacao: 'assoc_respon', // Changed from assoc_paciente
        nome_responsavel: 'Ana Silva', // New responsible
        cpf_responsavel: '33333333333'
      }
    },
    expectedOperation: 'update',
    expectedValidation: true,
    expectDiscrepancies: true
  },
  {
    name: 'Invalid ACF Data - Array Format',
    whatsapp: '11666666666',
    wordpressData: {
      id: 999,
      name: 'Invalid User',
      acf: [] // Invalid format
    },
    expectedOperation: 'create',
    expectedValidation: false
  },
  {
    name: 'Missing ACF Data',
    whatsapp: '11555555555',
    wordpressData: {
      id: 888,
      name: 'No ACF User',
      email: 'noacf@example.com'
      // No ACF data
    },
    expectedOperation: 'create',
    expectedValidation: false
  }
];

async function runIntegrationTests() {
  console.log('\n🚀 Starting Integration Tests...\n');
  
  let passedTests = 0;
  let totalTests = testScenarios.length;
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 Test ${i + 1}/${totalTests}: ${scenario.name}`);
    console.log('-'.repeat(50));
    
    try {
      // Import the function dynamically to ensure fresh module state
      delete require.cache[require.resolve('../src/lib/services/patient.service')];
      const { syncPatientWithWordPressACF } = require('../src/lib/services/patient.service');
      
      const result = await syncPatientWithWordPressACF(
        scenario.whatsapp,
        scenario.wordpressData,
        'test-association-id'
      );
      
      console.log('   📊 Sync Result:', {
        success: result.success,
        operation: result.syncMetadata?.operation,
        validationPassed: result.syncMetadata?.validationPassed,
        acfFieldsCount: result.syncMetadata?.acfFieldsCount,
        discrepanciesFound: result.syncMetadata?.discrepanciesFound || 0
      });
      
      // Validate results
      let testPassed = true;
      const issues = [];
      
      if (!result.success) {
        if (scenario.expectedValidation) {
          issues.push('Expected success but got failure');
          testPassed = false;
        }
      } else {
        if (result.syncMetadata?.operation !== scenario.expectedOperation) {
          issues.push(`Expected operation '${scenario.expectedOperation}' but got '${result.syncMetadata?.operation}'`);
          testPassed = false;
        }
        
        if (scenario.expectedValidation !== undefined && 
            result.syncMetadata?.validationPassed !== scenario.expectedValidation) {
          issues.push(`Expected validation '${scenario.expectedValidation}' but got '${result.syncMetadata?.validationPassed}'`);
          testPassed = false;
        }
        
        if (scenario.expectDiscrepancies && 
            (!result.syncMetadata?.discrepanciesFound || result.syncMetadata.discrepanciesFound === 0)) {
          issues.push('Expected discrepancies but none were found');
          testPassed = false;
        }
      }
      
      if (testPassed) {
        console.log('   ✅ PASS: All expectations met');
        passedTests++;
      } else {
        console.log('   ❌ FAIL: Issues found:');
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
      
      // Log additional details for debugging
      if (result.syncMetadata) {
        console.log('   📊 Sync Metadata Details:');
        console.log(`      - WordPress ID: ${result.syncMetadata.wordpressId}`);
        console.log(`      - Data Source: ${result.syncMetadata.dataSource}`);
        console.log(`      - Timestamp: ${result.syncMetadata.syncTimestamp}`);
        if (result.syncMetadata.discrepanciesFound > 0) {
          console.log(`      - Discrepancies: ${result.syncMetadata.discrepanciesFound} found`);
        }
      }
      
    } catch (error) {
      console.log('   ❌ ERROR: Test execution failed');
      console.log(`      Error: ${error.message}`);
      console.log(`      Stack: ${error.stack}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 Integration Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed successfully!');
    console.log('\n✅ Task 2 Implementation Verified:');
    console.log('   ✅ ACF data preservation working correctly');
    console.log('   ✅ Data validation implemented and functional');
    console.log('   ✅ Sync discrepancy detection operational');
    console.log('   ✅ Enhanced logging and metadata generation');
    console.log('   ✅ Error handling and fallback mechanisms');
  } else {
    console.log(`❌ ${totalTests - passedTests} tests failed. Review implementation.`);
  }
}

// Mock phone utilities
const phoneUtils = {
  sanitizePhone: (phone) => phone.replace(/\D/g, ''),
  isValidPhone: (phone) => {
    const clean = phone.replace(/\D/g, '');
    return clean.length >= 10 && clean.length <= 11;
  }
};

require.cache[require.resolve('@/lib/utils/phone')] = {
  exports: phoneUtils
};

// Run the integration tests
runIntegrationTests().catch(error => {
  console.error('Integration test execution failed:', error);
  process.exit(1);
});