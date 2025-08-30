'use server';

import { revalidatePath } from 'next/cache';
import { updateClient, createClient } from '@/lib/services/client.service';
import { Client } from '@/lib/types';

export async function saveClientAction(clientData: Partial<Client>) {
  try {
    let result;
    if (clientData.id) {
      const { id, ...dataToUpdate } = clientData;
      result = await updateClient(id, dataToUpdate);
    } else {
      // @ts-ignore
      result = await createClient(clientData);
    }
    revalidatePath('/admin/clients');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving client:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao salvar cliente' 
    };
  }
}

export async function deleteClientAction(id: string) {
  try {
    const result = await updateClient(id, { isActive: false }); // Soft delete
    revalidatePath('/admin/clients');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao excluir cliente' 
    };
  }
}