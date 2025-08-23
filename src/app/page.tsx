
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, UserDetails, Menu, Client } from '@/lib/types';
import { getInitialGreeting, getAiResponse, submitOrder, getKnowledgeBase, findOrCreateClient } from './actions';
import WelcomeScreen from '@/components/welcome-screen';


const USER_DETAILS_KEY = 'utopizap_user_details';
const CHAT_HISTORY_KEY = 'utopizap_chat_history';
const ORDER_KEY = 'utopizap_order';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  
  const [client, setClient] = useState<Client | null>(null);
  
  const menuRef = useRef<Menu | null>(null);

  useEffect(() => {
    getKnowledgeBase().then(menu => menuRef.current = menu);

    try {
      const storedClient = localStorage.getItem(USER_DETAILS_KEY);
      if (storedClient) {
        const parsedClient: Client = JSON.parse(storedClient);
        setClient(parsedClient);
        
        const storedChatHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (storedChatHistory) {
          const parsedMessages: Message[] = JSON.parse(storedChatHistory).map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(parsedMessages);
        } else {
          fetchGreeting(parsedClient.name);
        }

        const storedOrder = localStorage.getItem(ORDER_KEY);
        if (storedOrder) {
            setOrder(JSON.parse(storedOrder));
        }

      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      localStorage.removeItem(CHAT_HISTORY_KEY);
      localStorage.removeItem(USER_DETAILS_KEY);
      localStorage.removeItem(ORDER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (data: UserDetails) => {
    setIsLoading(true);
    try {
      const clientData = await findOrCreateClient(data);
      setClient(clientData);
      localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(clientData));
      await fetchGreeting(clientData.name);
    } catch (error) {
      console.error("Failed to login/register client:", error);
       const errorMessage: Message = {
        id: 'error-login',
        role: 'ai',
        content: "Tivemos um problema para verificar seus dados. Por favor, tente novamente.",
        timestamp: new Date(),
      };
      setMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchGreeting = async (clientName?: string) => {
    setIsLoading(true);
    try {
      const greeting = await getInitialGreeting(clientName);
      const initialMessage: Message = {
        id: 'ai-greeting',
        role: 'ai',
        content: greeting,
        timestamp: new Date(),
        components: [
          { type: 'quickReplyButton', label: 'Sim, ver cardápio', payload: 'Gostaria de ver o cardápio' }
        ]
      };
      updateChatHistory([initialMessage]);
    } catch (error) {
      console.error("Failed to get initial greeting:", error);
      const errorMessage: Message = {
        id: 'error-greeting',
        role: 'ai',
        content: "Olá! Tivemos um pequeno problema para conectar. Por favor, tente recarregar a página.",
        timestamp: new Date(),
      };
      updateChatHistory([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrder = (updatedOrder: OrderItem[]) => {
      setOrder(updatedOrder);
      localStorage.setItem(ORDER_KEY, JSON.stringify(updatedOrder));
  }


  const updateChatHistory = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedMessages));
  }

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !client) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    
    const newMessages = [...messages, userMessage];
    updateChatHistory(newMessages);
    setIsLoading(true);

    // Handle cancel action from input
    if (text.toLowerCase().includes('cancelar meu pedido')) {
        handleCancelOrder(newMessages); // Pass history to keep the user message
        setIsLoading(false);
        return;
    }
    
    try {
      const res = await getAiResponse(newMessages, order, client);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: res.text,
        components: res.components,
        timestamp: new Date(),
      };

      if (res.components?.some(c => c.type === 'orderSummaryCard')) {
         setIsAwaitingOrderDetails(true);
      }
      
      updateChatHistory([...newMessages, aiMessage]);

    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'ai',
        content: "Desculpe, estou com dificuldades para processar sua solicitação. Poderia tentar novamente?",
        timestamp: new Date(),
      };
      updateChatHistory([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, order, isLoading, client]);

  const handleAddToOrder = useCallback((productId: string) => {
    if (!menuRef.current || !client) return;
    const product = menuRef.current.items.find(item => item.id === productId);
    if (!product) return;
  
    let updatedOrder: OrderItem[];
    const existingItem = order.find(item => item.id === productId);
    if (existingItem) {
      updatedOrder = order.map(item =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedOrder = [...order, { ...product, quantity: 1, unitPrice: product.price, productName: product.name }];
    }
    updateOrder(updatedOrder);

  }, [order, client]);

  const handleSubmitOrder = async (data: UserDetails) => {
    setIsLoading(true);

    const fullClientDetails: Client = { ...client!, ...data };
    setClient(fullClientDetails);
    localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(fullClientDetails));
    
    const submittedOrder = [...order]; // Capture the order state

    try {
      const result = await submitOrder(fullClientDetails, submittedOrder);

      if (!result.success) throw new Error("Order submission failed");

      // Create a simple summary of the order
      const orderSummaryText = submittedOrder.map(item => `${item.quantity}x ${item.productName}`).join(', ');

      const finalMessage: Message = {
        id: `final-${Date.now()}`,
        role: 'ai',
        content: `Perfeito, ${data.name}! ✅ Seu pedido foi confirmado e já está sendo preparado.\n\n*Resumo:* ${orderSummaryText}\n\nQualquer novidade, avisaremos no número ${data.phone}. Obrigado por escolher o UTÓPICOS!`,
        timestamp: new Date(),
        components: [
          { type: 'quickReplyButton', label: 'Fazer novo pedido', payload: 'Gostaria de ver o cardápio' }
        ]
      };
      
      // Reset the chat with only the final confirmation message
      updateChatHistory([finalMessage]);
      updateOrder([]); // Clear order state
      localStorage.removeItem(ORDER_KEY);
      setIsAwaitingOrderDetails(false);

    } catch (error) {
      console.error('Failed to submit order', error);
      const errorMessage: Message = {
        id: `error-submit-${Date.now()}`,
        role: 'ai',
        content: "Tivemos um problema ao finalizar seu pedido. Por favor, revise os dados e tente novamente.",
        timestamp: new Date()
      };
      updateChatHistory([...messages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdateOrder = (productId: string, quantity: number) => {
    let updatedOrder;
    if (quantity <= 0) {
      updatedOrder = order.filter(item => item.id !== productId);
    } else {
      updatedOrder = order.map(item => item.id === productId ? { ...item, quantity } : item);
    }
    updateOrder(updatedOrder);
  };

  const handleCancelOrder = (currentMessages: Message[] = messages) => {
    updateOrder([]);
    localStorage.removeItem(ORDER_KEY);
    setIsAwaitingOrderDetails(false);
    
    const cancelConfirmationMessage: Message = {
        id: `ai-cancel-${Date.now()}`,
        role: 'ai',
        content: 'Seu pedido foi cancelado. Se mudar de ideia, é só chamar! 👋',
        timestamp: new Date(),
        components: [
          { type: 'quickReplyButton', label: 'Começar de novo', payload: 'Gostaria de ver o cardápio' }
        ]
    };
    
    // Reset chat with the cancellation message
    updateChatHistory([...currentMessages, cancelConfirmationMessage]);
  };

  if (!client) {
    return <WelcomeScreen onLogin={handleLogin} isLoading={isLoading} />
  }

  return (
    <ChatLayout
      messages={messages}
      order={order}
      isLoading={isLoading}
      isAwaitingOrderDetails={isAwaitingOrderDetails}
      onSendMessage={handleSendMessage}
      onAddToOrder={handleAddToOrder}
      onSubmitOrder={handleSubmitOrder}
      onUpdateOrder={handleUpdateOrder}
      onCancelOrder={handleCancelOrder}
      userDetails={client}
    />
  );
}

