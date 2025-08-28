
import prisma from '@/lib/prisma';
import { ProductCategory, Product } from '@prisma/client';

export async function getAllCategories(): Promise<ProductCategory[]> {
  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });
  return categories;
}

export async function getAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });
  return products;
}
