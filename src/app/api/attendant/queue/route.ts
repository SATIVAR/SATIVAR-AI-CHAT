import { NextRequest, NextResponse } from 'next/server';
import { getConversationsInQueue } from '@/lib/services/conversation.service';

export async function GET(request: NextRequest) {
  try {
    const conversations = await getConversationsInQueue();
    
    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length,
    });

  } catch (error) {
    console.error('Error getting queue conversations:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}