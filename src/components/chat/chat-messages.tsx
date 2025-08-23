
'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Message, OrderItem } from '@/lib/types';
import MessageBubble from './message-bubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubbleSkeleton } from './skeletons';

interface ChatMessagesProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
    messages, 
    onSendMessage,
    onAddToOrder,
 }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isLoading = messages[messages.length - 1]?.role !== 'user' && messages.length > 0;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

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
            />
          ))}
        </AnimatePresence>
        {isLoading && !messages.some(m => m.isConfirmation) && <ChatBubbleSkeleton />}
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;
