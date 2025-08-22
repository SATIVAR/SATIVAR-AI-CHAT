
'use client';

import React from 'react';
import { Message, OrderItem } from '@/lib/types';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';
import UserDetailsForm from '../dynamic/user-details-form';

interface ChatLayoutProps {
  messages: Message[];
  order: OrderItem[];
  isLoading: boolean;
  isAwaitingOrderDetails: boolean;
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  onSubmitOrder: (data: { name: string; phone: string }) => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  messages,
  order,
  isLoading,
  isAwaitingOrderDetails,
  onSendMessage,
  onAddToOrder,
  onSubmitOrder
}) => {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <div className="flex h-full w-full max-w-2xl flex-col rounded-xl border bg-card shadow-2xl">
        <header className="flex items-center gap-3 border-b p-4">
          <div className="relative">
            <Logo className="h-10 w-10" />
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
          </div>
          <div>
            <h1 className="font-headline text-lg font-bold text-card-foreground">UtópiZap</h1>
            <p className={cn("text-sm transition-opacity duration-300", isLoading ? "text-green-600 opacity-100" : "opacity-50")}>
              {isLoading ? "digitando..." : "online"}
            </p>
          </div>
        </header>

        <ChatMessages
          messages={messages}
          order={order}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          onAddToOrder={onAddToOrder}
          onSubmitOrder={onSubmitOrder}
        />
        
        <footer className="border-t p-2 md:p-4">
          {isAwaitingOrderDetails ? (
            <UserDetailsForm onSubmit={onSubmitOrder} isLoading={isLoading} />
          ) : (
            <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
          )}
        </footer>
      </div>
    </main>
  );
};

export default ChatLayout;
