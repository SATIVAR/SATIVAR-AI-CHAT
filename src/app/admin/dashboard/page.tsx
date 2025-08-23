
import { getOrders } from '@/lib/firebase/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function OrderCard({ order }: { order: Order }) {
    const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-4">
                <CardTitle className="text-base font-bold flex justify-between items-center">
                    <span>{order.clientInfo.name}</span>
                    <Badge variant={order.status === 'Recebido' ? 'default' : 'secondary'}>{order.status}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground pt-1">
                    {new Date(order.createdAt as any).toLocaleString('pt-BR')}
                </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-sm space-y-1">
                    {order.items.slice(0, 2).map(item => (
                        <p key={item.productId}>{item.quantity}x {item.productName}</p>
                    ))}
                    {order.items.length > 2 && <p className="text-xs text-muted-foreground">... e mais {order.items.length - 2} item(s)</p>}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center font-bold">
                    <span>Total:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount)}</span>
                </div>
            </CardContent>
        </Card>
    );
}


export default async function DashboardPage() {
  const orders = await getOrders();
  
  const ordersByStatus = {
    Recebido: orders.filter(o => o.status === 'Recebido'),
    'Em Preparo': orders.filter(o => o.status === 'Em Preparo'),
    'Pronto para Entrega': orders.filter(o => o.status === 'Pronto para Entrega'),
    Finalizado: orders.filter(o => o.status === 'Finalizado'),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4">
            <h1 className="text-2xl font-bold">Painel de Pedidos - KDS</h1>
        </header>
        <main className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {(['Recebido', 'Em Preparo', 'Pronto para Entrega', 'Finalizado'] as const).map(status => (
                <div key={status} className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4 text-center">{status} ({ordersByStatus[status].length})</h2>
                    <div className="space-y-4">
                        {ordersByStatus[status].map(order => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                         {ordersByStatus[status].length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido aqui.</p>}
                    </div>
                </div>
            ))}

        </main>
    </div>
  );
}
