import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserSessionFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const subdomain = params.subdomain;
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

    // Buscar conversas da associação
    const conversations = await prisma.conversation.findMany({
      where: {
        Patient: {
          associationId: association.id
        }
      },
      include: {
        Patient: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            status: true
          }
        },
        Message: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Formatar dados para o frontend
    const formattedConversations = conversations.map(conversation => ({
      id: conversation.id,
      status: conversation.status,
      patient: {
        id: conversation.Patient.id,
        name: conversation.Patient.name,
        whatsapp: conversation.Patient.whatsapp,
        status: conversation.Patient.status
      },
      messages: conversation.Message.map(message => ({
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        timestamp: message.timestamp,
        senderId: message.senderId
      })),
      createdAt: conversation.startedAt,
      updatedAt: conversation.updatedAt
    }));

    return NextResponse.json({
      success: true,
      conversations: formattedConversations
    });

  } catch (error) {
    console.error('Erro ao buscar conversas da associação:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        conversations: []
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}