import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const managers = await prisma.associationMember.findMany({
      where: {
        associationId: id,
        role: 'manager'
      },
      include: {
        User: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedManagers = managers.map(member => ({
      id: member.User.id,
      name: member.User.name,
      email: member.User.email,
      role: member.role,
      createdAt: member.createdAt,
      isActive: member.User.isActive
    }))

    return NextResponse.json({ managers: formattedManagers })

  } catch (error) {
    console.error('Erro ao buscar gerentes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe um usuário com este email
    let user = await prisma.user.findUnique({
      where: { email }
    })

    // Verificar se já existe uma associação entre este usuário e a associação
    if (user) {
      const existingMembership = await prisma.associationMember.findUnique({
        where: {
          userId_associationId: {
            userId: user.id,
            associationId: id
          }
        }
      })

      if (existingMembership) {
        return NextResponse.json(
          { error: 'Este usuário já é gerente desta associação' },
          { status: 400 }
        )
      }
    }

    // Se o usuário não existe, criar um novo
    if (!user) {
      const crypto = require('crypto')
      const inviteToken = crypto.randomBytes(32).toString('hex')
      const tokenExpiry = new Date()
      tokenExpiry.setDate(tokenExpiry.getDate() + 7) // Token válido por 7 dias

      user = await prisma.user.create({
        data: {
          email,
          name,
          inviteToken,
          inviteTokenExpiry: tokenExpiry,
          isActive: false // Será ativado quando definir a senha
        }
      })
    }

    // Criar a associação entre usuário e associação
    await prisma.associationMember.create({
      data: {
        userId: user.id,
        associationId: id,
        role: 'manager'
      }
    })

    return NextResponse.json({
      success: true,
      message: user.inviteToken 
        ? 'Convite enviado com sucesso! O usuário receberá um email para definir sua senha.'
        : 'Usuário adicionado como gerente com sucesso!',
      inviteToken: user.inviteToken || undefined
    })

  } catch (error) {
    console.error('Erro ao convidar gerente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    await prisma.associationMember.delete({
      where: {
        userId_associationId: {
          userId,
          associationId: id
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Gerente removido com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao remover gerente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}