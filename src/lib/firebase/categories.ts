
import { db } from './admin';
import { ProductCategory } from '../types';


export async function getAllCategories(): Promise<ProductCategory[]> {
  const snapshot = await db.collection('categories').where('isActive', '==', true).orderBy('order').get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductCategory));
}
