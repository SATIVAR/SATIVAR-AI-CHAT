import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token de convite inválido' },
        { status: 400 }
      )
    }

    if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Token de convite expirado' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Ativar conta
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        isActive: true,
        inviteToken: null,
        inviteTokenExpiry: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Conta ativada com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao ativar conta:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}