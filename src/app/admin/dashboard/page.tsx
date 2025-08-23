
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
import { ArrowRight, Utensils, Check, ChefHat, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
  }
};


function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: Order['status']) => void; }) {
    const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const createdAtDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as any);

    const config = statusConfig[order.status as keyof typeof statusConfig];
    if (order.status === 'Cancelado' || order.status === 'Finalizado' || !config) return null;

    const address = order.clientInfo.address;
    const formattedAddress = address ? `${address.street || ''}, ${address.number || ''} - ${address.neighborhood || ''}`.trim().replace(/, -$/, '') : 'Retirada no local';


    return (
         <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="w-full"
        >
            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card w-full">
                <CardHeader className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold">
                            {order.clientInfo.name}
                        </CardTitle>
                        <span className="text-sm font-mono text-muted-foreground">#{order.id?.slice(-5).toUpperCase()}</span>
                    </div>
                     <div className="text-xs text-muted-foreground flex items-center gap-4">
                        <span>{format(createdAtDate, "HH:mm'h'", { locale: ptBR })}</span>
                        {address && (
                            <span className="flex items-center gap-1.5 truncate">
                                <MapPin size={12} />
                                <span className="truncate">{formattedAddress}</span>
                            </span>
                        )}
                    </div>
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

function KdsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-max">
            {Object.keys(statusConfig).map(status => (
                <div key={status} className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 w-[350px]">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-8" />
                    </h2>
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function DashboardPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isStoreOpen, setIsStoreOpen] = useState<boolean | undefined>(undefined);
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
                setOrders([]);
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
        const intervalId = setInterval(fetchDashboardData, 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(intervalId);
    }, []);

    const handleToggleStore = async (isOpen: boolean) => {
        startTransition(async () => {
            const result = await toggleStoreStatus(isOpen);
            if (result.success) {
                toast({ title: `Loja ${isOpen ? 'Aberta' : 'Fechada'}!`, description: isOpen ? 'Prontos para receber novos pedidos.' : 'Novos pedidos estão pausados.' });
                await fetchDashboardData();
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.error });
            }
        });
    };
    
    const handleStatusChange = async (id: string, newStatus: Order['status']) => {
        
        const originalOrders = [...orders];
        const updatedOrders = orders.filter(o => o.id !== id);
        setOrders(updatedOrders);
        
        const result = await updateOrderStatus(id, newStatus);
        
        if (result.success) {
            toast({ title: 'Status atualizado!', description: `Pedido movido para "${newStatus}".` });
        } else {
            toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível atualizar o status do pedido.'});
            setOrders(originalOrders);
        }
    };


    const ordersByStatus = {
        Recebido: orders.filter(o => o.status === 'Recebido'),
        'Em Preparo': orders.filter(o => o.status === 'Em Preparo'),
        'Pronto para Entrega': orders.filter(o => o.status === 'Pronto para Entrega'),
    };
    
    const statusKeys = Object.keys(statusConfig) as (keyof typeof statusConfig)[];


    return (
        <div className="flex flex-col min-h-full bg-muted/20 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="bg-background dark:bg-card shadow-sm p-4 sticky top-0 z-20 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Painel da Loja - KDS</h1>
                 {isStoreOpen === undefined ? (
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-11" />
                    </div>
                ) : (
                <div className="flex items-center space-x-2">
                    <Label htmlFor="store-status-switch" className={cn(
                        "font-semibold transition-colors",
                        isStoreOpen ? "text-green-600" : "text-red-600"
                        )}>
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
                 )}
            </header>
            
            <main className="flex-1 p-4 overflow-x-auto">
                 {isLoading ? (
                    <KdsSkeleton />
                ) : !isStoreOpen ? (
                     <div className="flex items-center justify-center h-full text-center">
                         <div className="bg-background p-8 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold mb-2">Loja Fechada</h2>
                            <p className="text-muted-foreground">Abra a loja para começar a receber e gerenciar os pedidos do dia.</p>
                        </div>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-max">
                        {statusKeys.map(status => (
                            <div key={status} className="bg-muted/40 dark:bg-muted/50 rounded-lg p-4 w-[350px]">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                     <span className={cn("w-3 h-3 rounded-full", statusConfig[status].color)}></span>
                                    {statusConfig[status].title}
                                    <span className="text-base font-normal text-muted-foreground">({(ordersByStatus[status] || []).length})</span>
                                </h2>
                                <AnimatePresence>
                                <div className="space-y-4">
                                    {(ordersByStatus[status] || []).length > 0 ? (
                                        ordersByStatus[status].map(order => (
                                            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                                        ))
                                    ) : (
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
