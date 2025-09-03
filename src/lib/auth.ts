import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

export interface UserSession {
  id: string
  email: string
  name: string
  role?: 'super_admin' | 'manager'
  associationId?: string
  associationName?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function getUserSession(email: string): Promise<UserSession | null> {
  // Primeiro verifica se é um super admin (Owner)
  const owner = await prisma.owner.findUnique({
    where: { email },
    include: {
      Association: true
    }
  })

  if (owner) {
    return {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: 'super_admin',
      associationId: owner.associationId,
      associationName: owner.Association.name
    }
  }

  // Verifica se é um usuário com permissões de manager
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      AssociationMembers: {
        include: {
          Association: true
        }
      }
    }
  })

  if (user && user.AssociationMembers.length > 0) {
    const membership = user.AssociationMembers[0] // Por enquanto, um usuário só pode ter uma associação
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
      associationId: membership.associationId,
      associationName: membership.Association.name
    }
  }

  return null
}

export async function authenticateUser(email: string, password: string): Promise<UserSession | null> {
  // Primeiro tenta autenticar como Owner (super admin)
  const owner = await prisma.owner.findUnique({
    where: { email },
    include: {
      Association: true
    }
  })

  if (owner && await verifyPassword(password, owner.passwordHash)) {
    return {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: 'super_admin',
      associationId: owner.associationId,
      associationName: owner.Association.name
    }
  }

  // Tenta autenticar como User (manager)
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      AssociationMembers: {
        include: {
          Association: true
        }
      }
    }
  })

  if (user && user.passwordHash && await verifyPassword(password, user.passwordHash)) {
    const membership = user.AssociationMembers[0]
    if (membership) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        associationId: membership.associationId,
        associationName: membership.Association.name
      }
    }
    
    // Se não tem associação mas tem senha, pode ser um super admin global
    if (user.email === 'admin@sativar.com.br') {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'super_admin'
      }
    }
  }

  return null
}

export async function getUserSessionFromRequest(request: Request): Promise<UserSession | null> {
  try {
    // Extract session from cookie
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const authCookie = cookieHeader
      .split('; ')
      .find(row => row.startsWith('auth-session='));
    
    if (!authCookie) return null;

    const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
    return sessionData as UserSession;
  } catch (error) {
    console.error('Error parsing session from request:', error);
    return null;
  }
}