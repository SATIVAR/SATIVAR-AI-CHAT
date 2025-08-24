
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, X } from 'lucide-react';
import { Order } from '@/lib/types';

interface OrderControlButtonsProps {
  onSendMessage: (text: string) => void;
  orderStatus?: Order['status'] | null; // Make status optional and nullable
}

const OrderControlButtons: React.FC<OrderControlButtonsProps> = ({ onSendMessage, orderStatus }) => {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 } 
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };
  
  // Conditionally render the cancel button
  const canCancel = orderStatus === 'Recebido';

  return (
    <motion.div
      className="w-full bg-background rounded-lg border p-3 shadow-sm space-y-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      layout
    >
        <motion.div variants={buttonVariants}>
            <Button variant="outline" className="w-full justify-start" onClick={() => onSendMessage('Gostaria de ver o cardápio')}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Fazer Novo Pedido
            </Button>
        </motion.div>

        {canCancel && (
            <motion.div variants={buttonVariants}>
                <Button variant="destructive" className="w-full justify-start" onClick={() => onSendMessage('quero cancelar meu pedido')}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar Pedido
                </Button>
            </motion.div>
        )}
    </motion.div>
  );
};

export default OrderControlButtons;
