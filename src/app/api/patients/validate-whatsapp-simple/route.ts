import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] validate-whatsapp-simple called - Fase 2 Implementation');
    
    // Get slug from query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }
    
    console.log('[API] Slug:', slug);
    
    // Get association
    const { getAssociationBySubdomain } = await import('@/lib/services/association.service');
    const association = await getAssociationBySubdomain(slug);
    
    if (!association || !association.isActive) {
      return NextResponse.json({ error: 'Associação não encontrada' }, { status: 404 });
    }
    
    console.log('[API] Association found:', association.name);
    
    const body = await request.json();
    const { whatsapp } = body;
    
    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp é obrigatório' }, { status: 400 });
    }
    
    // Clean WhatsApp number
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    
    if (cleanWhatsapp.length < 10) {
      return NextResponse.json({ error: 'WhatsApp deve ter pelo menos 10 dígitos' }, { status: 400 });
    }
    
    console.log('[API] Clean WhatsApp:', cleanWhatsapp);
    
    // Fase 2: Primeiro verificar no WordPress usando o endpoint ACF específico
    try {
      console.log('[API] Fase 2: Checking WordPress ACF endpoint for patient');
      
      const { WordPressApiService } = await import('@/lib/services/wordpress-api.service');
      const wordpressService = new WordPressApiService(association);
      const wordpressUser = await wordpressService.findUserByPhone(cleanWhatsapp);
      
      if (wordpressUser && wordpressUser.acf) {
        console.log('[API] Caminho A: Paciente encontrado no WordPress - Sincronização Completa');
        
        // Sincronizar com dados ACF completos
        const { syncPatientWithWordPressACF } = await import('@/lib/services/patient.service');
        const syncResult = await syncPatientWithWordPressACF(
          cleanWhatsapp,
          wordpressUser,
          association.id
        );
        
        if (syncResult.success && syncResult.data) {
          console.log('[API] Patient synchronized successfully from WordPress');
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
              source: 'wordpress_acf_synced'
            },
            message: 'Paciente encontrado e sincronizado com dados completos do WordPress'
          });
        }
      }
      
    } catch (wordpressError) {
      console.log('[API] WordPress ACF lookup failed, proceeding with lead capture:', wordpressError);
    }
    
    // Verificar se já existe no SatiZap (pode ter sido criado anteriormente)
    const { findPatientByWhatsapp } = await import('@/lib/services/patient.service');
    const existingPatient = await findPatientByWhatsapp(cleanWhatsapp, association.id);
    
    if (existingPatient) {
      console.log('[API] Existing patient found in SatiZap:', existingPatient.name);
      return NextResponse.json({
        status: 'patient_found',
        syncType: 'existing_satizap',
        patient: {
          id: existingPatient.id,
          name: existingPatient.name,
          whatsapp: cleanWhatsapp,
          status: existingPatient.status,
          source: 'satizap'
        }
      });
    }
    
    // Caminho B: Paciente NÃO encontrado - Preparar para captura de lead
    console.log('[API] Caminho B: Paciente NÃO encontrado - Preparar captura de lead');
    
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
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}