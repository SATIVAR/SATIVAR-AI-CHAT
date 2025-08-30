import { NextRequest, NextResponse } from 'next/server';
import { getAssociationBySubdomain } from '@/lib/services/association.service';
import { createWordPressApiService } from '@/lib/services/wordpress-api.service';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get association
    const association = await prisma.association.findUnique({
      where: { id },
    });
    
    if (!association) {
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    // Test WordPress connection
    const wpService = createWordPressApiService(association);
    const result = await wpService.testConnection();
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error testing WordPress connection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao testar conexão com WordPress' 
      },
      { status: 500 }
    );
  }
}