import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time Firebase calls
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Dynamic import to avoid build-time Firebase initialization
    const { getAllCategories } = await import('@/lib/firebase/categories');
    const categories = await getAllCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { createCategory } = await import('@/lib/firebase/categories');
    const formData = await request.formData();
    
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      order: Number(formData.get('order')),
      imageUrl: formData.get('imageUrl') as string,
      nextStepSuggestion: formData.get('nextStepSuggestion') as string,
      isActive: formData.get('isActive') === 'true',
    };

    const result = await createCategory(categoryData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { updateCategory } = await import('@/lib/firebase/categories');
    const formData = await request.formData();
    const id = formData.get('id') as string;
    
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      order: Number(formData.get('order')),
      imageUrl: formData.get('imageUrl') as string,
      nextStepSuggestion: formData.get('nextStepSuggestion') as string,
      isActive: formData.get('isActive') === 'true',
    };

    const result = await updateCategory(id, categoryData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}