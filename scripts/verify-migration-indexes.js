const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyIndexes() {
  try {
    console.log('🔍 Verifying migration indexes...');
    
    const indexes = await prisma.$queryRaw`
      SELECT 
        INDEX_NAME, 
        COLUMN_NAME, 
        SEQ_IN_INDEX,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_NAME = 'Patient' 
      AND INDEX_NAME LIKE 'Patient_%_idx'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;
    
    console.log('📈 Migration indexes:');
    console.table(indexes);
    
    // Group by index name to show composite indexes clearly
    const indexGroups = {};
    indexes.forEach(idx => {
      if (!indexGroups[idx.INDEX_NAME]) {
        indexGroups[idx.INDEX_NAME] = [];
      }
      indexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    console.log('📋 Index composition:');
    Object.entries(indexGroups).forEach(([indexName, columns]) => {
      console.log(`  ${indexName}: [${columns.join(', ')}]`);
    });
    
    // Verify expected indexes exist
    const expectedIndexes = [
      'Patient_whatsapp_association_idx',
      'Patient_context_update_idx',
      'Patient_context_lookup_idx'
    ];
    
    const foundIndexes = Object.keys(indexGroups);
    const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
    
    if (missingIndexes.length === 0) {
      console.log('✅ All expected indexes are present');
    } else {
      console.log(`⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
    }
    
    console.log('✅ Index verification completed');
    
  } catch (error) {
    console.error('❌ Index verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIndexes();