
'use client';

import React from 'react';
import { Message, OrderItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import ProductCard from '../dynamic/product-card';
import QuickReplyButton from '../dynamic/quick-reply-button';
import OrderSummaryCard from '../dynamic/order-summary-card';
import UserDetailsForm from '../dynamic/user-details-form';

interface MessageBubbleProps {
  message: Message;
  order: OrderItem[];
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  onSubmitOrder: (data: { name: string, phone: string }) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message,
  order,
  onSendMessage,
  onAddToOrder,
  onSubmitOrder
 }) => {
  const isUser = message.role === 'user';
  const bubbleClasses = cn(
    "flex w-full max-w-md flex-col gap-1",
    isUser ? "ml-auto items-end" : "mr-auto items-start",
    message.isConfirmation ? "mx-auto items-center" : "",
  );

  const contentClasses = cn(
    "rounded-xl px-4 py-3 text-sm md:text-base",
    isUser
      ? "rounded-br-none bg-primary text-primary-foreground"
      : "rounded-bl-none bg-card-foreground/10 text-card-foreground",
    message.isConfirmation ? "bg-accent/20 text-accent-foreground/80 text-xs text-center" : "",
    "animate-fade-in"
  );
  
  if (message.isConfirmation) {
     return (
        <div className={bubbleClasses}>
            <p className={contentClasses}>{message.content}</p>
        </div>
     )
  }

  return (
    <div className={bubbleClasses}>
      <div className={contentClasses}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      <span className="text-xs text-muted-foreground">
        {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
      </span>

      {message.components && (
        <div className="mt-2 flex w-full flex-col gap-2">
          {message.components.map((component, index) => {
            switch (component.type) {
              case 'productCard':
                return <ProductCard key={index} data={component} onAddToOrder={onAddToOrder} />;
              case 'quickReplyButton':
                return <QuickReplyButton key={index} data={component} onSendMessage={onSendMessage} />;
              case 'orderSummaryCard':
                return <OrderSummaryCard key={index} order={order} />;
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
