'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConversationMessage, SenderType } from '@/lib/types';

interface UseSocketOptions {
  conversationId?: string;
  patientId?: string;
  attendantId?: string;
  autoConnect?: boolean;
}

interface SocketEvents {
  onMessageReceived?: (message: ConversationMessage) => void;
  onConversationStatusUpdated?: (data: { 
    conversationId: string; 
    status: 'com_ia' | 'fila_humano' | 'com_humano' | 'resolvida';
    attendantId?: string;
  }) => void;
  onUserJoined?: (data: { socketId: string; userType: 'patient' | 'attendant' | 'unknown' }) => void;
  onUserLeft?: (data: { socketId: string }) => void;
  onUserTypingStart?: (data: { socketId: string; userType: 'patient' | 'attendant' }) => void;
  onUserTypingStop?: (data: { socketId: string; userType: 'patient' | 'attendant' }) => void;
  onMessageRead?: (data: { messageId: string }) => void;
  onHumanHelpRequested?: (data: { 
    conversationId: string; 
    reason: string; 
    priority: 'low' | 'medium' | 'high';
    timestamp: Date;
  }) => void;
}

export function useSocket(options: UseSocketOptions = {}, events: SocketEvents = {}) {
  const {
    conversationId,
    patientId,
    attendantId,
    autoConnect = true
  } = options;

  const {
    onMessageReceived,
    onConversationStatusUpdated,
    onUserJoined,
    onUserLeft,
    onUserTypingStart,
    onUserTypingStop,
    onMessageRead,
    onHumanHelpRequested
  } = events;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    setIsConnecting(true);
    
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 Conectado ao Socket.IO:', socket.id);
      setIsConnected(true);
      setIsConnecting(false);

      // Auto-join conversation if provided
      if (conversationId) {
        socket.emit('join_conversation', {
          conversationId,
          patientId,
          attendantId
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Desconectado do Socket.IO');
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão Socket.IO:', error);
      setIsConnecting(false);
    });

    // Message event handlers
    socket.on('receive_message', (message: ConversationMessage) => {
      console.log('📩 Mensagem recebida via Socket.IO:', message);
      onMessageReceived?.(message);
    });

    socket.on('message_sent', (data: { success: boolean; message?: ConversationMessage; error?: string }) => {
      if (data.success) {
        console.log('✅ Mensagem enviada com sucesso:', data.message);
      } else {
        console.error('❌ Erro ao enviar mensagem:', data.error);
      }
    });

    // Conversation status handlers
    socket.on('conversation_status_updated', (data) => {
      console.log('🔄 Status da conversa atualizado:', data);
      onConversationStatusUpdated?.(data);
    });

    // User presence handlers
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);

    // Typing indicators
    socket.on('user_typing_start', onUserTypingStart);
    socket.on('user_typing_stop', onUserTypingStop);

    // Message read receipts
    socket.on('message_read', onMessageRead);

    // Attendant queue handlers
    socket.on('human_help_requested', onHumanHelpRequested);

    return socket;
  }, [conversationId, patientId, attendantId, onMessageReceived, onConversationStatusUpdated, onUserJoined, onUserLeft, onUserTypingStart, onUserTypingStop, onMessageRead, onHumanHelpRequested]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  // Join conversation room
  const joinConversation = useCallback((convId: string, patId?: string, attId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', {
        conversationId: convId,
        patientId: patId,
        attendantId: attId
      });
    }
  }, []);

  // Send message through socket
  const sendMessage = useCallback((data: {
    conversationId: string;
    content: string;
    senderType: SenderType;
    senderId?: string;
    metadata?: Record<string, any>;
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', data);
      return true;
    }
    return false;
  }, []);

  // Update conversation status
  const updateConversationStatus = useCallback((data: {
    conversationId: string;
    status: 'com_ia' | 'fila_humano' | 'com_humano' | 'resolvida';
    attendantId?: string;
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_conversation_status', data);
      return true;
    }
    return false;
  }, []);

  // Typing indicators
  const startTyping = useCallback((conversationId: string, userType: 'patient' | 'attendant') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { conversationId, userType });
    }
  }, []);

  const stopTyping = useCallback((conversationId: string, userType: 'patient' | 'attendant') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { conversationId, userType });
    }
  }, []);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_message_read', { messageId });
    }
  }, []);

  // Attendant queue operations
  const joinAttendantQueue = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_attendant_queue');
    }
  }, []);

  const leaveAttendantQueue = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_attendant_queue');
    }
  }, []);

  // Request human help
  const requestHumanHelp = useCallback((data: { 
    conversationId: string; 
    reason: string; 
    priority: 'low' | 'medium' | 'high' 
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_human_help', data);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    socket: socketRef.current,

    // Connection methods
    connect,
    disconnect,
    joinConversation,

    // Messaging methods
    sendMessage,
    updateConversationStatus,

    // Typing indicators
    startTyping,
    stopTyping,

    // Message read receipts
    markMessageAsRead,

    // Attendant operations
    joinAttendantQueue,
    leaveAttendantQueue,
    requestHumanHelp,
  };
}