
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Message, OrderItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import ProductCard from '../dynamic/product-card';
import QuickReplyButton from '../dynamic/quick-reply-button';
import OrderSummaryCard from '../dynamic/order-summary-card';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Logo } from '../icons/logo';

interface MessageBubbleProps {
  message: Message;
  order: OrderItem[];
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  onUpdateOrder: (productId: string, quantity: number) => void;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message,
  order,
  onSendMessage,
  onAddToOrder,
  onUpdateOrder,
  isLast
 }) => {
  const isUser = message.role === 'user';
  
  const bubbleClasses = cn(
    "flex w-full max-w-md flex-col gap-2",
    isUser ? "ml-auto items-end" : "mr-auto items-start",
    message.isConfirmation ? "mx-auto w-auto max-w-none items-center" : "items-start gap-3 md:gap-4",
    isUser ? "flex-row-reverse" : "flex-row"
  );

  const contentClasses = cn(
    "relative rounded-2xl px-4 py-3 text-sm md:text-base shadow-sm",
    isUser
      ? "rounded-br-lg bg-primary text-primary-foreground"
      : "rounded-bl-lg bg-secondary text-secondary-foreground",
    message.isConfirmation ? "bg-accent/80 text-accent-foreground text-xs text-center font-medium" : ""
  );

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }
  };

  const confirmationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
    exit: { opacity: 0, scale: 0.8 }
  };
  
  if (message.isConfirmation) {
     return (
        <motion.div 
            className="flex justify-center"
            variants={confirmationVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
        >
            <p className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">{message.content}</p>
        </motion.div>
     )
  }

  return (
    <motion.div 
        className={bubbleClasses}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
    >
      <Avatar className="h-8 w-8 md:h-10 md:w-10 shadow-sm flex-shrink-0">
          <AvatarImage src={isUser ? undefined : '/logo.svg'} />
          <AvatarFallback className={cn(isUser ? 'bg-primary/20 text-primary' : 'bg-secondary-foreground/10 text-secondary-foreground')}>
              {isUser ? <User size={18} /> : <Bot size={18} />}
          </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1.5 max-w-[85%]">
          <div className={cn(contentClasses, "flex flex-col gap-3")}>
              {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
              {message.components && (
                  <div className="mt-2 flex w-full flex-col gap-3">
                      {message.components.map((component, index) => {
                          switch (component.type) {
                              case 'productCard':
                                  return <ProductCard key={index} data={component} onAddToOrder={onAddToOrder} />;
                              case 'quickReplyButton':
                                  return <QuickReplyButton key={index} data={component} onSendMessage={onSendMessage} />;
                              case 'orderSummaryCard':
                                  return <OrderSummaryCard key={index} order={order} onUpdateOrder={onUpdateOrder} />;
                              default:
                                  return null;
                          }
                      })}
                  </div>
              )}
          </div>
          <span className={cn("text-xs text-muted-foreground", isUser ? 'text-right' : 'text-left')}>
              {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
          </span>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
