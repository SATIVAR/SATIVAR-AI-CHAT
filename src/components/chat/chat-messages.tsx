
'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Message, Order } from '@/lib/types';
import MessageBubble from './message-bubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubbleSkeleton } from './skeletons';

interface ChatMessagesProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  activeOrderStatus: Order['status'] | null;
  onOpenOrderDetails: () => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
    messages, 
    onSendMessage,
    onAddToOrder,
    activeOrderStatus,
    onOpenOrderDetails
 }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  const lastMessage = messages[messages.length - 1];
  const isAiThinking = (lastMessage?.role === 'user' && !lastMessage.content.startsWith('Adicionado:')) || (messages.length > 0 && lastMessage?.role !== 'ai' && lastMessage?.role !== 'user');

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isAiThinking]);

  return (
    <ScrollArea className="flex-1" viewportRef={viewportRef}>
      <div className="p-4 sm:p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSendMessage={onSendMessage}
              onAddToOrder={onAddToOrder}
              isLast={index === messages.length - 1}
              activeOrderStatus={activeOrderStatus}
              onOpenOrderDetails={onOpenOrderDetails}
            />
          ))}
        </AnimatePresence>
        {isAiThinking && <ChatBubbleSkeleton />}
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;

    