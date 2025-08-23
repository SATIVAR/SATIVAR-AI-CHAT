
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, UserDetails } from '@/lib/types';
import { getInitialGreeting, getAiResponse, submitOrder } from './actions';
import { menu as staticMenu } from '@/lib/menu';

const USER_DETAILS_KEY = 'utopizap_user_details';
const CHAT_HISTORY_KEY = 'utopizap_chat_history';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const menuRef = useRef(staticMenu);

  // Effect to load data from localStorage on initial mount
  useEffect(() => {
    try {
      const storedUserDetails = localStorage.getItem(USER_DETAILS_KEY);
      if (storedUserDetails) {
        setUserDetails(JSON.parse(storedUserDetails));
      }
      
      const storedChatHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (storedChatHistory) {
        // Parse messages and ensure timestamps are Date objects
        const parsedMessages = JSON.parse(storedChatHistory).map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
        setIsLoading(false);
      } else {
        fetchGreeting();
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      // If localStorage is corrupt, start fresh
      localStorage.removeItem(CHAT_HISTORY_KEY);
      localStorage.removeItem(USER_DETAILS_KEY);
      fetchGreeting();
    }
  }, []);
  
  const fetchGreeting = async () => {
    setIsLoading(true);
    try {
      const greeting = await getInitialGreeting();
      const initialMessage: Message = {
        id: 'ai-greeting',
        role: 'ai',
        content: greeting,
        timestamp: new Date(),
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


  const updateChatHistory = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedMessages));
  }

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    
    const newMessages = [...messages, userMessage];
    updateChatHistory(newMessages);
    setIsLoading(true);

    try {
      const res = await getAiResponse(newMessages, order);
      
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
  }, [messages, order, isLoading]);

  const handleAddToOrder = useCallback((productId: string) => {
    const product = menuRef.current.items.find(item => item.id === productId);
    if (!product) return;
  
    let updatedOrder;
    setOrder(prevOrder => {
      const existingItem = prevOrder.find(item => item.id === productId);
      if (existingItem) {
        updatedOrder = prevOrder.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updatedOrder = [...prevOrder, { ...product, quantity: 1 }];
      }
      return updatedOrder;
    });

    const confirmationText = `Adicionado: 1x ${product.name}.`;
    const confirmationMessage: Message = {
      id: `confirm-${Date.now()}`,
      role: 'ai',
      isConfirmation: true,
      content: confirmationText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, confirmationMessage];
    updateChatHistory(newMessages);
    setIsLoading(true);

    // After adding an item, immediately call the AI for proactive suggestions (upsell/cross-sell)
    // We create a temporary history for the AI call
    const tempHistoryForAI = [...newMessages, { id: 'temp-user-action', role: 'user', content: `Adicionei ${product.name} ao meu pedido.`, timestamp: new Date() }];

    getAiResponse(tempHistoryForAI, updatedOrder!).then(res => {
        const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            role: 'ai',
            content: res.text,
            components: res.components,
            timestamp: new Date(),
        };
        updateChatHistory([...newMessages, aiMessage]);
    }).catch(error => {
        console.error("Failed to get post-addition AI response:", error);
        // Optionally add an error message to the chat
    }).finally(() => {
        setIsLoading(false);
    });

  }, [messages, order]);

  const handleSubmitOrder = async (data: UserDetails) => {
    setIsLoading(true);
    setUserDetails(data);
    localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(data));
    
    try {
      await submitOrder({
        customer: data,
        items: order,
        total: order.reduce((acc, item) => acc + item.price * item.quantity, 0)
      });

      const finalMessage: Message = {
        id: `final-${Date.now()}`,
        role: 'ai',
        content: `Perfeito, ${data.name}! Seu pedido foi confirmado e já está sendo preparado. ✅\n\nQualquer novidade, avisaremos no número ${data.phone}. Obrigado por escolher o UTÓPICOS!`,
        timestamp: new Date()
      };
      
      // We keep the final message, but clear the rest of the history for the next order
      updateChatHistory([finalMessage]);
      setOrder([]);
      setIsAwaitingOrderDetails(false);

      // Reset for next order after a delay
      setTimeout(() => {
        fetchGreeting();
      }, 8000);


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
    if (quantity <= 0) {
      // Remove item
      setOrder(prev => prev.filter(item => item.id !== productId));
    } else {
      // Update quantity
      setOrder(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item));
    }
  };


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
      userDetails={userDetails}
    />
  );
}
