import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { findOrCreatePatient } from '@/lib/services/patient.service';
import { findOrCreateConversation, addMessage, updateConversationStatus } from '@/lib/services/conversation.service';
import { getAssociationBySubdomain } from '@/lib/services/association.service';
import { sanitizePhone } from '@/lib/utils/phone';

export async function POST(request: NextRequest) {
  try {
    // Verificar o webhook secret para segurança
    const headersList = headers();
    const webhookSecret = headersList.get('x-webhook-secret');
    
    if (webhookSecret !== process.env.WAHA_WEBHOOK_SECRET) {
      console.log('Webhook secret inválido');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('Webhook WAHA recebido:', JSON.stringify(payload, null, 2));

    // Verificar se é uma mensagem de texto
    if (payload.event !== 'message' || !payload.payload) {
      console.log('Evento ignorado:', payload.event);
      return NextResponse.json({ status: 'ignored' });
    }

    const message = payload.payload;
    
    // Extrair dados da mensagem
    const phoneNumber = message.from;
    const messageText = message.body || '';
    const messageType = message.type || 'text';
    const sessionId = payload.session;

    console.log(`Mensagem recebida de ${phoneNumber}: ${messageText}`);

    // Normalizar número de telefone
    const normalizedPhone = sanitizePhone(phoneNumber);

    // Por enquanto, vamos usar uma associação padrão
    // TODO: Implementar lógica para determinar a associação baseada na sessão
    const defaultAssociation = await getAssociationBySubdomain('sativar'); // Ajustar conforme necessário
    
    if (!defaultAssociation) {
      console.error('Associação padrão não encontrada');
      return NextResponse.json({ error: 'Association not found' }, { status: 404 });
    }

    // Buscar ou criar paciente
    const patientResult = await findOrCreatePatient({
      name: `Cliente ${normalizedPhone}`, // Nome temporário
      whatsapp: normalizedPhone,
      status: 'LEAD'
    }, defaultAssociation.id);

    if (!patientResult.success || !patientResult.data) {
      console.error('Erro ao encontrar/criar paciente:', patientResult.error);
      return NextResponse.json({ error: 'Patient creation failed' }, { status: 500 });
    }

    const patient = patientResult.data;

    // Buscar ou criar conversa
    const conversationResult = await findOrCreateConversation(patient.id);
    
    if (!conversationResult.success || !conversationResult.data) {
      console.error('Erro ao encontrar/criar conversa:', conversationResult.error);
      return NextResponse.json({ error: 'Conversation creation failed' }, { status: 500 });
    }

    const conversation = conversationResult.data;

    // Salvar mensagem do paciente
    await addMessage(conversation.id, messageText, 'paciente');

    // Processar com IA apenas se a conversa estiver com IA
    if (conversation.status === 'com_ia') {
      // Por enquanto, vamos enviar uma resposta simples
      // TODO: Integrar com o sistema de IA existente
      const aiResponse = `Olá! Recebi sua mensagem: "${messageText}". Em breve nosso sistema de IA processará sua solicitação.`;

      // Salvar resposta da IA
      await addMessage(conversation.id, aiResponse, 'ia');

      // Enviar resposta via WhatsApp
      const whatsappService = new WhatsAppService();
      const sent = await whatsappService.sendMessage({
        sessionId: sessionId,
        to: phoneNumber,
        message: aiResponse
      });

      if (!sent) {
        console.error('Falha ao enviar mensagem via WhatsApp');
      }

      // Simular handoff após algumas mensagens (para teste)
      // TODO: Implementar lógica real de handoff baseada na IA
      if (messageText.toLowerCase().includes('finalizar') || messageText.toLowerCase().includes('confirmar')) {
        await updateConversationStatus(conversation.id, 'fila_humano');
        
        const handoffMessage = "Obrigado! Agora vou conectar você com um de nossos atendentes para finalizar seu pedido. Em breve você receberá uma resposta.";
        
        await addMessage(conversation.id, handoffMessage, 'sistema');

        await whatsappService.sendMessage({
          sessionId: sessionId,
          to: phoneNumber,
          message: handoffMessage
        });
      }
    }

    return NextResponse.json({ status: 'processed' });

  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Endpoint para verificar saúde do webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-webhook'
  });
}