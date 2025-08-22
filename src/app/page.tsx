
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, UserDetails } from '@/lib/types';
import { getInitialGreeting, getAiResponse, submitOrder } from './actions';
import { menu } from '@/lib/menu';

const USER_DETAILS_KEY = 'utopizap_user_details';
const CHAT_HISTORY_KEY = 'utopizap_chat_history';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const menuRef = useRef(menu);

  useEffect(() => {
    // Load data from localStorage on initial mount
    const storedUserDetails = localStorage.getItem(USER_DETAILS_KEY);
    if (storedUserDetails) {
      setUserDetails(JSON.parse(storedUserDetails));
    }
    
    const storedChatHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (storedChatHistory) {
      setMessages(JSON.parse(storedChatHistory));
      setIsLoading(false);
    } else {
      const fetchGreeting = async () => {
        try {
          const greeting = await getInitialGreeting();
          const initialMessage: Message = {
            id: 'ai-greeting',
            role: 'ai',
            content: greeting,
            timestamp: new Date(),
          };
          setMessages([initialMessage]);
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([initialMessage]));
        } catch (error) {
          console.error("Failed to get initial greeting:", error);
          setMessages([{
            id: 'error-greeting',
            role: 'ai',
            content: "Olá! Tivemos um pequeno problema para conectar. Por favor, tente recarregar a página.",
            timestamp: new Date(),
          }]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchGreeting();
    }
  }, []);

  const updateChatHistory = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedMessages));
  }

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

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
      const orderHistory = order.map(item => `${item.quantity}x ${item.name}`);
      const res = await getAiResponse(text, orderHistory);
      
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
  }, [messages, order]);

  const handleAddToOrder = useCallback((productId: string) => {
    const product = menuRef.current.items.find(item => item.id === productId);
    if (!product) return;
  
    setOrder(prevOrder => {
      const existingItem = prevOrder.find(item => item.id === productId);
      let newOrder;
      if (existingItem) {
        newOrder = prevOrder.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newOrder = [...prevOrder, { ...product, quantity: 1 }];
      }
      return newOrder;
    });

    const confirmationText = `Adicionado: 1x ${product.name}.`;
    const confirmationMessage: Message = {
      id: `confirm-${Date.now()}`,
      role: 'ai',
      isConfirmation: true,
      content: confirmationText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, confirmationMessage];
    updateChatHistory(updatedMessages);
    // Don't call handleSendMessage here to avoid double-messaging.
    // The confirmation itself is enough feedback.
  }, [messages, handleSendMessage]);

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
      updateChatHistory([...messages, finalMessage]);
      setOrder([]);
      setIsAwaitingOrderDetails(false);

      // Clear chat for next order after a delay
      setTimeout(() => {
        const fetchGreeting = async () => {
            const greeting = await getInitialGreeting();
            const initialMessage: Message = {
                id: 'ai-greeting-new',
                role: 'ai',
                content: `${greeting} O que vamos pedir hoje?`,
                timestamp: new Date(),
            };
            updateChatHistory([initialMessage]);
        };
        fetchGreeting();
      }, 5000);


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

  return (
    <ChatLayout
      messages={messages}
      order={order}
      isLoading={isLoading}
      isAwaitingOrderDetails={isAwaitingOrderDetails}
      onSendMessage={handleSendMessage}
      onAddToOrder={handleAddToOrder}
      onSubmitOrder={handleSubmitOrder}
      userDetails={userDetails}
    />
  );
}
