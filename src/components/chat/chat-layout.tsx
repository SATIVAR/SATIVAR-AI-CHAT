
'use client';

import React from 'react';
import { Message, OrderItem, UserDetails } from '@/lib/types';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';
import UserDetailsForm from '../dynamic/user-details-form';
import { ThemeToggle } from '../theme-toggle';

interface ChatLayoutProps {
  messages: Message[];
  order: OrderItem[];
  isLoading: boolean;
  isAwaitingOrderDetails: boolean;
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  onSubmitOrder: (data: { name: string; phone: string }) => void;
  onUpdateOrder: (productId: string, quantity: number) => void;
  userDetails: UserDetails | null;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  messages,
  order,
  isLoading,
  isAwaitingOrderDetails,
  onSendMessage,
  onAddToOrder,
  onSubmitOrder,
  onUpdateOrder,
  userDetails
}) => {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-secondary p-4">
        <div className="flex h-full w-full max-w-2xl flex-col rounded-2xl border bg-card shadow-2xl">
            <header className="relative flex items-center gap-4 border-b p-4">
                <div className="relative flex-shrink-0">
                    <Logo className="h-12 w-12 text-primary" />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-green-500" />
                </div>
                <div className="flex-grow">
                    <h1 className="text-xl font-bold text-card-foreground">UtópiZap</h1>
                    <p className={cn("text-sm text-muted-foreground transition-opacity duration-300", isLoading ? "opacity-100" : "opacity-70")}>
                        {isLoading ? (
                            <span className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.3s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.15s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500"></span>
                                <span className="ml-1">digitando...</span>
                            </span>
                        ) : "online"}
                    </p>
                </div>
                 <div className="absolute right-4 top-4">
                    <ThemeToggle />
                </div>
            </header>

            <ChatMessages
                messages={messages}
                order={order}
                isLoading={isLoading}
                onSendMessage={onSendMessage}
                onAddToOrder={onAddToOrder}
                onUpdateOrder={onUpdateOrder}
            />
            
            <footer className="w-full border-t bg-card p-4">
                 {isAwaitingOrderDetails ? (
                    <UserDetailsForm 
                        onSubmit={onSubmitOrder} 
                        isLoading={isLoading} 
                        defaultValues={userDetails} 
                    />
                ) : (
                    <div className="relative">
                        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
                    </div>
                )}
            </footer>
        </div>
    </div>
  );
};

export default ChatLayout;
