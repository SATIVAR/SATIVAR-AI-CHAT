#!/usr/bin/env node

/**
 * Rollback Script: Remove Interlocutor Context Fields
 * 
 * This script removes the interlocutor context fields and indexes if needed.
 * Use with caution as this will permanently delete data.
 * 
 * Usage: node scripts/rollback-interlocutor-fields.js
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function rollbackMigration() {
  console.log('⚠️  ROLLBACK: Removing interlocutor context fields...');
  console.log('⚠️  WARNING: This will permanently delete the acf_sync_status and last_context_update data!');
  
  const confirmed = await askConfirmation('Are you sure you want to proceed? (yes/no): ');
  
  if (!confirmed) {
    console.log('❌ Rollback cancelled by user');
    return;
  }
  
  try {
    // First, backup the data that will be lost
    console.log('💾 Creating backup of data that will be lost...');
    
    const backupData = await prisma.$queryRaw`
      SELECT id, name, whatsapp, acf_sync_status, last_context_update
      FROM Patient 
      WHERE acf_sync_status IS NOT NULL OR last_context_update IS NOT NULL
    `;
    
    if (backupData.length > 0) {
      const fs = require('fs');
      const backupFile = `backup_interlocutor_fields_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`💾 Backup saved to: ${backupFile}`);
    }
    
    // Drop indexes first
    console.log('🗑️  Dropping indexes...');
    
    const indexesToDrop = [
      'Patient_whatsapp_association_idx',
      'Patient_tipo_associacao_idx',
      'Patient_context_update_idx',
      'Patient_context_lookup_idx'
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        await prisma.$executeRawUnsafe(`DROP INDEX ${indexName} ON Patient`);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.message.includes("doesn't exist")) {
          console.log(`⚠️  Index ${indexName} doesn't exist, skipping`);
        } else {
          console.error(`❌ Error dropping index ${indexName}:`, error.message);
        }
      }
    }
    
    // Drop columns
    console.log('🗑️  Dropping columns...');
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Patient DROP COLUMN acf_sync_status`);
      console.log('✅ Dropped column: acf_sync_status');
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️  Column acf_sync_status doesn\'t exist, skipping');
      } else {
        throw error;
      }
    }
    
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Patient DROP COLUMN last_context_update`);
      console.log('✅ Dropped column: last_context_update');
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️  Column last_context_update doesn\'t exist, skipping');
      } else {
        throw error;
      }
    }
    
    // Verify rollback
    console.log('🔍 Verifying rollback...');
    
    const remainingColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Patient' 
      AND COLUMN_NAME IN ('acf_sync_status', 'last_context_update')
    `;
    
    if (remainingColumns.length === 0) {
      console.log('✅ Rollback completed successfully! All interlocutor fields removed.');
    } else {
      console.log('⚠️  Some columns may still exist:');
      console.table(remainingColumns);
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  rollbackMigration().catch(console.error);
}

module.exports = { rollbackMigration };