
import { db } from './admin';
import { ProductCategory } from '../types';
import { Timestamp } from 'firebase-admin/firestore';


const toSerializableDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
};


export async function getAllCategories(): Promise<ProductCategory[]> {
  const snapshot = await db.collection('categories').where('isActive', '==', true).orderBy('order').get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      createdAt: toSerializableDate(data.createdAt),
      updatedAt: toSerializableDate(data.updatedAt),
    } as ProductCategory
  });
}


export async function createCategory(data: Partial<ProductCategory>): Promise<{success: boolean, error?: string}> {
  try {
    if (!data.name) {
      return { success: false, error: 'O nome da categoria é obrigatório.' };
    }
    await db.collection('categories').add({
      ...data,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: 'Falha ao criar categoria.' };
  }
}

export async function updateCategory(id: string, data: Partial<ProductCategory>): Promise<{success: boolean, error?: string}> {
  try {
    await db.collection('categories').doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: 'Falha ao atualizar categoria.' };
  }
}

export async function deleteCategory(id: string): Promise<{success: boolean, error?: string}> {
   try {
    // Pro-tip: Check if there are products associated with this category before deleting.
    const productsSnapshot = await db.collection('products').where('categoryId', '==', id).limit(1).get();
    if (!productsSnapshot.empty) {
      return { success: false, error: 'Não é possível excluir. Existem produtos associados a esta categoria.' };
    }
    
    // For now, we'll do a soft delete by marking it as inactive.
    await db.collection('categories').doc(id).update({ isActive: false });
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: 'Falha ao excluir categoria.' };
  }
}
