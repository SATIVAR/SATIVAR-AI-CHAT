/**
 * Test script to verify our database verification utilities work correctly
 */

const { 
  verifySativarAssociation, 
  checkDatabaseHealth, 
  logAssociationDetails,
  quickVerifySativar 
} = require('../src/lib/utils/database-verification.ts');

async function runTests() {
  console.log('🧪 Testing Database Verification Utilities\n');

  try {
    // Test 1: Quick verification
    console.log('1️⃣ Testing quickVerifySativar...');
    const quickResult = await quickVerifySativar();
    console.log(`   Result: ${quickResult ? '✅ Active' : '❌ Not active'}\n`);

    // Test 2: Detailed sativar verification
    console.log('2️⃣ Testing verifySativarAssociation...');
    const sativarResult = await verifySativarAssociation();
    console.log(`   Exists: ${sativarResult.exists ? '✅' : '❌'}`);
    console.log(`   Active: ${sativarResult.isActive ? '✅' : '❌'}`);
    if (sativarResult.association) {
      console.log(`   Name: ${sativarResult.association.name}`);
      console.log(`   Patients: ${sativarResult.association.patientCount}`);
    }
    console.log();

    // Test 3: Full health check
    console.log('3️⃣ Testing checkDatabaseHealth...');
    const healthResult = await checkDatabaseHealth();
    console.log(`   Connection: ${healthResult.connection ? '✅' : '❌'}`);
    console.log(`   Total Associations: ${healthResult.associations}`);
    console.log(`   Sativar Exists: ${healthResult.sativarExists ? '✅' : '❌'}`);
    console.log(`   Sativar Active: ${healthResult.sativarActive ? '✅' : '❌'}`);
    console.log(`   Errors: ${healthResult.errors.length}`);
    console.log();

    // Test 4: Log association details
    console.log('4️⃣ Testing logAssociationDetails...');
    await logAssociationDetails('sativar');
    console.log();

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };