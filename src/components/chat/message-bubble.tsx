
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import QuickReplyButton from '../dynamic/quick-reply-button';
import OrderSummaryCard from '../dynamic/order-summary-card';
import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import CompactProductCard from '../dynamic/compact-product-card';
import OrderControlButtons from '../dynamic/order-control-buttons';

interface MessageBubbleProps {
  message: Message;
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message,
  onSendMessage,
  onAddToOrder,
  isLast
 }) => {
  const isUser = message.role === 'user';
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');

  const handleImageClick = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setLightboxOpen(true);
  };
  
  const contentClasses = cn(
    "relative rounded-lg px-3 py-2 text-sm md:text-base shadow-md max-w-full",
    isUser
      ? "bg-[#E7FFDB] dark:bg-primary/60 text-gray-800 dark:text-primary-foreground"
      : "bg-background text-foreground",
    message.isConfirmation ? "bg-accent/80 text-accent-foreground text-xs text-center font-medium" : ""
  );

  const variants = {
    hidden: { opacity: 0, y: 10 },
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
            <p className="rounded-full bg-blue-100 dark:bg-primary/20 px-4 py-1.5 text-xs font-semibold text-blue-800 dark:text-primary-foreground/80">{message.content}</p>
        </motion.div>
     )
  }

  const hasOnlyCompactCards = message.components && message.components.length > 0 && message.components.every(c => c.type === 'productCard');

  // Do not render user messages that are just placeholders for an action
  if (isUser && message.content.startsWith('O usuário adicionou o item')) {
    return null;
  }

  return (
    <>
      <motion.div 
          className={cn("flex w-full max-w-md flex-col gap-1", isUser ? "ml-auto items-end" : "mr-auto items-start")}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          layout
      >
        <div className={cn(
          "flex items-end gap-2",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          {!isUser && (
            <Avatar className="h-8 w-8 md:h-9 md:w-9 shadow-sm flex-shrink-0 mb-4">
                <AvatarFallback className={'bg-primary/20 text-primary'}>
                    <Bot size={20} />
                </AvatarFallback>
            </Avatar>
          )}

          <div className={cn("flex flex-col gap-1.5", isUser ? 'items-end' : 'items-start', hasOnlyCompactCards ? 'w-full' : '')}>
              <div className={cn(contentClasses, "flex flex-col gap-3", hasOnlyCompactCards ? 'bg-transparent dark:bg-transparent p-0 shadow-none' : '')}>
                  {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                  
                  {message.components && (
                      <div className={cn("mt-1 flex w-full flex-col gap-2", hasOnlyCompactCards ? 'gap-1' : 'gap-3')}>
                          {message.components.map((component, index) => {
                              switch (component.type) {
                                  case 'productCard':
                                      return <CompactProductCard key={index} data={component} onAddToOrder={onAddToOrder} onImageClick={handleImageClick} />;
                                  case 'quickReplyButton':
                                      return <QuickReplyButton key={index} data={component} onSendMessage={onSendMessage} />;
                                  case 'orderSummaryCard':
                                      return <OrderSummaryCard />;
                                  case 'orderControlButtons':
                                      return <OrderControlButtons key={index} onSendMessage={onSendMessage} />;
                                  default:
                                      return null;
                              }
                          })}
                      </div>
                  )}
              </div>
              <span className={cn("text-xs text-muted-foreground/80", isUser ? 'text-right' : 'text-left', hasOnlyCompactCards ? 'hidden' : '')}>
                  {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
              </span>
          </div>
        </div>
      </motion.div>
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={[{ src: lightboxImage }]}
        styles={{ container: { backgroundColor: "rgba(0, 0, 0, .8)" } }}
      />
    </>
  );
};

export default MessageBubble;
