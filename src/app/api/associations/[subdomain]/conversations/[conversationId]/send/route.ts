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
    const { message } = await request.json();
    const userSession = await getUserSessionFromRequest(request);

    if (!userSession) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
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

    // Buscar conversa com dados do paciente
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        Patient: {
          associationId: association.id
        }
      },
      include: {
        Patient: {
          select: {
            whatsapp: true
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a conversa está em atendimento humano
    if (conversation.status !== 'com_humano') {
      return NextResponse.json(
        { success: false, error: 'Conversa não está em atendimento humano' },
        { status: 400 }
      );
    }

    // Salvar mensagem no banco
    const newMessage = await prisma.message.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: conversationId,
        content: message.trim(),
        senderType: 'atendente',
        senderId: userSession.id,
        timestamp: new Date()
      }
    });

    // Atualizar timestamp da conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date()
      }
    });

    // Enviar mensagem via WhatsApp (WAHA)
    try {
      const wahaResponse = await fetch('http://localhost:3000/api/sendText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: `${conversation.Patient.whatsapp}@c.us`,
          text: message.trim()
        })
      });

      if (!wahaResponse.ok) {
        console.error('Erro ao enviar mensagem via WAHA:', await wahaResponse.text());
      }
    } catch (wahaError) {
      console.error('Erro ao conectar com WAHA:', wahaError);
      // Não falhar a operação se o WAHA estiver indisponível
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      messageData: newMessage
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
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