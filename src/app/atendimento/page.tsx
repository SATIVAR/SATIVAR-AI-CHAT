'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  MessageCircle, 
  User, 
  Phone, 
  FileText, 
  RefreshCw,
  Users,
  AlertCircle,
  Settings
} from 'lucide-react';
import { ConversationData } from '@/lib/types';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationToast } from '@/components/notifications/notification-toast';
import { NotificationSettings } from '@/components/notifications/notification-settings';
import { NotificationStats } from '@/components/notifications/notification-stats';
import { ConnectionStatus } from '@/components/notifications/connection-status';

export default function AtendimentoPage() {
  const [queueConversations, setQueueConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendantName] = useState('Atendente SATIZAP'); // In real app, get from auth
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  useEffect(() => {
    loadQueueConversations();
    const interval = setInterval(loadQueueConversations, 30000); // Refresh every 30s
    
    // Start queue monitoring
    startQueueMonitoring();
    
    return () => clearInterval(interval);
  }, []);

  const startQueueMonitoring = async () => {
    try {
      await fetch('/api/notifications/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', intervalMinutes: 5 }),
      });
    } catch (error) {
      console.error('Error starting queue monitoring:', error);
    }
  };

  const loadQueueConversations = async () => {
    try {
      const response = await fetch('/api/attendant/queue');
      if (response.ok) {
        const data = await response.json();
        setQueueConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const takeConversation = async (conversationId: string) => {
    try {
      const response = await fetch('/api/attendant/take-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          attendantId: 'current-attendant-id' // In real app, get from auth
        }),
      });

      if (response.ok) {
        // Redirect to conversation interface
        window.location.href = `/atendimento/conversa/${conversationId}`;
      }
    } catch (error) {
      console.error('Error taking conversation:', error);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getPatientInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast Component */}
      <NotificationToast enabled={monitoringEnabled} showOnlyHighPriority={false} />
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Central de Atendimento SATIZAP
              </h1>
              <p className="text-gray-600">
                Olá, {attendantName}! Gerencie as conversas que precisam de atendimento humano.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{queueConversations.length} na fila</span>
              </div>
              
              <ConnectionStatus />
              <NotificationBell />
              <NotificationSettings />
              
              <Button onClick={loadQueueConversations} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Dashboard */}
        <div className="mb-8">
          <NotificationStats />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Queue List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Fila de Atendimento
                </CardTitle>
                <CardDescription>
                  Pacientes aguardando atendimento humano
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Carregando conversas...</p>
                  </div>
                ) : queueConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Nenhuma conversa na fila</p>
                    <p className="text-sm text-gray-400">
                      Conversas que precisam de atendimento humano aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {queueConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedConversation(conversation)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {getPatientInitials(conversation.Patient.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium">{conversation.Patient.name}</h3>
                                  <Badge variant="secondary">
                                    {conversation.status === 'fila_humano' ? 'Na Fila' : conversation.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                  <div className="flex items-center">
                                    <Phone className="h-3 w-3 mr-1" />
                                    {conversation.Patient.whatsapp}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimeAgo(conversation.updatedAt)}
                                  </div>
                                  <div className="flex items-center">
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    {conversation.Message.length} mensagens
                                  </div>
                                </div>
                                {conversation.Message.length > 0 && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                    {conversation.Message[conversation.Message.length - 1]?.content}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                takeConversation(conversation.id);
                              }}
                              size="sm"
                            >
                              Assumir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Conversation Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Conversa</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConversation ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {getPatientInitials(selectedConversation.Patient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{selectedConversation.Patient.name}</h3>
                        <p className="text-sm text-gray-500">{selectedConversation.Patient.whatsapp}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Status:</span>
                        <Badge variant="outline">{selectedConversation.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Iniciada:</span>
                        <span>{formatTimeAgo(selectedConversation.startedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Mensagens:</span>
                        <span>{selectedConversation.Message.length}</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-sm mb-2">Histórico Recente:</h4>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {selectedConversation.Message.slice(-5).map((message, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">
                                  {message.senderType === 'paciente' ? 'Paciente' : 'IA'}:
                                </span>
                              </div>
                              <p className="text-gray-600 mt-1 line-clamp-3">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <Button
                      onClick={() => takeConversation(selectedConversation.id)}
                      className="w-full"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Assumir Conversa
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Selecione uma conversa</p>
                    <p className="text-sm text-gray-400">
                      Clique em uma conversa da fila para ver os detalhes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}