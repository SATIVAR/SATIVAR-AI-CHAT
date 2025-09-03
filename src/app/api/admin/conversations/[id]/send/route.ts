import { NextRequest, NextResponse } from 'next/server';
import { addMessage, getConversationById } from '@/lib/services/conversation.service';
import { WhatsAppService } from '@/lib/services/whatsapp.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const { message } = await request.json();
    
    if (!message || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Mensagem é obrigatória'
      }, { status: 400 });
    }
    
    // Buscar dados da conversa
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversa não encontrada'
      }, { status: 404 });
    }
    
    if (conversation.status !== 'com_humano') {
      return NextResponse.json({
        success: false,
        error: 'Conversa não está em atendimento humano'
      }, { status: 400 });
    }
    
    // TODO: Implementar autenticação e obter ID do atendente
    const attendantId = 'admin'; // Temporário
    
    // Salvar mensagem no banco
    const messageResult = await addMessage(
      conversationId,
      message.trim(),
      'atendente',
      attendantId
    );
    
    if (!messageResult.success) {
      return NextResponse.json({
        success: false,
        error: messageResult.error || 'Erro ao salvar mensagem'
      }, { status: 500 });
    }
    
    // Enviar mensagem via WhatsApp
    const whatsappService = new WhatsAppService();
    const sent = await whatsappService.sendMessage({
      sessionId: 'default', // TODO: Obter sessão correta da conversa
      to: conversation.Patient.whatsapp,
      message: message.trim()
    });
    
    if (!sent) {
      console.error('Falha ao enviar mensagem via WhatsApp para:', conversation.Patient.whatsapp);
      // Não retornar erro, pois a mensagem foi salva no banco
    }
    
    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      sent: sent
    });
    
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}