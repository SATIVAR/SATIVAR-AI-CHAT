
'use client';

import React, { useState } from 'react';
import { Message, OrderItem, UserDetails, Client, Order, Patient } from '@/lib/types';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';
import UserDetailsForm from '../dynamic/user-details-form';
import { ThemeToggle } from '../theme-toggle';
import { Button } from '../ui/button';
import { ShoppingCart, PackageCheck } from 'lucide-react';
import CartModal from './cart-modal';
import { UserMenu } from './user-menu';
import { ConversationContextIndicator } from './conversation-context-indicator';

interface ChatLayoutProps {
  messages: Message[];
  order: OrderItem[];
  isLoading: boolean;
  isAwaitingOrderDetails: boolean;
  onSendMessage: (text: string) => void;
  onAddToOrder: (productId: string) => void;
  onSubmitOrder: (data: UserDetails) => void;
  onUpdateOrder: (productId: string, quantity: number) => void;
  onCancelOrder: () => void;
  onUpdateClient: (data: Partial<Client>) => Promise<{success: boolean, error?: string}>;
  userDetails: Client | null;
  activeOrderId: string | null;
  activeOrderStatus: Order['status'] | null;
  onOpenOrderDetails: () => void;
  // FASE 3: Contexto do interlocutor
  patientData?: Patient;
  interlocutorContext?: {
    interlocutorName: string;
    isResponsibleScenario: boolean;
    patientName: string;
  };
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
  onCancelOrder,
  onUpdateClient,
  userDetails,
  activeOrderId,
  activeOrderStatus,
  onOpenOrderDetails,
  // FASE 3: Contexto do interlocutor
  patientData,
  interlocutorContext,
}) => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const totalItems = order.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-secondary dark:bg-muted/40">
        <div className="absolute inset-0 bg-[url('/whatsapp-pattern.png')] bg-repeat opacity-5 dark:opacity-100" />
        <div className="z-10 flex h-full w-full max-w-2xl flex-col rounded-none border-0 bg-transparent shadow-2xl md:h-[95vh] md:rounded-2xl md:border md:bg-card/80 md:backdrop-blur-sm">
            <header className="relative flex items-center gap-4 border-b bg-secondary/50 p-4 dark:bg-card">
                <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <Logo className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-green-500" />
                </div>
                <div className="flex-grow">
                    <h1 className="text-xl font-bold text-card-foreground">SatiZap</h1>
                    <p className={cn("text-sm text-muted-foreground transition-opacity duration-300", isLoading ? "opacity-100" : "opacity-70")}>
                        {isLoading && !activeOrderId ? (
                            <span className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.3s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.15s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500"></span>

                                <span className="ml-1">digitando...</span>
                            </span>
                        ) : activeOrderId ? (
                            <span className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                                <PackageCheck size={16} className="animate-pulse" />
                                Acompanhando seu orçamento...
                            </span>
                        ) : "online"}
                    </p>
                </div>
                 <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" className="relative" onClick={() => setIsCartOpen(true)} disabled={!!activeOrderId}>
                        <ShoppingCart className="h-6 w-6" />
                        {totalItems > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {totalItems}
                            </span>
                        )}
                        <span className="sr-only">Ver orçamento</span>
                    </Button>
                    <UserMenu client={userDetails} onSave={onUpdateClient} />
                </div>
            </header>

            {/* FASE 3: Indicador de contexto da conversa */}
            {interlocutorContext && (
              <div className="px-4 py-2 border-b bg-secondary/30 dark:bg-card/50">
                <ConversationContextIndicator
                  patientName={interlocutorContext.patientName}
                  interlocutorName={interlocutorContext.interlocutorName}
                  isResponsibleScenario={interlocutorContext.isResponsibleScenario}
                  patientStatus={patientData?.status as 'LEAD' | 'MEMBRO'}
                />
              </div>
            )}

            <ChatMessages
                messages={messages}
                onSendMessage={onSendMessage}
                onAddToOrder={onAddToOrder}
                activeOrderStatus={activeOrderStatus}
                onOpenOrderDetails={onOpenOrderDetails}
            />
            
            <footer className="w-full border-t border-border/80 bg-secondary/50 p-4 dark:bg-card">
                 {isAwaitingOrderDetails ? (
                    <UserDetailsForm 
                        onSubmit={onSubmitOrder} 
                        isLoading={isLoading} 
                        defaultValues={userDetails} 
                    />
                ) : (
                    <div className="relative">
                        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading || !!activeOrderId} />
                    </div>
                )}
            </footer>
        </div>
    </div>
    <CartModal 
        isOpen={isCartOpen}
        setIsOpen={setIsCartOpen}
        order={order}
        onUpdateOrder={onUpdateOrder}
        onCancelOrder={() => {
            onCancelOrder();
            setIsCartOpen(false);
        }}
        onFinalizeOrder={() => {
            onSendMessage('quero finalizar meu pedido');
            setIsCartOpen(false);
        }}
    />
    </>
  );
};

export default ChatLayout;
