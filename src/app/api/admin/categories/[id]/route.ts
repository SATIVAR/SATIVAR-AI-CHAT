import { NextRequest, NextResponse } from 'next/server';
import { deleteCategory } from '@/lib/services/menu.service';

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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