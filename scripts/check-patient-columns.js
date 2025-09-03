const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Patient'
      ORDER BY COLUMN_NAME
    `;
    
    console.log('Current Patient table columns:');
    console.table(columns);
    
    const targetColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Patient' 
      AND COLUMN_NAME IN ('acf_sync_status', 'last_context_update', 'tipo_associacao', 'nome_responsavel', 'cpf_responsavel')
    `;
    
    console.log('\nTarget columns status:');
    console.table(targetColumns);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();