import { NextRequest, NextResponse } from 'next/server';
import { getAssociationStats } from '@/lib/services/association.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const stats = await getAssociationStats(id);
    
    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Error getting association stats:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}