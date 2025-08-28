import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/types';

// Force dynamic rendering to avoid build-time Firebase calls
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { getProducts } = await import('@/lib/firebase/products');
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const categoryId = searchParams.get('category') || undefined;

    const productsData = await getProducts({ categoryId, page, limit });
    return NextResponse.json({ 
      success: true, 
      products: productsData.products,
      totalPages: productsData.totalPages 
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { createProduct, updateProduct } = await import('@/lib/firebase/products');
    const formData = await request.formData();
    const productId = formData.get('id') as string | null;

    const productData: Partial<Product> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      imageUrl: (formData.get('imageUrl') as string) || 'https://placehold.co/600x400.png',
      categoryId: formData.get('categoryId') as string,
      isActive: formData.get('isActive') === 'true',
      isFeatured: formData.get('isFeatured') === 'true',
    };

    let result;
    if (productId) {
      result = await updateProduct(productId, productData);
    } else {
      result = await createProduct(productData);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save product' },
      { status: 500 }
    );
  }
}