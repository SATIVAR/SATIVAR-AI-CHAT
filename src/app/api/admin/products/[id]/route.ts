import { NextRequest, NextResponse } from 'next/server';
import { deleteProduct } from '@/lib/services/menu.service';

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await deleteProduct(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}