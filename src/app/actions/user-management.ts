'use server'

import { PrismaClient } from '@prisma/client'
import { generateInviteToken } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

export interface InviteManagerResult {
  success: boolean
  message: string
  inviteToken?: string
}

export interface AssociationManager {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  isActive: boolean
}

export async function inviteManager(
  associationId: string,
  email: string,
  name: string
): Promise<InviteManagerResult> {
  try {
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
            associationId: associationId
          }
        }
      })

      if (existingMembership) {
        return {
          success: false,
          message: 'Este usuário já é gerente desta associação'
        }
      }
    }

    // Se o usuário não existe, criar um novo
    if (!user) {
      const inviteToken = generateInviteToken()
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
        associationId,
        role: 'manager'
      }
    })

    revalidatePath(`/admin/associations/${associationId}`)

    return {
      success: true,
      message: user.inviteToken 
        ? 'Convite enviado com sucesso! O usuário receberá um email para definir sua senha.'
        : 'Usuário adicionado como gerente com sucesso!',
      inviteToken: user.inviteToken || undefined
    }

  } catch (error) {
    console.error('Erro ao convidar gerente:', error)
    return {
      success: false,
      message: 'Erro interno do servidor. Tente novamente.'
    }
  }
}

export async function getAssociationManagers(associationId: string): Promise<AssociationManager[]> {
  try {
    const members = await prisma.associationMember.findMany({
      where: {
        associationId,
        role: 'manager'
      },
      include: {
        User: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return members.map(member => ({
      id: member.User.id,
      name: member.User.name,
      email: member.User.email,
      role: member.role,
      createdAt: member.createdAt,
      isActive: member.User.isActive
    }))

  } catch (error) {
    console.error('Erro ao buscar gerentes:', error)
    return []
  }
}

export async function removeManager(
  userId: string,
  associationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.associationMember.delete({
      where: {
        userId_associationId: {
          userId,
          associationId
        }
      }
    })

    revalidatePath(`/admin/associations/${associationId}`)

    return {
      success: true,
      message: 'Gerente removido com sucesso!'
    }

  } catch (error) {
    console.error('Erro ao remover gerente:', error)
    return {
      success: false,
      message: 'Erro ao remover gerente. Tente novamente.'
    }
  }
}

export async function activateUserAccount(
  inviteToken: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { inviteToken }
    })

    if (!user) {
      return {
        success: false,
        message: 'Token de convite inválido'
      }
    }

    if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
      return {
        success: false,
        message: 'Token de convite expirado'
      }
    }

    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        isActive: true,
        inviteToken: null,
        inviteTokenExpiry: null
      }
    })

    return {
      success: true,
      message: 'Conta ativada com sucesso!'
    }

  } catch (error) {
    console.error('Erro ao ativar conta:', error)
    return {
      success: false,
      message: 'Erro ao ativar conta. Tente novamente.'
    }
  }
}