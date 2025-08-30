// server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { ConversationMessage, SenderType } from './src/lib/types';

const prisma = new PrismaClient();
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:9002", // Updated to match your Next.js port from package.json
    methods: ["GET", "POST"]
  }
});

// Store active connections and their conversation mappings
const activeConnections = new Map<string, { 
  conversationId: string; 
  patientId?: string;
  attendantId?: string; 
}>();

io.on('connection', (socket) => {
  console.log(`🔌 Novo cliente conectado: ${socket.id}`);

  // Join a specific conversation room
  socket.on('join_conversation', (data: { conversationId: string; patientId?: string; attendantId?: string }) => {
    const { conversationId, patientId, attendantId } = data;
    
    // Leave any previous room
    const currentConnection = activeConnections.get(socket.id);
    if (currentConnection) {
      socket.leave(`conversation_${currentConnection.conversationId}`);
    }

    // Join new conversation room
    socket.join(`conversation_${conversationId}`);
    activeConnections.set(socket.id, { conversationId, patientId, attendantId });
    
    console.log(`🏠 Cliente ${socket.id} entrou na conversa: ${conversationId}`);
    
    // Notify others in the room that someone joined
    socket.to(`conversation_${conversationId}`).emit('user_joined', {
      socketId: socket.id,
      userType: patientId ? 'patient' : attendantId ? 'attendant' : 'unknown'
    });
  });

  // Handle sending messages
  socket.on('send_message', async (data: {
    conversationId: string;
    content: string;
    senderType: SenderType;
    senderId?: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      console.log('📩 Mensagem recebida:', data);

      // 1. Save the message to database using Prisma
      const newMessage = await prisma.message.create({
        data: {
          conversationId: data.conversationId,
          content: data.content,
          senderType: data.senderType,
          senderId: data.senderId || null,
          metadata: data.metadata || null,
        },
      });

      // 2. Convert to ConversationMessage format
      const messageToSend: ConversationMessage = {
        ...newMessage,
        metadata: newMessage.metadata ? JSON.parse(JSON.stringify(newMessage.metadata)) : undefined
      };

      console.log('💾 Mensagem salva e será enviada:', messageToSend);

      // 3. Broadcast message to all clients in the conversation room
      io.to(`conversation_${data.conversationId}`).emit('receive_message', messageToSend);

      // 4. Send confirmation back to sender
      socket.emit('message_sent', { 
        success: true, 
        message: messageToSend 
      });

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      socket.emit('message_sent', { 
        success: false, 
        error: 'Erro ao enviar mensagem' 
      });
    }
  });

  // Handle conversation status updates
  socket.on('update_conversation_status', async (data: {
    conversationId: string;
    status: 'com_ia' | 'fila_humano' | 'com_humano' | 'resolvida';
    attendantId?: string;
  }) => {
    try {
      console.log('🔄 Atualizando status da conversa:', data);

      // Update conversation status in database
      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { 
          status: data.status,
          ...(data.attendantId && { attendantId: data.attendantId })
        }
      });

      // Broadcast status update to all clients in the conversation room
      io.to(`conversation_${data.conversationId}`).emit('conversation_status_updated', {
        conversationId: data.conversationId,
        status: data.status,
        attendantId: data.attendantId
      });

      console.log(`✅ Status da conversa ${data.conversationId} atualizado para: ${data.status}`);

    } catch (error) {
      console.error('❌ Erro ao atualizar status da conversa:', error);
      socket.emit('status_update_error', { 
        error: 'Erro ao atualizar status da conversa' 
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data: { conversationId: string; userType: 'patient' | 'attendant' }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing_start', {
      socketId: socket.id,
      userType: data.userType
    });
  });

  socket.on('typing_stop', (data: { conversationId: string; userType: 'patient' | 'attendant' }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing_stop', {
      socketId: socket.id,
      userType: data.userType
    });
  });

  // Handle mark message as read
  socket.on('mark_message_read', async (data: { messageId: string }) => {
    try {
      await prisma.message.update({
        where: { id: data.messageId },
        data: { isRead: true }
      });

      const connection = activeConnections.get(socket.id);
      if (connection) {
        socket.to(`conversation_${connection.conversationId}`).emit('message_read', {
          messageId: data.messageId
        });
      }
    } catch (error) {
      console.error('❌ Erro ao marcar mensagem como lida:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      // Notify others in the room that user left
      socket.to(`conversation_${connection.conversationId}`).emit('user_left', {
        socketId: socket.id
      });
      
      // Remove from active connections
      activeConnections.delete(socket.id);
    }
  });

  // Handle attendant queue operations
  socket.on('join_attendant_queue', () => {
    socket.join('attendant_queue');
    console.log(`👨‍💼 Atendente ${socket.id} entrou na fila de atendimento`);
  });

  socket.on('leave_attendant_queue', () => {
    socket.leave('attendant_queue');
    console.log(`👨‍💼 Atendente ${socket.id} saiu da fila de atendimento`);
  });

  // Notify attendants when a conversation needs human help
  socket.on('request_human_help', (data: { conversationId: string; reason: string; priority: 'low' | 'medium' | 'high' }) => {
    console.log(`🆘 Solicitação de ajuda humana para conversa ${data.conversationId}:`, data);
    
    // Broadcast to all attendants in queue
    io.to('attendant_queue').emit('human_help_requested', {
      conversationId: data.conversationId,
      reason: data.reason,
      priority: data.priority,
      timestamp: new Date()
    });
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.IO rodando na porta ${PORT}`);
  console.log(`📱 Configurado para aceitar conexões do Next.js em http://localhost:9002`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Encerrando servidor Socket.IO...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('✅ Servidor Socket.IO encerrado');
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor Socket.IO...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('✅ Servidor Socket.IO encerrado');
  });
});