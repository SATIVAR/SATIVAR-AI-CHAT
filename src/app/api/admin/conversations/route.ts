import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // TODO: Implementar autenticação e verificar se é admin
    // Por enquanto, vamos buscar todas as conversas ativas
    
    const conversations = await prisma.conversation.findMany({
      where: {
        status: {
          in: ['com_ia', 'fila_humano', 'com_humano']
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
          },
          select: {
            id: true,
            content: true,
            senderType: true,
            timestamp: true,
            senderId: true
          }
        }
      },
      orderBy: [
        {
          status: 'asc' // Priorizar fila_humano
        },
        {
          updatedAt: 'asc' // FIFO para conversas na fila
        }
      ]
    });

    // Transformar dados para o formato esperado pelo frontend
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      status: conv.status,
      patient: {
        id: conv.Patient.id,
        name: conv.Patient.name,
        whatsapp: conv.Patient.whatsapp,
        status: conv.Patient.status
      },
      messages: conv.Message.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        timestamp: msg.timestamp,
        senderId: msg.senderId
      })),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }));

    return NextResponse.json({
      success: true,
      conversations: formattedConversations
    });

  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}