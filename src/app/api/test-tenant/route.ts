import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    console.log('[TEST] Slug received:', slug);
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }
    
    // Simple test to get association
    const { getAssociationBySubdomain } = await import('@/lib/services/association.service');
    const association = await getAssociationBySubdomain(slug);
    
    console.log('[TEST] Association found:', association ? association.name : 'null');
    
    if (!association) {
      return NextResponse.json({ error: 'Association not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      association: {
        id: association.id,
        name: association.name,
        subdomain: association.subdomain || slug,
        isActive: association.isActive
      }
    });
    
  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}