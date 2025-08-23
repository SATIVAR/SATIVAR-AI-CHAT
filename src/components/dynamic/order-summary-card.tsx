
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface OrderSummaryCardProps {
  order?: OrderItem[];
  onUpdateOrder?: (productId: string, quantity: number) => void;
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = () => {
    const { toast } = useToast();

    // In this new flow, the summary card is just a placeholder.
    // The actual order details are managed in the CartModal.
    React.useEffect(() => {
        toast({
            title: 'Revise seu pedido',
            description: 'Por favor, preencha seus dados de entrega abaixo para confirmar o pedido.',
        });
    }, [toast]);


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
          <CardTitle>🧾 Quase lá!</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Seu pedido está pronto. Para finalizar, por favor, preencha seus dados de entrega e contato logo abaixo.
            </p>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-2 pt-4 border-t">
           <p className="text-xs text-muted-foreground text-center pt-2">
              Você pode revisar os itens do seu pedido a qualquer momento clicando no ícone de carrinho no canto superior direito.
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default OrderSummaryCard;
