import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';

export async function GET(request: NextRequest) {
  try {
    // Get tenant info from middleware headers
    const tenantId = request.headers.get('X-Tenant-ID');
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain');
    const tenantName = request.headers.get('X-Tenant-Name');
    
    // Also check for slug in query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!tenantId || !tenantSubdomain) {
      // Fallback: try to get tenant context directly or use slug
      let tenantContext = null;
      
      if (slug) {
        // Use slug to get association directly
        const { getAssociationBySubdomain } = await import('@/lib/services/association.service');
        const association = await getAssociationBySubdomain(slug);
        
        if (association && association.isActive) {
          tenantContext = {
            association,
            subdomain: slug
          };
        }
      } else {
        tenantContext = await getTenantContext(request);
      }
      
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
          isActive: tenantContext.association.isActive,
          // Public display information for welcome screen personalization
          publicDisplayName: tenantContext.association.publicDisplayName,
          logoUrl: tenantContext.association.logoUrl,
          welcomeMessage: tenantContext.association.welcomeMessage,
          descricaoPublica: tenantContext.association.descricaoPublica,
        }
      });
    }

    // Use headers from middleware
    const { getAssociationById } = await import('@/lib/services/association.service');
    const association = await getAssociationById(tenantId);
    
    if (!association || !association.isActive) {
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      association: {
        id: association.id,
        name: association.name,
        subdomain: tenantSubdomain,
        isActive: association.isActive,
        // Public display information for welcome screen personalization
        publicDisplayName: association.publicDisplayName,
        logoUrl: association.logoUrl,
        welcomeMessage: association.welcomeMessage,
        descricaoPublica: association.descricaoPublica,
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