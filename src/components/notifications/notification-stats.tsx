'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  MessageCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Timer
} from 'lucide-react';

interface QueueStats {
  totalInQueue: number;
  averageWaitTime: number;
  longestWaitTime: number;
  newConversationsToday: number;
  resolvedConversationsToday: number;
  urgentConversations: number;
}

export function NotificationStats() {
  const [stats, setStats] = useState<QueueStats>({
    totalInQueue: 0,
    averageWaitTime: 0,
    longestWaitTime: 0,
    newConversationsToday: 0,
    resolvedConversationsToday: 0,
    urgentConversations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/attendant/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getUrgencyColor = (count: number) => {
    if (count === 0) return 'bg-green-500';
    if (count <= 2) return 'bg-yellow-500';
    if (count <= 5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Estatísticas da Fila</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Fila Atual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Fila Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.totalInQueue}</span>
            <Badge variant={stats.totalInQueue > 5 ? "destructive" : "secondary"}>
              {stats.totalInQueue > 5 ? "Alta" : "Normal"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conversas aguardando atendimento
          </p>
        </CardContent>
      </Card>

      {/* Tempo Médio de Espera */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Tempo Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatTime(stats.averageWaitTime)}
            </span>
            <div 
              className={`h-2 w-2 rounded-full ${
                stats.averageWaitTime > 30 ? 'bg-red-500' : 
                stats.averageWaitTime > 15 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo médio na fila
          </p>
        </CardContent>
      </Card>

      {/* Conversas Urgentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-red-600">
              {stats.urgentConversations}
            </span>
            <div className={`h-2 w-2 rounded-full ${getUrgencyColor(stats.urgentConversations)}`} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Mais de 1h na fila
          </p>
        </CardContent>
      </Card>

      {/* Maior Tempo de Espera */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Timer className="h-4 w-4 mr-2" />
            Maior Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatTime(stats.longestWaitTime)}
            </span>
            <Badge variant={stats.longestWaitTime > 60 ? "destructive" : "outline"}>
              {stats.longestWaitTime > 60 ? "Crítico" : "OK"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conversa há mais tempo na fila
          </p>
        </CardContent>
      </Card>

      {/* Novas Conversas Hoje */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Novas Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              {stats.newConversationsToday}
            </span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conversas iniciadas hoje
          </p>
        </CardContent>
      </Card>

      {/* Resolvidas Hoje */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Resolvidas Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              {stats.resolvedConversationsToday}
            </span>
            <Badge variant="outline">
              {stats.resolvedConversationsToday > stats.newConversationsToday ? "+" : "="}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conversas finalizadas hoje
          </p>
        </CardContent>
      </Card>
    </div>
  );
}