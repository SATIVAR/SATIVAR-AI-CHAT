'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Users, Building2, Clock, TrendingUp, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface AssociationStats {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  totalPatients: number;
  activeConversations: number;
  conversationsWithIA: number;
  conversationsInQueue: number;
  conversationsWithHuman: number;
  resolvedConversations: number;
  lastActivity?: Date;
}

interface SystemOverview {
  totalAssociations: number;
  activeAssociations: number;
  totalPatients: number;
  totalConversations: number;
  conversationsNeedingAttention: number;
}

export default function SuperAdminInboxPage() {
  const [associations, setAssociations] = useState<AssociationStats[]>([]);
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar dados das associações
  useEffect(() => {
    loadAssociationsData();
    
    // Atualizar a cada 60 segundos
    const interval = setInterval(loadAssociationsData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAssociationsData = async () => {
    try {
      const response = await fetch('/api/admin/associations/stats');
      if (response.ok) {
        const data = await response.json();
        setAssociations(data.associations || []);
        setSystemOverview(data.overview || null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados das associações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (count: number, type: 'queue' | 'active' | 'resolved') => {
    if (count === 0) return 'text-muted-foreground';
    
    switch (type) {
      case 'queue':
        return count > 5 ? 'text-red-600' : count > 2 ? 'text-yellow-600' : 'text-green-600';
      case 'active':
        return count > 10 ? 'text-blue-600' : 'text-blue-500';
      case 'resolved':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatLastActivity = (date?: Date) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const getPriorityLevel = (association: AssociationStats) => {
    const queueCount = association.conversationsInQueue;
    if (queueCount > 5) return { level: 'high', color: 'text-red-600', icon: AlertCircle };
    if (queueCount > 2) return { level: 'medium', color: 'text-yellow-600', icon: Clock };
    return { level: 'low', color: 'text-green-600', icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Carregando dados das associações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Visão Geral - WhatsApp</h1>
        <p className="text-muted-foreground">
          Monitore todas as associações e suas conversas WhatsApp
        </p>
      </div>

      {/* Cards de Resumo */}
      {systemOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Associações</p>
                  <p className="text-2xl font-bold">
                    {systemOverview.activeAssociations}/{systemOverview.totalAssociations}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pacientes</p>
                  <p className="text-2xl font-bold">{systemOverview.totalPatients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Conversas</p>
                  <p className="text-2xl font-bold">{systemOverview.totalConversations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Precisam Atenção</p>
                  <p className="text-2xl font-bold text-red-600">
                    {systemOverview.conversationsNeedingAttention}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Associações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Associações ({associations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {associations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma associação encontrada</h3>
                <p>Cadastre associações para começar a monitorar conversas</p>
              </div>
            ) : (
              <div className="divide-y">
                {associations.map((association) => {
                  const priority = getPriorityLevel(association);
                  const PriorityIcon = priority.icon;
                  
                  return (
                    <div key={association.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{association.name}</h3>
                            <Badge variant={association.isActive ? "default" : "secondary"}>
                              {association.isActive ? "Ativa" : "Inativa"}
                            </Badge>
                            <PriorityIcon className={`w-4 h-4 ${priority.color}`} />
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {association.subdomain}.sativar.com.br
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Pacientes</p>
                              <p className="text-lg font-semibold">{association.totalPatients}</p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Com IA</p>
                              <p className="text-lg font-semibold text-purple-600">
                                {association.conversationsWithIA}
                              </p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Na Fila</p>
                              <p className={`text-lg font-semibold ${getStatusColor(association.conversationsInQueue, 'queue')}`}>
                                {association.conversationsInQueue}
                              </p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Em Atendimento</p>
                              <p className={`text-lg font-semibold ${getStatusColor(association.conversationsWithHuman, 'active')}`}>
                                {association.conversationsWithHuman}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Última atividade: {formatLastActivity(association.lastActivity)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>{association.resolvedConversations} resolvidas</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Link href={`/admin/associations/${association.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </Link>
                          
                          {association.conversationsInQueue > 0 && (
                            <Link href={`/${association.subdomain}/admin/inbox`}>
                              <Button size="sm" className="w-full">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Atender ({association.conversationsInQueue})
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Barra de progresso das conversas */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="flex h-2 rounded-full overflow-hidden">
                          {association.activeConversations > 0 && (
                            <>
                              <div 
                                className="bg-purple-500" 
                                style={{ 
                                  width: `${(association.conversationsWithIA / association.activeConversations) * 100}%` 
                                }}
                              />
                              <div 
                                className="bg-yellow-500" 
                                style={{ 
                                  width: `${(association.conversationsInQueue / association.activeConversations) * 100}%` 
                                }}
                              />
                              <div 
                                className="bg-blue-500" 
                                style={{ 
                                  width: `${(association.conversationsWithHuman / association.activeConversations) * 100}%` 
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}