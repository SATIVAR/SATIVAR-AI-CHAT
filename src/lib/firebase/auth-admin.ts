
'use server';
export const revalidate = 0;

import bcrypt from 'bcryptjs';
import { db } from './admin';

export async function doesOwnerExist(): Promise<boolean> {
  console.log("==> Verificando se o dono existe...");
  try {
    const snapshot = await db.collection('owners').limit(1).get();
    if (snapshot.empty) {
      console.log("==> Nenhum dono encontrado.");
      return false;
    }
    console.log("==> Dono encontrado.");
    return !snapshot.empty;
  } catch (error) {
    console.error("!!! ERRO CRÍTICO em doesOwnerExist:", error);
    // Em caso de erro, previna o registro por segurança, assumindo que um dono pode existir.
    return true; 
  }
}

export async function registerOwner(data: any): Promise<{ success: boolean, error?: string }> {
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
    
    await db.collection('owners').add({
      email,
      passwordHash,
      name,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error registering owner:", error);
    return { success: false, error: error.message || 'Erro desconhecido no servidor.' };
  }
}

export async function loginOwner(credentials: any): Promise<{ success: boolean, error?: string }> {
    try {
        const { email, password } = credentials;
        if (!email || !password) {
            return { success: false, error: 'Email e senha são obrigatórios.' };
        }

        const snapshot = await db.collection('owners').where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        const ownerDoc = snapshot.docs[0];
        const owner = ownerDoc.data();

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
