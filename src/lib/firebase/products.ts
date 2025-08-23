
'use server';

import { db } from './admin';
import { Product } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Helper function to convert Firestore timestamp to a serializable Date object
const toSerializableDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    // Handle cases where it might already be a Date object or a string
    return new Date(timestamp);
};


export async function createProduct(data: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.name || !data.price || !data.categoryId) {
      return { success: false, error: 'Nome, preço e categoria são obrigatórios.' };
    }
    await db.collection('products').add({
      ...data,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, error: 'Falha ao criar produto.' };
  }
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('products').doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: 'Falha ao atualizar produto.' };
  }
}


export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real-world scenario, you might want to check if this product is in any active orders
    // before deleting, but for now a soft-delete (or hard) is fine.
    await db.collection('products').doc(id).update({ isActive: false }); // Soft-delete
    // await db.collection('products').doc(id).delete(); // Hard-delete
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: 'Falha ao excluir produto.' };
  }
}

export async function getProducts(options: { categoryId?: string; page?: number; limit?: number }) {
  const { categoryId, page = 1, limit = 10 } = options;
  
  let query: FirebaseFirestore.Query = db.collection('products').where('isActive', '==', true);

  if (categoryId) {
    query = query.where('categoryId', '==', categoryId);
  }

  const snapshot = await query.get();

  let products: Product[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toSerializableDate(data.createdAt),
      updatedAt: toSerializableDate(data.updatedAt),
    } as Product;
  });

  // Sort in-memory to avoid composite indexes
  products.sort((a, b) => a.name.localeCompare(b.name));

  const totalProducts = products.length;
  const paginatedProducts = products.slice((page - 1) * limit, page * limit);

  return {
    products: paginatedProducts,
    total: totalProducts,
    totalPages: Math.ceil(totalProducts / limit),
  };
}
