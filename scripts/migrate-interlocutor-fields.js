#!/usr/bin/env node

/**
 * Migration Script: Add Interlocutor Context Fields
 * 
 * This script adds the necessary database fields and indexes for the interlocutor logic feature.
 * It includes:
 * - acf_sync_status field to track ACF data synchronization status
 * - last_context_update field to track when context was last analyzed
 * - Performance indexes for optimized queries
 * 
 * Usage: node scripts/migrate-interlocutor-fields.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting interlocutor context fields migration...');
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../prisma/migrations/001_add_interlocutor_context_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments first, then split into statements
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Split the SQL into individual statements
    const statements = cleanSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('📋 Statements to execute:');
    statements.forEach((stmt, i) => {
      console.log(`${i + 1}. ${stmt.substring(0, 100)}${stmt.length > 100 ? '...' : ''}`);
    });
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        try {
          await prisma.$executeRawUnsafe(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Check if it's a "column already exists" or "index already exists" error
          if (error.message.includes('Duplicate column name') || 
              error.message.includes('Duplicate key name') ||
              error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    // Verify the migration by checking if the new columns exist
    console.log('🔍 Verifying migration...');
    
    const result = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Patient' 
      AND COLUMN_NAME IN ('acf_sync_status', 'last_context_update')
    `;
    
    console.log('📊 New columns created:');
    console.table(result);
    
    // Check indexes
    const indexes = await prisma.$queryRaw`
      SELECT INDEX_NAME, COLUMN_NAME
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
    
    console.log('📈 Indexes created:');
    console.table(indexes);
    
    // Get count of patients with different sync statuses
    const syncStatusCounts = await prisma.$queryRaw`
      SELECT acf_sync_status, COUNT(*) as count
      FROM Patient 
      GROUP BY acf_sync_status
    `;
    
    console.log('📋 Patient sync status distribution:');
    console.table(syncStatusCounts);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Test function to validate the migration with existing data
async function testMigration() {
  console.log('🧪 Testing migration with existing data...');
  
  try {
    // Test basic query with new fields
    const samplePatients = await prisma.patient.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        whatsapp: true,
        tipo_associacao: true,
        acf_sync_status: true,
        last_context_update: true
      }
    });
    
    console.log('📋 Sample patients with new fields:');
    console.table(samplePatients);
    
    // Test index performance with a complex query
    const startTime = Date.now();
    const contextQuery = await prisma.patient.findMany({
      where: {
        AND: [
          { whatsapp: { not: null } },
          { associationId: { not: null } },
          { tipo_associacao: { not: null } }
        ]
      },
      take: 10
    });
    const queryTime = Date.now() - startTime;
    
    console.log(`⚡ Context lookup query executed in ${queryTime}ms`);
    console.log(`📊 Found ${contextQuery.length} patients with complete context data`);
    
    // Test update operation
    if (samplePatients.length > 0) {
      const testPatient = samplePatients[0];
      await prisma.patient.update({
        where: { id: testPatient.id },
        data: { 
          last_context_update: new Date(),
          acf_sync_status: 'synced'
        }
      });
      console.log(`✅ Successfully updated patient ${testPatient.name} with new fields`);
    }
    
    console.log('✅ Migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testOnly = args.includes('--test-only');
  
  if (testOnly) {
    await testMigration();
  } else {
    await runMigration();
    await testMigration();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigration, testMigration };