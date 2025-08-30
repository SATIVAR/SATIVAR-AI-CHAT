'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSocket } from '@/hooks/use-socket';
import { ConversationMessage, Patient, ConversationStatus } from '@/lib/types';
import { Send, Paperclip, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DynamicTenantChatPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('com_ia');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { socket } = useSocket({
    onNewMessage: useCallback((message: ConversationMessage) => {
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    }, []),

    onConversationStatusUpdated: useCallback((data: { 
      conversationId: string; 
      status: ConversationStatus; 
      attendantName?: string 
    }) => {
      if (data.conversationId === conversationId) {
        setConversationStatus(data.status);
      }
    }, [conversationId]),

    onUserTypingStart: useCallback((data: { socketId: string; userType: 'patient' | 'attendant' }) => {
      if (data.userType === 'attendant') {
        setIsTyping(true);
      }
    }, []),

    onUserTypingStop: useCallback((data: { socketId: string; userType: 'patient' | 'attendant' }) => {
      if (data.userType === 'attendant') {
        setIsTyping(false);
      }
    }, [])
  });

  useEffect(() => {
    const storedPatient = sessionStorage.getItem('satizap_patient');
    const storedConversationId = sessionStorage.getItem('satizap_conversation_id');

    if (!storedPatient || !storedConversationId) {
      // Redirect back to onboarding if no patient data
      router.push(`/${slug}`);
      return;
    }

    setPatient(JSON.parse(storedPatient));
    setConversationId(storedConversationId);
    loadConversation(storedConversationId);
  }, [router, slug]);

  const loadConversation = async (convId: string) => {
    try {
      // Include slug in the API call
      const response = await fetch(`/api/messages?conversationId=${convId}&slug=${slug}`);
      const result = await response.json();

      if (response.ok && result.conversation) {
        setMessages(result.conversation.Message || []);
        setConversationStatus(result.conversation.status);
        
        // Join socket room for real-time updates
        if (socket) {
          socket.emit('join-conversation', { conversationId: convId, userType: 'patient' });
        }
      } else {
        setError('Erro ao carregar conversa');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const userMessage: ConversationMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      senderType: 'patient',
      timestamp: new Date(),
      conversationId,
      isRead: false,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Include slug in the API call
      const response = await fetch(`/api/messages?slug=${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: messageText,
          senderType: 'patient',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Replace optimistic message with real message
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== userMessage.id);
          const newMessages = [result.userMessage];
          
          if (result.aiResponse) {
            newMessages.push(result.aiResponse);
          }
          return [...filtered, ...newMessages];
        });
        
        // Emit typing events via socket
        if (socket) {
          socket.emit('user-typing-stop', { 
            conversationId, 
            userType: 'patient' 
          });
        }
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        setError('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusBadge = () => {
    switch (conversationStatus) {
      case 'com_ia':
        return <Badge variant="secondary">Atendimento Automático</Badge>;
      case 'aguardando_atendente':
        return <Badge variant="outline">Aguardando Atendente</Badge>;
      case 'com_atendente':
        return <Badge variant="default">Com Atendente</Badge>;
      case 'finalizada':
        return <Badge variant="destructive">Finalizada</Badge>;
      default:
        return <Badge variant="secondary">Ativo</Badge>;
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {error}
              </h1>
              <Button
                onClick={() => router.push(`/${slug}`)}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${slug}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Atendimento SatiZap
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {patient?.name}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto p-4">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          {/* Messages */}
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderType === 'patient' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderType === 'patient'
                          ? 'bg-blue-600 text-white'
                          : message.senderType === 'ai'
                          ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderType === 'patient' 
                          ? 'text-blue-100' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <Separator />

          {/* Message Input */}
          <div className="p-4">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFileUpload(!showFileUpload)}
                disabled={conversationStatus === 'finalizada'}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  conversationStatus === 'finalizada' 
                    ? 'Conversa finalizada' 
                    : 'Digite sua mensagem...'
                }
                disabled={isSending || conversationStatus === 'finalizada'}
                className="flex-1"
              />
              
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending || conversationStatus === 'finalizada'}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}