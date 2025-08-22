
'use client';

import React, { useEffect, useRef } from 'react';
import { Message, OrderItem } from '@/lib/types';
import MessageBubble from './message-bubble';
import TypingIndicator from './typing-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessagesProps {
  messages: Message[];
  order: OrderItem[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  onSubmitOrder: (data: { name: string; phone: string }) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
    messages, 
    order,
    isLoading,
    onSendMessage,
    onAddToOrder,
    onSubmitOrder
 }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1" ref={scrollAreaRef}>
      <div className="p-4 space-y-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            order={order}
            onSendMessage={onSendMessage}
            onAddToOrder={onAddToOrder}
            onSubmitOrder={onSubmitOrder}
          />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;
