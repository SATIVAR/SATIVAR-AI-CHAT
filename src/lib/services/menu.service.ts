
import prisma from '@/lib/prisma';
import { ProductCategory, Product } from '@prisma/client';
import { ProductCategory as CategoryType, Product as ProductType } from '@/lib/types';

// Temporary default association ID - should be replaced with proper tenant resolution
const DEFAULT_ASSOCIATION_ID = 'cmevpxdbf0000tmmw9106u0s2';

// ===== CATEGORY METHODS =====

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

export async function createCategory(
  categoryData: Omit<CategoryType, 'id' | 'createdAt' | 'updatedAt' | 'associationId'>,
  associationId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const category = await prisma.productCategory.create({
      data: {
        ...categoryData,
        associationId: associationId || DEFAULT_ASSOCIATION_ID
      }
    });
    return { success: true, id: category.id };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function updateCategory(
  id: string,
  categoryData: Partial<Omit<CategoryType, 'id' | 'createdAt' | 'updatedAt' | 'associationId'>>,
  associationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.productCategory.update({
      where: { 
        id,
        associationId: associationId || DEFAULT_ASSOCIATION_ID 
      },
      data: {
        ...categoryData,
        updatedAt: new Date()
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error: 'Failed to update category' };
  }
}

export async function deleteCategory(
  id: string,
  associationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.productCategory.update({
      where: { 
        id,
        associationId: associationId || DEFAULT_ASSOCIATION_ID 
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'Failed to delete category' };
  }
}

// ===== PRODUCT METHODS =====

export async function getAllProducts(associationId?: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { 
      isActive: true,
      associationId: associationId || DEFAULT_ASSOCIATION_ID 
    },
  });
  return products;
}

export async function getProducts({
  categoryId,
  page = 1,
  limit = 10,
  associationId
}: {
  categoryId?: string;
  page?: number;
  limit?: number;
  associationId?: string;
}): Promise<{ products: Product[]; totalPages: number }> {
  const skip = (page - 1) * limit;
  
  const where = {
    isActive: true,
    associationId: associationId || DEFAULT_ASSOCIATION_ID,
    ...(categoryId && { categoryId })
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count({ where })
  ]);

  return {
    products,
    totalPages: Math.ceil(total / limit)
  };
}

export async function createProduct(
  productData: Omit<ProductType, 'id' | 'createdAt' | 'updatedAt' | 'associationId'>,
  associationId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const product = await prisma.product.create({
      data: {
        ...productData,
        associationId: associationId || DEFAULT_ASSOCIATION_ID
      }
    });
    return { success: true, id: product.id };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, error: 'Failed to create product' };
  }
}

export async function updateProduct(
  id: string,
  productData: Partial<Omit<ProductType, 'id' | 'createdAt' | 'updatedAt' | 'associationId'>>,
  associationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.product.update({
      where: { 
        id,
        associationId: associationId || DEFAULT_ASSOCIATION_ID 
      },
      data: {
        ...productData,
        updatedAt: new Date()
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: 'Failed to update product' };
  }
}

export async function deleteProduct(
  id: string,
  associationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.product.update({
      where: { 
        id,
        associationId: associationId || DEFAULT_ASSOCIATION_ID 
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}
