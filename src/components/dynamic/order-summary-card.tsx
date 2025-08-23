
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { MinusCircle, PlusCircle } from 'lucide-react';

interface OrderSummaryCardProps {
  order: OrderItem[];
  onUpdateOrder: (productId: string, quantity: number) => void;
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ order, onUpdateOrder }) => {
  const total = order.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      layout
    >
      <Card className="w-full shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle>🧾 Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-48 pr-4">
            <div className="space-y-4">
              {order.length > 0 ? order.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex-grow">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => onUpdateOrder(item.id, item.quantity - 1)}>
                        <MinusCircle size={16} />
                     </Button>
                     <span className="font-bold w-4 text-center">{item.quantity}</span>
                     <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => onUpdateOrder(item.id, item.quantity + 1)}>
                        <PlusCircle size={16} />
                     </Button>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm">Seu carrinho está vazio.</p>}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-2 pt-4 border-t">
          <div className="flex justify-between items-center text-lg font-bold mt-2">
            <p>Total</p>
            <p className="text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </p>
          </div>
           <p className="text-xs text-muted-foreground text-center pt-2">
              Se estiver tudo certo, por favor, preencha seus dados abaixo para finalizar.
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default OrderSummaryCard;
