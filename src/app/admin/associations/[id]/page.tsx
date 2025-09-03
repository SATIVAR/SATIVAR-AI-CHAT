'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  MessageCircle, 
  Settings, 
  Globe, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface AssociationDetails {
  id: string;
  name: string;
  subdomain: string;
  wordpressUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  publicDisplayName?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  descricaoPublica?: string;
  totalPatients: number;
  activeConversations: number;
  conversationsWithIA: number;
  conversationsInQueue: number;
  conversationsWithHuman: number;
  resolvedConversations: number;
  recentPatients: Array<{
    id: string;
    name: string;
    whatsapp: string;
    status: string;
    createdAt: Date;
  }>;
  recentConversations: Array<{
    id: string;
    status: string;
    patient: {
      name: string;
      whatsapp: string;
    };
    updatedAt: Date;
  }>;
}

export default function AssociationDetailsPage() {
  const params = useParams();
  const associationId = params.id as string;
  
  const [association, setAssociation] = useState<AssociationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (associationId) {
      loadAssociationDetails();
    }
  }, [associationId]);

  const loadAssociationDetails = async () => {
    try {
      const response = await fetch(`/api/admin/associations/${associationId}/details`);
      if (response.ok) {
        const data = await response.json();
        setAssociation(data.association);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da associação:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'com_ia': { variant: 'secondary' as const, label: 'Com IA' },
      'fila_humano': { variant: 'destructive' as const, label: 'Aguardando' },
      'com_humano': { variant: 'default' as const, label: 'Em Atendimento' },
      'resolvida': { variant: 'outline' as const, label: 'Resolvida' }
    };

    const config = variants[status as keyof typeof variants] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Carregando detalhes da associação...</p>
        </div>
      </div>
    );
  }

  if (!association) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Associação não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A associação solicitada não existe ou você não tem permissão para visualizá-la.
          </p>
          <Link href="/admin/associations">
            <Button>Voltar para Associações</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {association.logoUrl && (
              <img 
                src={association.logoUrl} 
                alt={association.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{association.name}</h1>
              <p className="text-muted-foreground">
                {association.publicDisplayName || association.subdomain}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={association.isActive ? "default" : "secondary"}>
                  {association.isActive ? "Ativa" : "Inativa"}
                </Badge>
                <Link href={`https://${association.subdomain}.sativar.com.br`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visitar Site
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/admin/associations/${association.id}/edit`}>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Link href={`/${association.subdomain}/admin/inbox`}>
              <Button>
                <MessageCircle className="w-4 h-4 mr-2" />
                Acessar Chat
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pacientes</p>
                <p className="text-2xl font-bold">{association.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold">{association.activeConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Na Fila</p>
                <p className="text-2xl font-bold text-red-600">{association.conversationsInQueue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Resolvidas</p>
                <p className="text-2xl font-bold">{association.resolvedConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Detalhes */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="patients">Pacientes Recentes</TabsTrigger>
          <TabsTrigger value="conversations">Conversas Recentes</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Conversas */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Com IA</span>
                    </div>
                    <span className="font-semibold">{association.conversationsWithIA}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Aguardando Atendimento</span>
                    </div>
                    <span className="font-semibold">{association.conversationsInQueue}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Em Atendimento Humano</span>
                    </div>
                    <span className="font-semibold">{association.conversationsWithHuman}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Resolvidas</span>
                    </div>
                    <span className="font-semibold">{association.resolvedConversations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações Gerais */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Subdomínio</p>
                  <p className="font-medium">{association.subdomain}.sativar.com.br</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">WordPress URL</p>
                  <p className="font-medium">{association.wordpressUrl}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">{formatDate(association.createdAt)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{formatDate(association.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {association.recentPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum paciente cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {association.recentPatients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">{patient.whatsapp}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{patient.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(patient.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Conversas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {association.recentConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {association.recentConversations.map((conversation) => (
                      <div key={conversation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{conversation.patient.name}</p>
                          <p className="text-sm text-muted-foreground">{conversation.patient.whatsapp}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(conversation.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(conversation.updatedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Associação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {association.welcomeMessage && (
                <div>
                  <p className="text-sm text-muted-foreground">Mensagem de Boas-vindas</p>
                  <p className="font-medium">{association.welcomeMessage}</p>
                </div>
              )}
              
              {association.descricaoPublica && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição Pública</p>
                  <p className="font-medium">{association.descricaoPublica}</p>
                </div>
              )}
              
              <div className="pt-4">
                <Link href={`/admin/associations/${association.id}/edit`}>
                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Editar Configurações
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}