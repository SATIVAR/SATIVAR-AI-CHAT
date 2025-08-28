
'use server';

import { getClosedOrdersGroupedByDate } from '@/lib/services/order.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Order as PrismaOrder, OrderItem } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type OrderWithItems = PrismaOrder & { OrderItem: OrderItem[] };

function CompactOrderCard({ order }: { order: OrderWithItems }) {
    const totalItems = order.OrderItem.reduce((acc, item) => acc + item.quantity, 0);
    
    return (
        <div className="flex items-center justify-between p-3 border-b transition-colors hover:bg-muted/50">
            <div className="flex flex-col gap-1">
                <span className="font-semibold">{order.clientName}</span>
                <span className="text-xs text-muted-foreground">
                    #{order.id?.slice(-5).toUpperCase()} - {totalItems} {totalItems > 1 ? 'itens' : 'item'}
                </span>
            </div>
            <div className="flex items-center gap-4">
                 <span className="text-sm font-mono text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount.toNumber())}</span>
                 <Badge variant={order.status === 'Cancelado' ? 'destructive' : 'secondary'} className="w-24 justify-center">
                    {order.status}
                </Badge>
                 <span className="text-sm text-muted-foreground w-12 text-right">{format(order.createdAt, "HH:mm'h'", { locale: ptBR })}</span>
            </div>
        </div>
    )
}

export default async function HistoryPage() {
  
  const groupedOrders = await getClosedOrdersGroupedByDate();
  const dateKeys = Object.keys(groupedOrders);
  
  return (
    <div className="w-full space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Histórico de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
           {dateKeys.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    Nenhum pedido finalizado ou cancelado encontrado.
                </div>
            ) : (
                <Accordion type="multiple" className="w-full">
                    {dateKeys.map(date => (
                         <AccordionItem key={date} value={date}>
                            <AccordionTrigger className="px-4 text-lg font-medium hover:no-underline hover:bg-muted/50 rounded-md">
                                {date.charAt(0).toUpperCase() + date.slice(1)}
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                                <div className="border-t">
                                    {/* @ts-ignore */}
                                    {groupedOrders[date].map(order => (
                                        <CompactOrderCard key={order.id} order={order} />
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
