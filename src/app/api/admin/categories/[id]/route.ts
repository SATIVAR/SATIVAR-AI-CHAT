import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time Firebase calls
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { deleteCategory } = await import('@/lib/firebase/categories');
    const { id } = params;
    const result = await deleteCategory(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}