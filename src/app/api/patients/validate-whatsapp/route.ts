import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';
import { WordPressApiService } from '@/lib/services/wordpress-api.service';
import { syncPatientWithWordPressACF } from '@/lib/services/patient.service';

export async function POST(request: NextRequest) {
  console.log('[API] validate-whatsapp called - Fase 2 Implementation');
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
      console.log('[API] No tenant context found');
      return NextResponse.json(
        { error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    console.log('[API] Tenant context found:', tenantContext.subdomain);
    const body = await request.json();
    const { whatsapp } = body;
    console.log('[API] WhatsApp received:', whatsapp);

    if (!whatsapp) {
      return NextResponse.json(
        { error: 'WhatsApp é obrigatório' },
        { status: 400 }
      );
    }

    // Clean WhatsApp number (remove non-digits)
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    
    if (cleanWhatsapp.length < 10) {
      return NextResponse.json(
        { error: 'WhatsApp deve ter pelo menos 10 dígitos' },
        { status: 400 }
      );
    }

    // Fase 2: Refatoração da Lógica de Sincronização no Onboarding
    // O gatilho continua sendo o envio do WhatsApp pelo formulário de onboarding
    // O backend do SatiZap agora usará o endpoint de busca específico: GET .../clientes?acf_filters[telefone]={whatsapp}
    
    try {
      console.log('[API] Fase 2: Checking WordPress ACF endpoint for patient with WhatsApp:', cleanWhatsapp);
      
      const wordpressService = new WordPressApiService(tenantContext.association);
      const wordpressUser = await wordpressService.findUserByPhone(cleanWhatsapp);
      
      if (wordpressUser && wordpressUser.acf) {
        console.log('[API] Caminho A: Paciente Encontrado no WordPress - Sincronização Completa');
        console.log('[API] WordPress user found with ACF data:', {
          id: wordpressUser.id,
          name: wordpressUser.name,
          acf: Object.keys(wordpressUser.acf)
        });
        
        // Caminho A: Paciente Encontrado no WordPress (Sincronização Completa)
        // A lógica de atualização/inserção no backend do SatiZap será refatorada
        // Ela irá analisar o objeto acf completo recebido e preencher todas as colunas correspondentes
        const syncResult = await syncPatientWithWordPressACF(
          cleanWhatsapp,
          wordpressUser,
          tenantContext.association.id
        );
        
        if (syncResult.success && syncResult.data) {
          console.log('[API] Patient synchronized successfully:', syncResult.data.id);
          
          return NextResponse.json({
            status: 'patient_found',
            syncType: 'wordpress_member',
            patient: {
              id: syncResult.data.id,
              name: syncResult.data.name,
              whatsapp: cleanWhatsapp,
              status: syncResult.data.status,
              cpf: syncResult.data.cpf,
              tipo_associacao: syncResult.data.tipo_associacao,
              nome_responsavel: syncResult.data.nome_responsavel,
              cpf_responsavel: syncResult.data.cpf_responsavel,
              wordpress_id: syncResult.data.wordpress_id,
              source: 'wordpress_acf_synced'
            },
            message: 'Paciente encontrado e sincronizado com dados completos do WordPress'
          });
        } else {
          console.error('[API] Failed to sync patient with WordPress data:', syncResult.error);
          return NextResponse.json(
            { error: syncResult.error || 'Erro ao sincronizar dados do paciente' },
            { status: 500 }
          );
        }
      }
      
    } catch (wordpressError) {
      console.log('[API] WordPress ACF lookup failed, proceeding with lead capture flow:', wordpressError);
      // Continue to lead capture flow if WordPress fails
    }

    // Caminho B: Paciente NÃO Encontrado (Captura de Lead)
    // Lógica Inalterada (Propositalmente): Este fluxo se mantém intencionalmente simples para não criar atrito
    console.log('[API] Caminho B: Paciente NÃO Encontrado - Captura de Lead');
    
    // O WordPress retorna 404 ou não encontra o paciente
    // O SatiZap instrui o frontend a avançar para a etapa de coleta de Nome Completo e CPF
    return NextResponse.json({
      status: 'new_patient_step_2',
      syncType: 'lead_capture',
      message: 'Paciente não encontrado no WordPress. Prosseguir para coleta de dados básicos (Nome e CPF).',
      instructions: {
        nextStep: 'collect_basic_data',
        requiredFields: ['name', 'cpf'],
        leadStatus: true
      }
    });

  } catch (error) {
    console.error('[API] Error in WhatsApp validation (Fase 2):', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}