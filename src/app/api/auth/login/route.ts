import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const userSession = await authenticateUser(email, password)

    if (!userSession) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    // Criar resposta com cookie de sessão
    const response = NextResponse.json({
      success: true,
      user: userSession
    })

    // Definir cookie de sessão
    const sessionCookie = JSON.stringify(userSession)
    response.cookies.set('auth-session', sessionCookie, {
      httpOnly: false, // Permitir acesso via JavaScript para o middleware
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 // 24 horas
    })

    return response

  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}