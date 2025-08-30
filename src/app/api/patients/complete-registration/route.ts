import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';
import { createPatientLead } from '@/lib/services/patient.service';

export async function POST(request: NextRequest) {
  console.log('[API] complete-registration called - Fase 2 Implementation');
  try {
    // Get tenant context from middleware headers or fallback to direct lookup
    let tenantContext = null;
    
    const tenantId = request.headers.get('X-Tenant-ID');
    const tenantSubdomain = request.headers.get('X-Tenant-Subdomain');
    
    // Also check for slug in query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (tenantId && tenantSubdomain) {
      // Use headers from middleware
      const { getAssociationById } = await import('@/lib/services/association.service');
      const association = await getAssociationById(tenantId);
      
      if (association && association.isActive) {
        tenantContext = {
          association,
          subdomain: tenantSubdomain
        };
      }
    } else if (slug) {
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
      // Fallback: try to get tenant context directly
      tenantContext = await getTenantContext(request);
    }
    
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, cpf, whatsapp } = body;

    console.log('[API] Registration data received:', {
      name: name ? 'provided' : 'missing',
      cpf: cpf ? 'provided' : 'missing',
      whatsapp: whatsapp ? 'provided' : 'missing'
    });

    if (!name || !cpf || !whatsapp) {
      return NextResponse.json(
        { error: 'Nome, CPF e WhatsApp são obrigatórios' },
        { status: 400 }
      );
    }

    // Clean inputs
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanName = name.trim();

    if (cleanWhatsapp.length < 10) {
      return NextResponse.json(
        { error: 'WhatsApp deve ter pelo menos 10 dígitos' },
        { status: 400 }
      );
    }

    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve ter 11 dígitos' },
        { status: 400 }
      );
    }

    // Fase 2: Caminho B - Criar LEAD no SatiZap
    // Após o envio, o SatiZap cria um registro local na tabela Pacientes com o status definido como 'LEAD'
    // O wordpress_id como NULL, e preenche apenas os campos nome e cpf que foram coletados
    // Todos os outros novos campos (tipo_associacao, etc.) permanecem NULL
    
    console.log('[API] Fase 2: Creating patient lead');
    
    const leadResult = await createPatientLead(
      cleanWhatsapp,
      cleanName,
      cleanCpf,
      tenantContext.association.id
    );

    if (!leadResult.success || !leadResult.data) {
      console.error('[API] Failed to create patient lead:', leadResult.error);
      return NextResponse.json(
        { error: leadResult.error || 'Erro ao criar lead do paciente' },
        { status: 500 }
      );
    }

    console.log('[API] Patient lead created successfully:', leadResult.data.id);

    return NextResponse.json({
      success: true,
      patient: {
        id: leadResult.data.id,
        name: leadResult.data.name,
        whatsapp: leadResult.data.whatsapp,
        cpf: leadResult.data.cpf,
        status: leadResult.data.status, // Should be 'LEAD'
        wordpress_id: leadResult.data.wordpress_id, // Should be NULL
      },
      syncType: 'lead_created',
      message: 'Lead capturado com sucesso. Informações adicionais serão coletadas durante a conversa com a IA.',
      association: {
        id: tenantContext.association.id,
        name: tenantContext.association.name,
        subdomain: tenantContext.subdomain,
      },
    });

  } catch (error) {
    console.error('[API] Error completing patient registration (Fase 2):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}