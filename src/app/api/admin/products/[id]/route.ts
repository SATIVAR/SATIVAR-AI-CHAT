import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time Firebase calls
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { deleteProduct } = await import('@/lib/firebase/products');
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