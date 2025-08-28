
'use server';

import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { Owner } from '@prisma/client';

export async function doesOwnerExist(): Promise<boolean> {
  const count = await prisma.owner.count();
  return count > 0;
}

export async function registerOwner(data: Omit<Owner, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
  try {
    const ownerExists = await doesOwnerExist();
    if (ownerExists) {
      return { success: false, error: 'Um proprietário já está cadastrado.' };
    }

    const { email, password, name } = data;
    if (!email || !password || !name) {
      return { success: false, error: 'Todos os campos são obrigatórios.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.owner.create({
      data: {
        email,
        passwordHash,
        name,
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error registering owner:", error);
    return { success: false, error: error.code === 'P2002' ? 'Este email já está em uso.' : 'Erro desconhecido no servidor.' };
  }
}

export async function loginOwner(credentials: Pick<Owner, 'email' | 'password'>): Promise<{ success: boolean; error?: string }> {
    try {
        const { email, password } = credentials;
        if (!email || !password) {
            return { success: false, error: 'Email e senha são obrigatórios.' };
        }

        const owner = await prisma.owner.findUnique({
          where: { email }
        });

        if (!owner) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        const isPasswordCorrect = await bcrypt.compare(password, owner.passwordHash);

        if (!isPasswordCorrect) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        return { success: true };

    } catch (error: any) {
        console.error("Error during owner login:", error);
        return { success: false, error: error.message || 'Erro desconhecido no servidor.' };
    }
}
