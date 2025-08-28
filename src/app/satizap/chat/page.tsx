'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileUpload } from '@/components/chat/file-upload';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Image as ImageIcon, 
  Loader2,
  ArrowLeft,
  AlertTriangle 
} from 'lucide-react';
import { Patient, ConversationMessage, ConversationStatus } from '@/lib/types';

export default function SatizapChatPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('com_ia');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load patient data from sessionStorage
    const storedPatient = sessionStorage.getItem('satizap_patient');
    const storedConversationId = sessionStorage.getItem('satizap_conversation_id');

    if (!storedPatient || !storedConversationId) {
      router.push('/satizap');
      return;
    }

    setPatient(JSON.parse(storedPatient));
    setConversationId(storedConversationId);
    loadConversation(storedConversationId);
  }, [router]);

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${convId}`);
      const result = await response.json();

      if (response.ok && result.conversation) {
        setMessages(result.conversation.messages || []);
        setConversationStatus(result.conversation.status);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Add user message immediately to UI
    const userMessage: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      content: messageText,
      senderType: 'paciente',
      senderId: null,
      timestamp: new Date(),
      isRead: false,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: messageText,
          senderType: 'paciente',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Replace temp message with real one and add AI response
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== userMessage.id);
          const newMessages = [result.userMessage];
          if (result.aiResponse) {
            newMessages.push(result.aiResponse);
          }
          return [...filtered, ...newMessages];
        });

        if (result.conversationStatus) {
          setConversationStatus(result.conversationStatus);
        }
      } else {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File, extractedData: any) => {
    if (!conversationId) return;

    const prescriptionMessage = `Prescrição médica enviada: ${file.name}

${extractedData.extractedText ? `Texto extraído:\n${extractedData.extractedText}` : 'Processando prescrição...'}

${extractedData.prescriptionData?.containsCannabis ? 
  '✅ Cannabis medicinal identificada na prescrição' : 
  '⚠️ Analisando conteúdo da prescrição'
}`;

    setNewMessage(prescriptionMessage);
    setShowFileUpload(false);
  };

  const formatMessageTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = () => {
    switch (conversationStatus) {
      case 'com_ia':
        return <Badge variant="default">Com IA</Badge>;
      case 'fila_humano':
        return <Badge variant="secondary">Aguardando Atendente</Badge>;
      case 'com_humano':
        return <Badge variant="outline">Com Atendente</Badge>;
      case 'resolvida':
        return <Badge variant="destructive">Finalizada</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/satizap')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">SATIZAP</h1>
                <p className="text-sm text-gray-600">
                  Assistente de Cannabis Medicinal
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge()}
              {patient && (
                <div className="text-right text-sm">
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-gray-500">{patient.whatsapp}</p>
                </div>
              )}
            </div>
          </div>
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
                      message.senderType === 'paciente' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                        message.senderType === 'paciente' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.senderType === 'paciente' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          message.senderType === 'paciente'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.senderType === 'paciente'
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Area */}
          <div className="border-t p-4">
            {conversationStatus === 'fila_humano' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Sua conversa foi transferida para um atendente humano. 
                    Aguarde um momento que alguém entrará em contato.
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileUpload(!showFileUpload)}
                disabled={conversationStatus === 'resolvida'}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isSending || conversationStatus === 'resolvida'}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending || conversationStatus === 'resolvida'}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showFileUpload && conversationId && (
              <div className="mt-4">
                <FileUpload
                  onFileUpload={handleFileUpload}
                  conversationId={conversationId}
                  disabled={conversationStatus === 'resolvida'}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}