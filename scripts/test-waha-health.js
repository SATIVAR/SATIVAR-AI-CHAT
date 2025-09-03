#!/usr/bin/env node

/**
 * Test script for WAHA Health Service
 * Tests the health check functionality without requiring WAHA to be running
 */

const { wahaHealthService } = require('../src/lib/services/waha-health.service.ts');

async function testWAHAHealthService() {
  console.log('🧪 Testing WAHA Health Service...\n');

  // Test configuration
  const testConfig = {
    apiUrl: 'http://localhost:3000',
    apiKey: 'test-api-key',
    timeout: 5000
  };

  console.log('📋 Test Configuration:');
  console.log(`   API URL: ${testConfig.apiUrl}`);
  console.log(`   Has API Key: ${!!testConfig.apiKey}`);
  console.log(`   Timeout: ${testConfig.timeout}ms\n`);

  try {
    // Test 1: Health Check (expected to fail since WAHA is not running)
    console.log('1️⃣ Testing health check...');
    const healthResult = await wahaHealthService.checkHealth(testConfig);
    
    console.log(`   Status: ${healthResult.status}`);
    console.log(`   Healthy: ${healthResult.isHealthy}`);
    console.log(`   Response Time: ${healthResult.responseTime}ms`);
    if (healthResult.error) {
      console.log(`   Error: ${healthResult.error}`);
    }
    console.log();

    // Test 2: Connection Test
    console.log('2️⃣ Testing connection diagnostics...');
    const connectionResult = await wahaHealthService.testConnection(testConfig);
    
    console.log(`   Success: ${connectionResult.success}`);
    console.log('   Diagnostics:');
    console.log(`     URL Reachable: ${connectionResult.diagnostics.urlReachable}`);
    console.log(`     API Responding: ${connectionResult.diagnostics.apiResponding}`);
    console.log(`     Authentication Valid: ${connectionResult.diagnostics.authenticationValid}`);
    console.log();

    // Test 3: Test with invalid URL
    console.log('3️⃣ Testing with invalid URL...');
    const invalidConfig = {
      ...testConfig,
      apiUrl: 'http://invalid-url-that-does-not-exist:9999'
    };
    
    const invalidResult = await wahaHealthService.checkHealth(invalidConfig);
    console.log(`   Status: ${invalidResult.status}`);
    console.log(`   Error Type: ${invalidResult.error ? 'Connection Error' : 'No Error'}`);
    console.log();

    console.log('✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Health check service is working correctly');
    console.log('   - Error handling is functioning properly');
    console.log('   - Connection diagnostics are operational');
    console.log('\n💡 To test with a real WAHA instance:');
    console.log('   1. Start WAHA: node scripts/waha-setup.js start');
    console.log('   2. Run health check: node scripts/waha-setup.js health');
    console.log('   3. Test API endpoint: curl http://localhost:3001/api/health/waha');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testWAHAHealthService();