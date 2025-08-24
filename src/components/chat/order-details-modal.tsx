
'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Order } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MapPin, ShoppingBag, User } from 'lucide-react';

interface OrderDetailsModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    order: Order | null;
}

const statusVariantMap: { [key in Order['status']]: 'default' | 'secondary' | 'destructive' } = {
  Recebido: 'default',
  'Em Preparo': 'secondary',
  'Pronto para Entrega': 'secondary',
  Finalizado: 'secondary',
  Cancelado: 'destructive'
};


const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, setIsOpen, order }) => {
    if (!order) return null;

    const total = order.totalAmount;
    const createdAtDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as any);
    const formattedAddress = order.clientInfo.address ? `${order.clientInfo.address.street || ''}, ${order.clientInfo.address.number || ''} - ${order.clientInfo.address.neighborhood || ''}`.trim().replace(/, -$/, '') : 'Retirada no local';

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="sm:max-w-lg flex flex-col">
                <SheetHeader className="text-left">
                    <SheetTitle className="text-2xl">Detalhes do Pedido</SheetTitle>
                    <SheetDescription>
                        Acompanhe as informações do seu pedido atual.
                    </SheetDescription>
                </SheetHeader>

                <Separator className="my-4" />
                
                <ScrollArea className="flex-grow pr-4 -mr-6">
                    <div className="space-y-6">

                        {/* Order Status Section */}
                        <div className="space-y-2">
                             <h3 className="font-semibold text-lg">Status</h3>
                             <div className="flex items-center gap-4">
                                <Badge variant={statusVariantMap[order.status]} className={cn("text-base px-3 py-1", order.status === 'Recebido' && 'bg-blue-600 hover:bg-blue-700')}>{order.status}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    Feito às {format(createdAtDate, "HH:mm'h'", { locale: ptBR })}
                                </span>
                             </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><ShoppingBag size={20} /> Itens do Pedido</h3>
                             <div className="border rounded-md">
                                {order.items.map((item, index) => (
                                    <React.Fragment key={item.productId}>
                                        <div className="flex items-center justify-between p-3">
                                            <div className="flex flex-col">
                                                <p><span className="font-bold">{item.quantity}x</span> {item.productName}</p>
                                                <p className="text-xs text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)} cada</p>
                                            </div>
                                            <p className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}</p>
                                        </div>
                                        {index < order.items.length - 1 && <Separator />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        
                        {/* Client Info Section */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><User size={20} /> Seus Dados</h3>
                            <div className="text-sm text-muted-foreground border p-3 rounded-md space-y-1">
                                <p><span className="font-semibold text-foreground">Nome:</span> {order.clientInfo.name}</p>
                                <p><span className="font-semibold text-foreground">Telefone:</span> {order.clientInfo.phone}</p>
                            </div>
                        </div>

                        {/* Address Section */}
                         <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin size={20} /> Entrega</h3>
                            <div className="text-sm text-muted-foreground border p-3 rounded-md">
                                <p className="font-medium text-foreground">{formattedAddress}</p>
                                {order.clientInfo.address?.reference && (
                                    <p className="text-xs mt-1">Ref: {order.clientInfo.address.reference}</p>
                                )}
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                <SheetFooter className="mt-auto pt-6 border-t">
                    <div className="w-full space-y-4">
                         <div className="flex justify-between items-center text-xl font-bold">
                            <span>Total:</span>
                            <span className="text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                        </div>
                        <Button className="w-full" onClick={() => setIsOpen(false)}>Fechar</Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

export default OrderDetailsModal;

    