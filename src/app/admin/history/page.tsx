
import { getClosedOrdersGroupedByDate } from '@/lib/firebase/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function CompactOrderCard({ order }: { order: Order }) {
    const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const createdAtDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as any);
    
    return (
        <div className="flex items-center justify-between p-3 border-b transition-colors hover:bg-muted/50">
            <div className="flex flex-col gap-1">
                <span className="font-semibold">{order.clientInfo.name}</span>
                <span className="text-xs text-muted-foreground">
                    #{order.id?.slice(-5).toUpperCase()} - {totalItems} {totalItems > 1 ? 'itens' : 'item'}
                </span>
            </div>
            <div className="flex items-center gap-4">
                 <span className="text-sm font-mono text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount)}</span>
                 <Badge variant={order.status === 'Cancelado' ? 'destructive' : 'secondary'} className="w-24 justify-center">
                    {order.status}
                </Badge>
                 <span className="text-sm text-muted-foreground w-12 text-right">{format(createdAtDate, "HH:mm'h'", { locale: ptBR })}</span>
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
