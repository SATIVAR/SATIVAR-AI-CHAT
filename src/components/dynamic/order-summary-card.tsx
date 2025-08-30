
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { OrderSummaryCardData } from '@/lib/types';
import { Separator } from '../ui/separator';

interface OrderSummaryCardProps {
  data: OrderSummaryCardData;
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ data }) => {
    const { toast } = useToast();

    // This card can now be a placeholder or a full summary.
    React.useEffect(() => {
        if (!data.summary) { // Only toast if it's the pre-submission card
            toast({
                title: 'Revise seu orçamento',
                description: 'Por favor, preencha seus dados de entrega abaixo para confirmar o orçamento.',
            });
        }
    }, [toast, data.summary]);


  const variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
  };

  if (data.summary && data.total !== undefined) {
    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            layout
            className="w-full"
        >
            <Card className="w-full shadow-lg border-primary/20 bg-primary/5 dark:bg-primary/10">
                <CardHeader>
                    <CardTitle>✅ Orçamento Confirmado!</CardTitle>
                    <CardDescription>Resumo do seu orçamento:</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans bg-background/50 p-3 rounded-md border">
                        {data.summary}
                    </pre>
                </CardContent>
                <CardFooter className="flex-col items-stretch space-y-2 pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Pago:</span>
                        <span className="text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}</span>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
  }


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
                Seu orçamento está pronto. Para finalizar, por favor, preencha seus dados de entrega e contato logo abaixo.
            </p>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-2 pt-4 border-t">
           <p className="text-xs text-muted-foreground text-center pt-2">
              Você pode revisar os itens do seu orçamento a qualquer momento clicando no ícone de carrinho no canto superior direito.
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default OrderSummaryCard;
