
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getOrders, updateOrderStatus } from '@/lib/firebase/orders';
import { getStoreStatus, toggleStoreStatus } from '@/lib/firebase/store';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ArrowRight, Utensils, Check, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig = {
  Recebido: {
    title: "A Receber",
    icon: <Utensils className="h-5 w-5" />,
    color: "bg-blue-500",
    nextStatus: "Em Preparo" as const,
    actionLabel: "Preparar Pedido"
  },
  'Em Preparo': {
    title: "Em Preparo",
    icon: <ChefHat className="h-5 w-5" />,
    color: "bg-yellow-500",
    nextStatus: "Pronto para Entrega" as const,
    actionLabel: "Marcar como Pronto"
  },
  'Pronto para Entrega': {
    title: "Pronto para Entrega",
    icon: <Check className="h-5 w-5" />,
    color: "bg-green-500",
    nextStatus: "Finalizado" as const,
    actionLabel: "Finalizar Pedido"
  },
  Finalizado: {
    title: "Finalizados",
    icon: <Check className="h-5 w-5" />,
    color: "bg-gray-500",
    nextStatus: null,
    actionLabel: ""
  },
};


function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: Order['status']) => void; }) {
    const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const createdAtDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as any);

    const config = statusConfig[order.status];
    if (order.status === 'Cancelado' || !config) return null;

    return (
         <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="w-full"
        >
            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card w-full">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg font-bold flex justify-between items-center">
                        <span>{order.clientInfo.name}</span>
                        <span className="text-sm font-mono text-muted-foreground">#{order.id?.slice(-5).toUpperCase()}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground pt-1">
                        {format(createdAtDate, "HH:mm'h'", { locale: ptBR })}
                    </p>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                    <Separator />
                    <div className="text-sm space-y-2 max-h-32 overflow-y-auto pr-2">
                        {order.items.map(item => (
                            <div key={item.productId} className="flex justify-between items-center">
                                <div>
                                    <span className="font-semibold">{item.quantity}x</span> {item.productName}
                                </div>
                                <span className="font-mono text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <Separator />
                </CardContent>
                <CardFooter className="p-4 pt-0 flex flex-col items-stretch gap-4">
                    <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total:</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount)}</span>
                    </div>
                     {config.nextStatus && (
                        <Button size="sm" onClick={() => onStatusChange(order.id!, config.nextStatus!)}>
                            {config.actionLabel}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
    );
}

export default function DashboardPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<true | false>(true);
    const [isSwitching, startTransition] = useTransition();


    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const statusData = await getStoreStatus();
            setIsStoreOpen(statusData.isOpen);

            if (statusData.isOpen) {
                const ordersData = await getOrders();
                setOrders(ordersData);
            } else {
                setOrders([]); // Clear orders if store is closed
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: 'Não foi possível buscar as informações do dashboard.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleToggleStore = async (isOpen: boolean) => {
        startTransition(async () => {
            const result = await toggleStoreStatus(isOpen);
            if (result.success) {
                toast({ title: `Loja ${isOpen ? 'Aberta' : 'Fechada'}!`, description: isOpen ? 'Prontos para receber novos pedidos.' : 'Novos pedidos estão pausados.' });
                await fetchDashboardData(); // Refresh data
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error });
            }
        });
    };
    
    const handleStatusChange = async (id: string, newStatus: Order['status']) => {
        
        // Optimistic UI update
        const originalOrders = [...orders];
        const updatedOrders = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
        setOrders(updatedOrders);
        
        const result = await updateOrderStatus(id, newStatus);
        
        if (result.success) {
            toast({ title: 'Status atualizado!', description: `Pedido movido para "${newStatus}".` });
        } else {
            toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível atualizar o status do pedido.'});
            setOrders(originalOrders); // Revert on failure
        }
    };


    const ordersByStatus = {
        Recebido: orders.filter(o => o.status === 'Recebido'),
        'Em Preparo': orders.filter(o => o.status === 'Em Preparo'),
        'Pronto para Entrega': orders.filter(o => o.status === 'Pronto para Entrega'),
        Finalizado: orders.filter(o => o.status === 'Finalizado'),
    };
    
    const statusKeys = Object.keys(statusConfig) as (keyof typeof statusConfig)[];


    return (
        <div className="flex flex-col min-h-full bg-muted/20 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="bg-background dark:bg-card shadow-sm p-4 sticky top-0 z-20 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Painel de Pedidos - KDS</h1>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="store-status-switch" className={isStoreOpen ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {isSwitching ? "Alterando..." : isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}
                    </Label>
                    <Switch
                        id="store-status-switch"
                        checked={isStoreOpen}
                        onCheckedChange={handleToggleStore}
                        disabled={isSwitching || isLoading}
                        aria-readonly={isSwitching || isLoading}
                    />
                </div>
            </header>
            
            <main className="flex-1 p-4 overflow-x-auto">
                 {isLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Carregando painel...</div>
                ) : !isStoreOpen ? (
                     <div className="flex items-center justify-center h-full text-center">
                         <div className="bg-background p-8 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold mb-2">Loja Fechada</h2>
                            <p className="text-muted-foreground">Abra a loja para começar a receber e gerenciar os pedidos do dia.</p>
                        </div>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-w-max">
                        {statusKeys.map(status => (
                            <div key={status} className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 w-[350px]">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                     <span className={cn("w-3 h-3 rounded-full", statusConfig[status].color)}></span>
                                    {statusConfig[status].title}
                                    <span className="text-base font-normal text-muted-foreground">({ordersByStatus[status].length})</span>
                                </h2>
                                <AnimatePresence>
                                <div className="space-y-4">
                                    {ordersByStatus[status].map(order => (
                                        <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                                    ))}
                                    {ordersByStatus[status].length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-8 px-4 rounded-lg border-2 border-dashed">
                                            Nenhum pedido aqui.
                                        </div>
                                    )}
                                </div>
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
