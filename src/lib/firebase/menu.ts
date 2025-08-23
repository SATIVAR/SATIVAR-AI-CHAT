
import { db } from './admin';
import { ProductCategory, Product } from '../types';

export async function getAllCategories(): Promise<ProductCategory[]> {
  const snapshot = await db().collection('categories').where('isActive', '==', true).orderBy('order').get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductCategory));
}

export async function getAllProducts(): Promise<Product[]> {
  const snapshot = await db().collection('products').where('isActive', '==', true).get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}
