import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserSessionFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string; conversationId: string } }
) {
  try {
    const { subdomain, conversationId } = params;
    const userSession = await getUserSessionFromRequest(request);

    if (!userSession) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar associação pelo subdomain
    const association = await prisma.association.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    if (!association) {
      return NextResponse.json(
        { success: false, error: 'Associação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar permissões
    if (userSession.role !== 'super_admin' && userSession.associationId !== association.id) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para acessar esta associação' },
        { status: 403 }
      );
    }

    // Buscar conversa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        Patient: {
          associationId: association.id
        }
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar status da conversa para "com_humano"
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'com_humano',
        attendantId: userSession.id,
        updatedAt: new Date()
      }
    });

    // Adicionar mensagem do sistema informando que o atendimento foi assumido
    await prisma.message.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: conversationId,
        content: `Atendimento assumido por ${userSession.name}`,
        senderType: 'sistema',
        senderId: userSession.id,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Conversa assumida com sucesso',
      conversation: updatedConversation
    });

  } catch (error) {
    console.error('Erro ao assumir conversa:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}