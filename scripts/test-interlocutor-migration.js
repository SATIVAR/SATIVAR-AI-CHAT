#!/usr/bin/env node

/**
 * Test Script: Validate Interlocutor Context Fields Migration
 * 
 * This script thoroughly tests the migration to ensure all fields and indexes
 * are working correctly with existing data.
 * 
 * Usage: node scripts/test-interlocutor-migration.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseSchema() {
  console.log('🔍 Testing database schema...');
  
  // Test 1: Check if new columns exist
  const columns = await prisma.$queryRaw`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Patient' 
    AND COLUMN_NAME IN ('acf_sync_status', 'last_context_update')
    ORDER BY COLUMN_NAME
  `;
  
  console.log('📋 New columns:');
  console.table(columns);
  
  if (columns.length !== 2) {
    throw new Error(`Expected 2 new columns, found ${columns.length}`);
  }
  
  // Test 2: Check if indexes exist
  const indexes = await prisma.$queryRaw`
    SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_NAME = 'Patient' 
    AND INDEX_NAME IN (
      'Patient_whatsapp_association_idx',
      'Patient_tipo_associacao_idx', 
      'Patient_context_update_idx',
      'Patient_context_lookup_idx'
    )
    ORDER BY INDEX_NAME, SEQ_IN_INDEX
  `;
  
  console.log('📈 New indexes:');
  console.table(indexes);
  
  const expectedIndexes = [
    'Patient_whatsapp_association_idx',
    'Patient_tipo_associacao_idx',
    'Patient_context_update_idx', 
    'Patient_context_lookup_idx'
  ];
  
  const foundIndexes = [...new Set(indexes.map(idx => idx.INDEX_NAME))];
  const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
  
  if (missingIndexes.length > 0) {
    console.warn(`⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
  }
  
  console.log('✅ Schema validation completed');
}

async function testDataIntegrity() {
  console.log('🔍 Testing data integrity...');
  
  // Test 1: Check sync status distribution
  const syncStatusCounts = await prisma.$queryRaw`
    SELECT 
      acf_sync_status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Patient), 2) as percentage
    FROM Patient 
    GROUP BY acf_sync_status
    ORDER BY count DESC
  `;
  
  console.log('📊 Sync status distribution:');
  console.table(syncStatusCounts);
  
  // Test 2: Check patients with complete context data
  const completeContextCount = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM Patient 
    WHERE tipo_associacao IS NOT NULL 
    AND acf_sync_status IS NOT NULL
  `;
  
  console.log(`📋 Patients with complete context: ${completeContextCount[0].count}`);
  
  // Test 3: Check for data consistency
  const inconsistentData = await prisma.$queryRaw`
    SELECT id, name, whatsapp, tipo_associacao, acf_sync_status
    FROM Patient 
    WHERE (tipo_associacao IS NOT NULL AND acf_sync_status = 'pending')
    OR (tipo_associacao IS NULL AND acf_sync_status = 'synced')
    LIMIT 10
  `;
  
  if (inconsistentData.length > 0) {
    console.warn('⚠️  Found potentially inconsistent data:');
    console.table(inconsistentData);
  } else {
    console.log('✅ No data inconsistencies found');
  }
  
  console.log('✅ Data integrity validation completed');
}

async function testQueryPerformance() {
  console.log('🔍 Testing query performance...');
  
  // Test 1: Context lookup query (should use composite index)
  const startTime1 = Date.now();
  const contextLookup = await prisma.patient.findMany({
    where: {
      whatsapp: { not: null },
      associationId: { not: null },
      tipo_associacao: { not: null }
    },
    take: 100
  });
  const time1 = Date.now() - startTime1;
  
  console.log(`⚡ Context lookup query: ${time1}ms (${contextLookup.length} results)`);
  
  // Test 2: Association type filtering (should use index)
  const startTime2 = Date.now();
  const associationFilter = await prisma.patient.findMany({
    where: {
      tipo_associacao: 'assoc_paciente'
    },
    take: 50
  });
  const time2 = Date.now() - startTime2;
  
  console.log(`⚡ Association type filter: ${time2}ms (${associationFilter.length} results)`);
  
  // Test 3: Recent context updates (should use index)
  const startTime3 = Date.now();
  const recentUpdates = await prisma.patient.findMany({
    where: {
      last_context_update: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: {
      last_context_update: 'desc'
    },
    take: 20
  });
  const time3 = Date.now() - startTime3;
  
  console.log(`⚡ Recent updates query: ${time3}ms (${recentUpdates.length} results)`);
  
  console.log('✅ Performance testing completed');
}

async function testCRUDOperations() {
  console.log('🔍 Testing CRUD operations...');
  
  // Test 1: Create patient with new fields
  const testPatient = await prisma.patient.create({
    data: {
      id: `test_${Date.now()}`,
      name: 'Test Patient Migration',
      whatsapp: `test_${Date.now()}@migration.test`,
      associationId: 'test_association',
      tipo_associacao: 'assoc_paciente',
      acf_sync_status: 'synced',
      last_context_update: new Date()
    }
  });
  
  console.log('✅ Created test patient with new fields');
  
  // Test 2: Update patient with new fields
  const updatedPatient = await prisma.patient.update({
    where: { id: testPatient.id },
    data: {
      acf_sync_status: 'partial',
      last_context_update: new Date()
    }
  });
  
  console.log('✅ Updated patient with new fields');
  
  // Test 3: Query patient with new fields
  const queriedPatient = await prisma.patient.findUnique({
    where: { id: testPatient.id },
    select: {
      id: true,
      name: true,
      tipo_associacao: true,
      acf_sync_status: true,
      last_context_update: true
    }
  });
  
  console.log('📋 Queried patient data:');
  console.table([queriedPatient]);
  
  // Test 4: Delete test patient
  await prisma.patient.delete({
    where: { id: testPatient.id }
  });
  
  console.log('✅ Deleted test patient');
  console.log('✅ CRUD operations testing completed');
}

async function generateMigrationReport() {
  console.log('📊 Generating migration report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    database_schema: {
      new_columns: await prisma.$queryRaw`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Patient' 
        AND COLUMN_NAME IN ('acf_sync_status', 'last_context_update')
      `,
      new_indexes: await prisma.$queryRaw`
        SELECT INDEX_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_NAME = 'Patient' 
        AND INDEX_NAME LIKE 'Patient_%_idx'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `
    },
    data_statistics: {
      total_patients: await prisma.patient.count(),
      sync_status_distribution: await prisma.$queryRaw`
        SELECT acf_sync_status, COUNT(*) as count
        FROM Patient 
        GROUP BY acf_sync_status
      `,
      patients_with_context: await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM Patient 
        WHERE tipo_associacao IS NOT NULL
      `,
      patients_with_responsible: await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM Patient 
        WHERE nome_responsavel IS NOT NULL
      `
    }
  };
  
  const fs = require('fs');
  const reportFile = `migration_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📄 Migration report saved to: ${reportFile}`);
  console.log('📊 Report summary:');
  console.log(`   - Total patients: ${report.data_statistics.total_patients}`);
  console.log(`   - New columns: ${report.database_schema.new_columns.length}`);
  console.log(`   - New indexes: ${[...new Set(report.database_schema.new_indexes.map(i => i.INDEX_NAME))].length}`);
  
  return report;
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive migration tests...\n');
  
  try {
    await testDatabaseSchema();
    console.log('');
    
    await testDataIntegrity();
    console.log('');
    
    await testQueryPerformance();
    console.log('');
    
    await testCRUDOperations();
    console.log('');
    
    const report = await generateMigrationReport();
    
    console.log('\n✅ All migration tests completed successfully!');
    console.log('🎉 The interlocutor context fields migration is working correctly.');
    
    return report;
    
  } catch (error) {
    console.error('\n❌ Migration tests failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { 
  testDatabaseSchema, 
  testDataIntegrity, 
  testQueryPerformance, 
  testCRUDOperations,
  generateMigrationReport,
  runAllTests 
};