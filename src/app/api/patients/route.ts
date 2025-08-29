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
}

export async function POST(request: NextRequest) {
  try {
    // Get tenant context from subdomain
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Invalid tenant or subdomain' },
        { status: 400 }
      );
    }

    const body: PatientRegistrationRequest = await request.json();
    const { name, whatsapp, email, cpf } = body;

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
    };

    // Add CPF to metadata if provided
    const patientMetadata = cpf ? { cpf: cpf.replace(/\D/g, '') } : undefined;

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
    if (conversation.messages.length === 0) {
      const welcomeMessage = isNewPatient
        ? `Olá ${patient.name}! 👋 Bem-vindo(a) ao SATIZAP da ${tenantContext.association.name}! 

Sou seu assistente especializado em cannabis medicinal. Estou aqui para ajudá-lo(a) a encontrar os produtos mais adequados para suas necessidades.

Como posso ajudá-lo(a) hoje? Você pode:
• Enviar uma foto da sua prescrição médica
• Descrever os sintomas que deseja tratar
• Perguntar sobre produtos específicos
• Solicitar orientações sobre dosagem

Vamos começar?`
        : `Olá ${patient.name}! 👋 Que bom ter você de volta ao SATIZAP da ${tenantContext.association.name}! 

Como posso ajudá-lo(a) hoje?`;

      await addMessage(
        conversation.id,
        welcomeMessage,
        'ia',
        undefined,
        { isWelcomeMessage: true, associationName: tenantContext.association.name }
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