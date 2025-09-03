import prisma from '@/lib/prisma';
import { ConversationData, ConversationMessage, ConversationStatus } from '@/lib/types';
import { Message_senderType, Conversation_status } from '@prisma/client';
import { notificationService } from './notification.service';

export async function createConversation(patientId: string): Promise<{ success: boolean; data?: ConversationData; error?: string }> {
  try {
    // Generate a unique ID for the conversation
    const generateId = () => {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };

    const conversation = await prisma.conversation.create({
      data: {
        id: generateId(),
        patientId,
        status: 'com_ia',
        updatedAt: new Date(),
      },
      include: {
        Patient: {
          include: {
            Association: true,
          },
        },
        Message: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    return { success: true, data: conversation as ConversationData };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { success: false, error: 'Erro ao criar conversa' };
  }
}

export async function findActiveConversation(patientId: string): Promise<ConversationData | null> {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        patientId,
        status: {
          in: ['com_ia', 'fila_humano', 'com_humano'],
        },
      },
      include: {
        Patient: {
          include: {
            Association: true,
          },
        },
        Message: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return conversation as ConversationData | null;
  } catch (error) {
    console.error('Error finding active conversation:', error);
    return null;
  }
}

export async function findOrCreateConversation(patientId: string): Promise<{ success: boolean; data?: ConversationData; error?: string }> {
  try {
    // First, look for an active conversation
    const activeConversation = await findActiveConversation(patientId);
    
    if (activeConversation) {
      return { success: true, data: activeConversation };
    }
    
    // Create new conversation if none exists
    return await createConversation(patientId);
  } catch (error) {
    console.error('Error in findOrCreateConversation:', error);
    return { success: false, error: 'Erro ao gerenciar conversa' };
  }
}

export async function addMessage(
  conversationId: string,
  content: string,
  senderType: Message_senderType,
  senderId?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; data?: ConversationMessage; error?: string }> {
  try {
    // Generate a unique ID for the message
    const generateId = () => {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };

    const message = await prisma.message.create({
      data: {
        id: generateId(),
        conversationId,
        content,
        senderType,
        senderId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return { success: true, data: message as ConversationMessage };
  } catch (error) {
    console.error('Error adding message:', error);
    return { success: false, error: 'Erro ao adicionar mensagem' };
  }
}

export async function updateConversationStatus(
  conversationId: string,
  status: Conversation_status,
  attendantId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status,
        ...(attendantId && { attendantId }),
        ...(status === 'resolvida' && { endedAt: new Date() }),
      },
      include: {
        Patient: true,
        Message: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // Send notifications for status changes
    if (status === 'fila_humano') {
      notificationService.notifyNewConversation(conversation as ConversationData);
    } else if (status === 'com_humano') {
      notificationService.notifyConversationUpdate(
        conversation as ConversationData,
        'Conversa assumida por atendente'
      );
    } else if (status === 'resolvida') {
      notificationService.notifyConversationUpdate(
        conversation as ConversationData,
        'Conversa finalizada'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating conversation status:', error);
    return { success: false, error: 'Erro ao atualizar status da conversa' };
  }
}

export async function getConversationById(conversationId: string): Promise<ConversationData | null> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        Patient: {
          include: {
            Association: true,
          },
        },
        Message: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    return conversation as ConversationData | null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

export async function getConversationsInQueue(): Promise<ConversationData[]> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        status: 'fila_humano',
      },
      include: {
        Patient: true,
        Message: {
          orderBy: { timestamp: 'asc' },
          take: 1, // Just get the last message for preview
        },
      },
      orderBy: { updatedAt: 'asc' }, // FIFO queue
    });

    return conversations as ConversationData[];
  } catch (error) {
    console.error('Error getting queue conversations:', error);
    return [];
  }
}

export async function getAttendantConversations(attendantId: string): Promise<ConversationData[]> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        attendantId,
        status: 'com_humano',
      },
      include: {
        Patient: true,
        Message: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations as ConversationData[];
  } catch (error) {
    console.error('Error getting attendant conversations:', error);
    return [];
  }
}