import { NextRequest, NextResponse } from 'next/server';
import { sanitizePhone, isValidPhone } from '@/lib/utils/phone';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] validate-whatsapp-simple called - Fase 2 & 3 Implementation');
    
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
    
    // Log 1 (Entrada): Registrar o número exatamente como recebido
    console.log('[FASE 1 - LOG 1] WhatsApp recebido do formulário:', whatsapp);
    
    // Fase 1: Sanitização no Backend - usar função utilitária
    const cleanWhatsapp = sanitizePhone(whatsapp);
    
    // Log 2 (Normalização): Registrar após sanitização
    console.log('[FASE 1 - LOG 2] WhatsApp após sanitização:', cleanWhatsapp);
    
    if (!isValidPhone(cleanWhatsapp)) {
      return NextResponse.json({ error: 'WhatsApp deve ter entre 10 e 11 dígitos' }, { status: 400 });
    }
    
    // Fase 2: Verificar no WordPress e retornar dados estruturados
    try {
      console.log('[API] Fase 2: Checking WordPress ACF endpoint for patient');
      
      const { WordPressApiService } = await import('@/lib/services/wordpress-api.service');
      const wordpressService = new WordPressApiService(association);
      
      // Log 3 (Construção da Requisição): URL que será chamada
      const baseUrl = association.wordpressUrl.replace(/\/$/, ''); // Remove trailing slash
      const wordpressUrl = `${baseUrl}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${cleanWhatsapp}`;
      console.log('[FASE 1 - LOG 3] URL construída para WordPress:', wordpressUrl);
      
      // CORREÇÃO FASE 1: Garantir que apenas o endpoint correto seja usado
      const wordpressUser = await wordpressService.findUserByPhone(cleanWhatsapp);
      
      // Log 4 (Resposta Bruta): Status e dados da resposta do WordPress
      console.log('[FASE 1 - LOG 4] Resposta do WordPress:', {
        found: !!wordpressUser,
        userData: wordpressUser ? {
          id: wordpressUser.id,
          name: wordpressUser.name,
          hasAcf: !!wordpressUser.acf
        } : null
      });
      
      if (wordpressUser && wordpressUser.acf) {
        console.log('[API] FASE 1 - CORREÇÃO: Paciente encontrado no WordPress - Sincronização Completa');
        console.log('[API] FASE 1 - CORREÇÃO: Dados ACF recebidos do WordPress:', {
          hasAcf: !!wordpressUser.acf,
          acfKeys: Object.keys(wordpressUser.acf),
          acfData: wordpressUser.acf
        });
        
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
            patientData: {
              id: syncResult.data.id,
              name: syncResult.data.name,
              whatsapp: cleanWhatsapp,
              status: syncResult.data.status,
              cpf: syncResult.data.cpf,
              tipo_associacao: syncResult.data.tipo_associacao,
              nome_responsavel: syncResult.data.nome_responsavel,
              cpf_responsavel: syncResult.data.cpf_responsavel,
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
        patientData: {
          id: existingPatient.id,
          name: existingPatient.name,
          whatsapp: cleanWhatsapp,
          status: existingPatient.status,
          cpf: existingPatient.cpf,
          tipo_associacao: existingPatient.tipo_associacao,
          nome_responsavel: existingPatient.nome_responsavel,
          cpf_responsavel: existingPatient.cpf_responsavel,
          source: 'satizap'
        }
      });
    }
    
    // Caminho B: Paciente NÃO encontrado - Preparar para captura de lead
    console.log('[API] Caminho B: Paciente NÃO encontrado - Preparar captura de lead');
    
    return NextResponse.json({
      status: 'new_patient_step_2',
      syncType: 'lead_capture',
      message: 'Paciente não encontrado. Prosseguir para coleta de dados básicos.',
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
        details: error instanceof Error ? error.message : String(error),
        status: 'error'
      },
      { status: 500 }
    );
  }
}