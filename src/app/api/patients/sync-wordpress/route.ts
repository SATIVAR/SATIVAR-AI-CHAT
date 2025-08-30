import { NextRequest, NextResponse } from 'next/server';
import { syncPatientWithWordPressACF, createPatientLead } from '@/lib/services/patient.service';
import { getTenantContext } from '@/lib/middleware/tenant';

interface WordPressSyncRequest {
  whatsapp: string;
  wordpressData?: any; // Dados retornados da API do WordPress com ACF
  leadData?: {
    name: string;
    cpf: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('[API] sync-wordpress called - Fase 2 Implementation');
  try {
    // Get tenant context
    let tenantContext = null;
    
    const tenantId = request.headers.get('X-Tenant-ID');
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain');
    
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (tenantId && tenantSubdomain) {
      const { getAssociationById } = await import('@/lib/services/association.service');
      const association = await getAssociationById(tenantId);
      
      if (association && association.isActive) {
        tenantContext = {
          association,
          subdomain: tenantSubdomain
        };
      }
    } else if (slug) {
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
        { status: 400 }
      );
    }

    const body: WordPressSyncRequest = await request.json();
    const { whatsapp, wordpressData, leadData } = body;

    console.log('[API] Sync request received:', {
      whatsapp: whatsapp ? 'provided' : 'missing',
      hasWordPressData: !!wordpressData,
      hasLeadData: !!leadData
    });

    // Validate required fields
    if (!whatsapp) {
      return NextResponse.json(
        { error: 'WhatsApp é obrigatório' },
        { status: 400 }
      );
    }

    // Clean WhatsApp number
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    
    if (cleanWhatsapp.length < 10) {
      return NextResponse.json(
        { error: 'WhatsApp deve ter pelo menos 10 dígitos' },
        { status: 400 }
      );
    }

    let result;

    if (wordpressData) {
      // Fase 2: Caminho A - Paciente encontrado no WordPress (Sincronização Completa)
      console.log('[API] Processing WordPress member synchronization');
      
      result = await syncPatientWithWordPressACF(
        cleanWhatsapp, 
        wordpressData, 
        tenantContext.association.id
      );
      
      if (result.success) {
        console.log('[API] WordPress member synchronized successfully');
        return NextResponse.json({
          success: true,
          patient: result.data,
          syncType: 'wordpress_member',
          message: 'Paciente sincronizado com dados completos do WordPress',
          association: {
            id: tenantContext.association.id,
            name: tenantContext.association.name,
            subdomain: tenantContext.subdomain,
          },
        });
      }
      
    } else if (leadData) {
      // Fase 2: Caminho B - Paciente NÃO encontrado (Criar LEAD)
      console.log('[API] Processing lead creation');
      
      if (!leadData.name || !leadData.cpf) {
        return NextResponse.json(
          { error: 'Nome e CPF são obrigatórios para criar lead' },
          { status: 400 }
        );
      }
      
      result = await createPatientLead(
        cleanWhatsapp,
        leadData.name.trim(),
        leadData.cpf.replace(/\D/g, ''),
        tenantContext.association.id
      );
      
      if (result.success) {
        console.log('[API] Lead created successfully');
        return NextResponse.json({
          success: true,
          patient: result.data,
          syncType: 'lead_created',
          message: 'Lead capturado com dados básicos. Informações adicionais serão coletadas durante a conversa.',
          association: {
            id: tenantContext.association.id,
            name: tenantContext.association.name,
            subdomain: tenantContext.subdomain,
          },
        });
      }
      
    } else {
      return NextResponse.json(
        { error: 'Dados do WordPress ou dados do lead são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Handle errors
    if (!result || !result.success) {
      console.error('[API] Sync operation failed:', result?.error);
      return NextResponse.json(
        { error: result?.error || 'Erro ao processar sincronização' },
        { status: 500 }
      );
    }

    // This should not be reached, but just in case
    return NextResponse.json({
      success: true,
      patient: result.data,
      syncType: wordpressData ? 'wordpress_member' : 'lead_created',
      association: {
        id: tenantContext.association.id,
        name: tenantContext.association.name,
        subdomain: tenantContext.subdomain,
      },
    });

  } catch (error) {
    console.error('[API] Error in WordPress sync (Fase 2):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}