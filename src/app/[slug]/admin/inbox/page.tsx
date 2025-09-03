'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, User, Clock, Phone, Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  senderType: 'paciente' | 'ia' | 'atendente' | 'sistema';
  timestamp: Date;
  senderId?: string;
}

interface Conversation {
  id: string;
  status: 'com_ia' | 'fila_humano' | 'com_humano' | 'resolvida';
  patient: {
    id: string;
    name: string;
    whatsapp: string;
    status: 'LEAD' | 'MEMBRO';
  };
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface AssociationInfo {
  id: string;
  name: string;
  subdomain: string;
  publicDisplayName?: string;
  logoUrl?: string;
}

export default function AssociationInboxPage() {
  const params = useParams();
  const subdomain = params.slug as string;
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [associationInfo, setAssociationInfo] = useState<AssociationInfo | null>(null);
  const [userSession, setUserSession] = useState<any>(null);

  // Carregar informações da sessão
  useEffect(() => {
    try {
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-session='));
      
      if (authCookie) {
        const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        setUserSession(sessionData);
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
    }
  }, []);

  // Carregar conversas e informações da associação
  useEffect(() => {
    if (subdomain) {
      loadAssociationData();
      loadConversations();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(loadConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [subdomain]);

  const loadAssociationData = async () => {
    try {
      const response = await fetch(`/api/associations/${subdomain}/info`);
      if (response.ok) {
        const data = await response.json();
        setAssociationInfo(data.association);
      }
    } catch (error) {
      console.error('Erro ao carregar informações da associação:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/associations/${subdomain}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // Marcar como em atendimento se estiver na fila
    if (conversation.status === 'fila_humano') {
      try {
        await fetch(`/api/associations/${subdomain}/conversations/${conversation.id}/take`, {
          method: 'POST'
        });
        
        // Atualizar status local
        setConversations(prev => 
          prev.map(c => 
            c.id === conversation.id 
              ? { ...c, status: 'com_humano' as const }
              : c
          )
        );
        
        setSelectedConversation(prev => 
          prev ? { ...prev, status: 'com_humano' as const } : null
        );
      } catch (error) {
        console.error('Erro ao assumir conversa:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sending) return;

    setSending(true);
    
    try {
      const response = await fetch(`/api/associations/${subdomain}/conversations/${selectedConversation.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });

      if (response.ok) {
        // Adicionar mensagem localmente
        const newMsg: Message = {
          id: Date.now().toString(),
          content: newMessage.trim(),
          senderType: 'atendente',
          timestamp: new Date()
        };

        setSelectedConversation(prev => 
          prev ? {
            ...prev,
            messages: [...prev.messages, newMsg]
          } : null
        );

        setNewMessage('');
        
        // Recarregar conversas para atualizar a lista
        loadConversations();
      } else {
        console.error('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const resolveConversation = async () => {
    if (!selectedConversation) return;

    try {
      await fetch(`/api/associations/${subdomain}/conversations/${selectedConversation.id}/resolve`, {
        method: 'POST'
      });

      // Atualizar status local
      setConversations(prev => 
        prev.map(c => 
          c.id === selectedConversation.id 
            ? { ...c, status: 'resolvida' as const }
            : c
        )
      );

      setSelectedConversation(prev => 
        prev ? { ...prev, status: 'resolvida' as const } : null
      );
    } catch (error) {
      console.error('Erro ao resolver conversa:', error);
    }
  };

  const getStatusBadge = (status: Conversation['status']) => {
    const variants = {
      'com_ia': { variant: 'secondary' as const, label: 'Com IA' },
      'fila_humano': { variant: 'destructive' as const, label: 'Aguardando' },
      'com_humano': { variant: 'default' as const, label: 'Em Atendimento' },
      'resolvida': { variant: 'outline' as const, label: 'Resolvida' }
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSenderIcon = (senderType: Message['senderType']) => {
    switch (senderType) {
      case 'paciente':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'ia':
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'atendente':
        return <User className="w-4 h-4 text-green-500" />;
      case 'sistema':
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageCircle className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          {userSession?.role === 'super_admin' && (
            <Link href="/admin/inbox">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Painel Geral
              </Button>
            </Link>
          )}
          
          {associationInfo?.logoUrl && (
            <img 
              src={associationInfo.logoUrl} 
              alt={associationInfo.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              {associationInfo?.publicDisplayName || associationInfo?.name || subdomain}
            </h1>
            <p className="text-muted-foreground">
              Atendimento WhatsApp • {subdomain}.sativar.com.br
            </p>
          </div>
        </div>
        
        {userSession?.role === 'super_admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Modo Super Admin:</strong> Você está atendendo como administrador desta associação.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {/* Lista de Conversas */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Conversas ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-350px)]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa ativa</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => selectConversation(conversation)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{conversation.patient.name}</span>
                      </div>
                      {getStatusBadge(conversation.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {conversation.patient.whatsapp}
                    </p>
                    
                    {conversation.messages.length > 0 && (
                      <p className="text-sm truncate">
                        {conversation.messages[conversation.messages.length - 1].content}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTime(conversation.updatedAt)}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {selectedConversation.patient.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.patient.whatsapp} • {selectedConversation.patient.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedConversation.status)}
                    {selectedConversation.status === 'com_humano' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={resolveConversation}
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex flex-col h-[calc(100vh-450px)]">
                {/* Mensagens */}
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.senderType === 'atendente' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderType === 'atendente'
                              ? 'bg-primary text-primary-foreground'
                              : message.senderType === 'ia'
                              ? 'bg-purple-100 text-purple-900'
                              : message.senderType === 'sistema'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getSenderIcon(message.senderType)}
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input de mensagem */}
                {selectedConversation.status === 'com_humano' && (
                  <>
                    <Separator className="mb-4" />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={sending}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim() || sending}
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
                
                {selectedConversation.status === 'fila_humano' && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Clique na conversa para assumir o atendimento
                    </p>
                  </div>
                )}

                {selectedConversation.status === 'resolvida' && (
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      Conversa resolvida
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p className="text-muted-foreground">
                  Escolha uma conversa da lista para começar o atendimento
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}