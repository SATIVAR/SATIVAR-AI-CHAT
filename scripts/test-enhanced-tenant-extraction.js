#!/usr/bin/env node

/**
 * Test script for enhanced tenant extraction functionality
 * Tests the improved extractSubdomainEnhanced function and validation
 */

const { extractSubdomainEnhanced, isValidTenantSlug, cacheManager } = require('../src/lib/middleware/tenant.ts');

// Mock console for testing
const originalConsole = console.log;
let logOutput = [];

function mockConsole() {
  console.log = (...args) => {
    logOutput.push(args.join(' '));
  };
}

function restoreConsole() {
  console.log = originalConsole;
}

function clearLogs() {
  logOutput = [];
}

// Test cases for enhanced subdomain extraction
const testCases = [
  // Development path-based routing
  {
    name: 'Valid development tenant - sativar',
    host: 'localhost:9002',
    pathname: '/sativar/dashboard',
    expected: { subdomain: 'sativar', method: 'path-based', isValid: true }
  },
  {
    name: 'Valid development tenant - short slug',
    host: 'localhost:9002',
    pathname: '/abc',
    expected: { subdomain: 'abc', method: 'path-based', isValid: true }
  },
  {
    name: 'Invalid development tenant - reserved path',
    host: 'localhost:9002',
    pathname: '/api/test',
    expected: { subdomain: 'api', method: 'path-based', isValid: false }
  },
  {
    name: 'Invalid development tenant - admin path',
    host: 'localhost:9002',
    pathname: '/admin/dashboard',
    expected: { subdomain: 'admin', method: 'path-based', isValid: false }
  },
  {
    name: 'Invalid development tenant - too short',
    host: 'localhost:9002',
    pathname: '/ab',
    expected: { subdomain: 'ab', method: 'path-based', isValid: false }
  },
  {
    name: 'Invalid development tenant - special characters',
    host: 'localhost:9002',
    pathname: '/test@123',
    expected: { subdomain: 'test@123', method: 'path-based', isValid: false }
  },
  {
    name: 'Development root path',
    host: 'localhost:9002',
    pathname: '/',
    expected: { subdomain: null, method: 'fallback', isValid: false }
  },
  
  // Production subdomain-based routing
  {
    name: 'Valid production subdomain',
    host: 'sativar.satizap.com',
    pathname: '/dashboard',
    expected: { subdomain: 'sativar', method: 'subdomain', isValid: true }
  },
  {
    name: 'Invalid production subdomain - reserved',
    host: 'www.satizap.com',
    pathname: '/dashboard',
    expected: { subdomain: 'www', method: 'subdomain', isValid: false }
  },
  
  // Custom domain routing
  {
    name: 'Valid custom domain',
    host: 'myassociation.com',
    pathname: '/dashboard',
    expected: { subdomain: 'myassociation', method: 'custom-domain', isValid: true }
  },
  
  // Edge cases
  {
    name: 'Empty host',
    host: '',
    pathname: '/test',
    expected: { subdomain: null, method: 'fallback', isValid: false }
  },
  {
    name: 'Host with port only',
    host: ':9002',
    pathname: '/test',
    expected: { subdomain: null, method: 'fallback', isValid: false }
  }
];

// Test cases for slug validation
const slugValidationTests = [
  { slug: 'sativar', expected: { valid: true } },
  { slug: 'test-123', expected: { valid: true } },
  { slug: 'ab', expected: { valid: true } }, // Minimum 2 chars now
  { slug: 'a', expected: { valid: false, reason: 'Slug length must be between 2-63 characters' } },
  { slug: 'api', expected: { valid: false, reason: "Slug 'api' is reserved" } },
  { slug: 'admin', expected: { valid: false, reason: "Slug 'admin' is reserved" } },
  { slug: 'test@123', expected: { valid: false, reason: 'Slug contains invalid characters' } },
  { slug: 'test.png', expected: { valid: false, reason: 'Slug appears to be a file' } },
  { slug: '', expected: { valid: false, reason: 'Slug is empty' } },
  { slug: null, expected: { valid: false, reason: 'Slug is empty' } }
];

async function runTests() {
  console.log('🧪 Testing Enhanced Tenant Extraction Functionality\n');
  
  let passed = 0;
  let failed = 0;
  
  // Set NODE_ENV to development for testing
  process.env.NODE_ENV = 'development';
  
  console.log('📋 Testing extractSubdomainEnhanced function...\n');
  
  for (const testCase of testCases) {
    try {
      mockConsole();
      
      // Import the function dynamically to avoid module loading issues
      const { extractSubdomainEnhanced } = await import('../src/lib/middleware/tenant.ts');
      
      const result = extractSubdomainEnhanced(testCase.host, testCase.pathname, { debugMode: false });
      
      restoreConsole();
      
      const success = 
        result.subdomain === testCase.expected.subdomain &&
        result.method === testCase.expected.method &&
        result.isValid === testCase.expected.isValid;
      
      if (success) {
        console.log(`✅ ${testCase.name}`);
        console.log(`   Host: ${testCase.host}, Path: ${testCase.pathname}`);
        console.log(`   Result: ${JSON.stringify(result)}\n`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name}`);
        console.log(`   Host: ${testCase.host}, Path: ${testCase.pathname}`);
        console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`   Got: ${JSON.stringify(result)}\n`);
        failed++;
      }
      
      clearLogs();
    } catch (error) {
      restoreConsole();
      console.log(`❌ ${testCase.name} - Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('📋 Testing slug validation function...\n');
  
  for (const test of slugValidationTests) {
    try {
      // Import the validation function
      const { isValidTenantSlug } = await import('../src/lib/middleware/tenant.ts');
      
      const result = isValidTenantSlug(test.slug);
      
      const success = result.valid === test.expected.valid &&
        (!test.expected.reason || result.reason?.includes(test.expected.reason.split(' ')[0]));
      
      if (success) {
        console.log(`✅ Slug validation: "${test.slug}"`);
        console.log(`   Result: ${JSON.stringify(result)}\n`);
        passed++;
      } else {
        console.log(`❌ Slug validation: "${test.slug}"`);
        console.log(`   Expected: ${JSON.stringify(test.expected)}`);
        console.log(`   Got: ${JSON.stringify(result)}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Slug validation: "${test.slug}" - Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('📋 Testing cache management...\n');
  
  try {
    const { cacheManager } = await import('../src/lib/middleware/tenant.ts');
    
    // Test cache stats
    const stats = cacheManager.getStats();
    console.log('✅ Cache stats retrieved');
    console.log(`   Stats: ${JSON.stringify(stats)}\n`);
    passed++;
    
    // Test cache clear
    cacheManager.clear();
    console.log('✅ Cache cleared successfully\n');
    passed++;
    
  } catch (error) {
    console.log(`❌ Cache management test - Error: ${error.message}\n`);
    failed += 2;
  }
  
  // Summary
  console.log('📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Enhanced tenant extraction is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Handle module loading for both CommonJS and ES modules
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };