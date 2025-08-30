const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    console.log('🔧 Criando usuário de teste para o sistema RBAC...')

    // Buscar uma associação existente
    const association = await prisma.association.findFirst()
    
    if (!association) {
      console.error('❌ Nenhuma associação encontrada. Execute o seed primeiro.')
      return
    }

    console.log(`📋 Usando associação: ${association.name} (${association.id})`)

    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash('123456', 12)
    
    const testUser = await prisma.user.create({
      data: {
        email: 'gerente@teste.com',
        name: 'Gerente de Teste',
        passwordHash: hashedPassword,
        isActive: true
      }
    })

    console.log(`👤 Usuário criado: ${testUser.name} (${testUser.email})`)

    // Criar associação entre usuário e associação
    const membership = await prisma.associationMember.create({
      data: {
        userId: testUser.id,
        associationId: association.id,
        role: 'manager'
      }
    })

    console.log(`🔗 Associação criada: ${testUser.name} é gerente de ${association.name}`)

    console.log('\n✅ Usuário de teste criado com sucesso!')
    console.log('\n📝 Credenciais de teste:')
    console.log('   Email: gerente@teste.com')
    console.log('   Senha: 123456')
    console.log('   Função: Gerente')
    console.log(`   Associação: ${association.name}`)
    
    console.log('\n🚀 Para testar:')
    console.log('1. Acesse http://localhost:9002/login')
    console.log('2. Use as credenciais acima')
    console.log('3. Será redirecionado para a associação específica')
    console.log('4. Teste também http://localhost:9002/test-rbac')

  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()