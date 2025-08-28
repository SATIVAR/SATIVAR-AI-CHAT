import { NextRequest, NextResponse } from 'next/server';
import { updateConversationStatus, getConversationById } from '@/lib/services/conversation.service';

interface TakeConversationRequest {
  conversationId: string;
  attendantId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TakeConversationRequest = await request.json();
    const { conversationId, attendantId } = body;

    if (!conversationId || !attendantId) {
      return NextResponse.json(
        { error: 'ConversationId e attendantId são obrigatórios' },
        { status: 400 }
      );
    }

    // Check if conversation exists and is in queue
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    if (conversation.status !== 'fila_humano') {
      return NextResponse.json(
        { error: 'Conversa não está disponível para assumir' },
        { status: 400 }
      );
    }

    // Update conversation status to 'com_humano'
    const updateResult = await updateConversationStatus(
      conversationId,
      'com_humano',
      attendantId
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Erro ao assumir conversa' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversa assumida com sucesso',
      conversationId,
    });

  } catch (error) {
    console.error('Error taking conversation:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}