import { NextRequest, NextResponse } from 'next/server';
import { updateConversationStatus } from '@/lib/services/conversation.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    
    // TODO: Implementar autenticação e obter ID do atendente
    const attendantId = 'admin'; // Temporário
    
    // Atualizar status da conversa para "com_humano"
    const result = await updateConversationStatus(
      conversationId, 
      'com_humano', 
      attendantId
    );
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Erro ao assumir conversa'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conversa assumida com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao assumir conversa:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}