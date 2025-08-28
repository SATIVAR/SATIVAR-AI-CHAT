
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Activity, Calendar, TrendingUp, BarChart3, Brain, Zap } from 'lucide-react';


// Mocked data for dashboard stats
const mockStats = {
  totalUsers: 1247,
  activeConversations: 89,
  dailyMessages: 3456,
  systemUptime: "99.9%",
  monthlyGrowth: "+12.5%",
  averageResponseTime: "1.2s"
};

const mockRecentActivity = [
  { id: 1, type: "user_registration", description: "Novo usuário registrado", time: "há 5 min" },
  { id: 2, type: "ai_interaction", description: "Conversação AI finalizada", time: "há 12 min" },
  { id: 3, type: "system_update", description: "Sistema atualizado", time: "há 1h" },
  { id: 4, type: "user_interaction", description: "Usuário ativo na plataforma", time: "há 2h" },
];

export default function DashboardPage() {


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <Badge variant="outline" className="text-sm">
                    <Activity className="mr-2 h-4 w-4" />
                    Sistema Ativo
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.totalUsers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {mockStats.monthlyGrowth} do mês anterior
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversações Ativas</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.activeConversations}</div>
                        <p className="text-xs text-muted-foreground">
                            Conversações em andamento
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.dailyMessages.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Processadas pelo sistema
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockStats.averageResponseTime}</div>
                        <p className="text-xs text-muted-foreground">
                            Tempo médio de resposta
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Visão Geral do Sistema</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Activity className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">Sistema Online</span>
                                </div>
                                <Badge variant="secondary">{mockStats.systemUptime}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Brain className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">IA Funcionando</span>
                                </div>
                                <Badge variant="secondary">Otimizada</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <TrendingUp className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium">Performance</span>
                                </div>
                                <Badge variant="secondary">Excelente</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {mockRecentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center space-x-3">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {activity.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
