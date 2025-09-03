import { NextRequest, NextResponse } from 'next/server';
import { findOrCreatePatient } from '@/lib/services/patient.service';
import { findOrCreateConversation, addMessage } from '@/lib/services/conversation.service';
import { getTenantContext } from '@/lib/middleware/tenant';
import { PatientFormData } from '@/lib/types';

interface PatientRegistrationRequest {
  name: string;
  whatsapp: string;
  email?: string;
  cpf?: string;
  tipo_associacao?: string;
  nome_responsavel?: string;
  cpf_responsavel?: string;
  status?: 'LEAD' | 'MEMBRO';
  wordpress_id?: string;
}

export async function POST(request: NextRequest) {
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
        { error: 'Invalid tenant or subdomain' },
        { status: 400 }
      );
    }

    const body: PatientRegistrationRequest = await request.json();
    const { name, whatsapp, email, cpf, tipo_associacao, nome_responsavel, cpf_responsavel, status, wordpress_id } = body;

    // Validate required fields
    if (!name || !whatsapp) {
      return NextResponse.json(
        { error: 'Nome e WhatsApp são obrigatórios' },
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

    const patientData: PatientFormData = {
      name: name.trim(),
      whatsapp: cleanWhatsapp,
      email: email?.trim() || undefined,
      cpf: cpf?.replace(/\D/g, '') || undefined,
      tipo_associacao: tipo_associacao?.trim() || undefined,
      nome_responsavel: nome_responsavel?.trim() || undefined,
      cpf_responsavel: cpf_responsavel?.replace(/\D/g, '') || undefined,
      status: status || 'LEAD',
      wordpress_id: wordpress_id?.toString() || undefined,
    };

    // Find or create patient within the association
    const patientResult = await findOrCreatePatient(patientData, tenantContext.association.id);
    
    if (!patientResult.success || !patientResult.data) {
      return NextResponse.json(
        { error: patientResult.error || 'Erro ao processar dados do paciente' },
        { status: 500 }
      );
    }

    const patient = patientResult.data;
    const isNewPatient = patientResult.isNew;

    // Find or create conversation
    const conversationResult = await findOrCreateConversation(patient.id);
    
    if (!conversationResult.success || !conversationResult.data) {
      return NextResponse.json(
        { error: conversationResult.error || 'Erro ao inicializar conversa' },
        { status: 500 }
      );
    }

    const conversation = conversationResult.data;

    // If this is a new conversation, add welcome message customized for the association
    if (conversation.Message.length === 0) {
      // FASE 2: Determinar contexto do interlocutor para personalizar mensagem de boas-vindas
      const isResponsibleScenario = patient.tipo_associacao === 'assoc_respon' && patient.nome_responsavel;
      const interlocutorName = isResponsibleScenario ? patient.nome_responsavel : patient.name;
      
      let welcomeMessage = '';
      
      if (isNewPatient) {
        if (isResponsibleScenario) {
          welcomeMessage = `Olá ${interlocutorName}! 👋 Bem-vindo(a) ao SATIZAP da ${tenantContext.association.name}! 

Sou seu assistente especializado em cannabis medicinal. Entendo que você está cuidando do atendimento para ${patient.name}. Estou aqui para ajudá-lo(a) a encontrar os produtos mais adequados para as necessidades do paciente.

Como posso ajudar ${patient.name} hoje? Você pode:
• Enviar uma foto da prescrição médica do ${patient.name}
• Descrever os sintomas que ${patient.name} deseja tratar
• Perguntar sobre produtos específicos
• Solicitar orientações sobre dosagem

Vamos começar?`;
        } else {
          welcomeMessage = `Olá ${patient.name}! 👋 Bem-vindo(a) ao SATIZAP da ${tenantContext.association.name}! 

Sou seu assistente especializado em cannabis medicinal. Estou aqui para ajudá-lo(a) a encontrar os produtos mais adequados para suas necessidades.

Como posso ajudá-lo(a) hoje? Você pode:
• Enviar uma foto da sua prescrição médica
• Descrever os sintomas que deseja tratar
• Perguntar sobre produtos específicos
• Solicitar orientações sobre dosagem

Vamos começar?`;
        }
      } else {
        if (isResponsibleScenario) {
          welcomeMessage = `Olá ${interlocutorName}! 👋 Que bom ter você de volta ao SATIZAP da ${tenantContext.association.name}! 

Como posso ajudar ${patient.name} hoje?`;
        } else {
          welcomeMessage = `Olá ${patient.name}! 👋 Que bom ter você de volta ao SATIZAP da ${tenantContext.association.name}! 

Como posso ajudá-lo(a) hoje?`;
        }
      }

      await addMessage(
        conversation.id,
        welcomeMessage,
        'ia',
        undefined,
        { 
          isWelcomeMessage: true, 
          associationName: tenantContext.association.name,
          // FASE 2: Salvar contexto do interlocutor na mensagem
          interlocutorContext: isResponsibleScenario ? {
            interlocutorName,
            isResponsibleScenario,
            patientName: patient.name
          } : undefined
        }
      );
    }

    return NextResponse.json({
      success: true,
      patient,
      conversationId: conversation.id,
      isNewPatient,
      association: {
        id: tenantContext.association.id,
        name: tenantContext.association.name,
        subdomain: tenantContext.subdomain,
      },
    });

  } catch (error) {
    console.error('Error in patient registration:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}