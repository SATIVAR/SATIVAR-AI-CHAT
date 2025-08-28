
'use server';

import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { Owner } from '@prisma/client';
import { createAssociation } from './association.service';

interface RegisterOwnerData {
  name: string;
  email: string;
  password: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export async function doesOwnerExist(): Promise<boolean> {
  const count = await prisma.owner.count();
  return count > 0;
}

export async function registerOwner(data: RegisterOwnerData): Promise<{ success: boolean; error?: string }> {
  try {
    const ownerExists = await doesOwnerExist();
    if (ownerExists) {
      return { success: false, error: 'Um proprietário já está cadastrado.' };
    }

    const { email, password, name } = data;
    if (!email || !password || !name) {
      return { success: false, error: 'Todos os campos são obrigatórios.' };
    }

    // Check if there's already an association (for existing setup)
    let associationId;
    const existingAssociation = await prisma.association.findFirst({
      where: { isActive: true }
    });
    
    if (existingAssociation) {
      associationId = existingAssociation.id;
      console.log('Using existing association:', existingAssociation.name);
    } else {
      // Create association for the initial setup
      const associationData = {
        name: `${name}'s Restaurant`,
        subdomain: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        wordpressUrl: 'https://example.com', // Default value - can be updated later
        wordpressAuth: {
          apiKey: '',
          username: '',
          password: ''
        }
      };

      const associationResult = await createAssociation(associationData);
      if (!associationResult.success || !associationResult.data) {
        console.error('Failed to create association:', associationResult.error);
        return { success: false, error: 'Erro ao criar estabelecimento.' };
      }
      associationId = associationResult.data.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.owner.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        name,
        associationId,
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error registering owner:", error);
    return { success: false, error: error.code === 'P2002' ? 'Este email já está em uso.' : 'Erro desconhecido no servidor.' };
  }
}

export async function loginOwner(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
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
