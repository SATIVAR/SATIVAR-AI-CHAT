import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';

export async function GET(request: NextRequest) {
  try {
    // Get tenant context from middleware
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      association: {
        id: tenantContext.association.id,
        name: tenantContext.association.name,
        subdomain: tenantContext.subdomain,
      }
    });

  } catch (error) {
    console.error('Error getting tenant info:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}