
import prisma from '@/lib/prisma';
import { ProductCategory, Product } from '@prisma/client';

// Temporary default association ID - should be replaced with proper tenant resolution
const DEFAULT_ASSOCIATION_ID = 'cmevpxdbf0000tmmw9106u0s2';

export async function getAllCategories(associationId?: string): Promise<ProductCategory[]> {
  const categories = await prisma.productCategory.findMany({
    where: { 
      isActive: true,
      associationId: associationId || DEFAULT_ASSOCIATION_ID 
    },
    orderBy: { order: 'asc' }
  });
  return categories;
}

export async function getAllProducts(associationId?: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { 
      isActive: true,
      associationId: associationId || DEFAULT_ASSOCIATION_ID 
    },
  });
  return products;
}
