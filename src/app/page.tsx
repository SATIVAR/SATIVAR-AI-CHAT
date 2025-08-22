
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, Product } from '@/lib/types';
import { getInitialGreeting, getAiResponse, submitOrder } from './actions';
import { menu } from '@/lib/menu';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  const menuRef = useRef(menu);

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const greeting = await getInitialGreeting();
        setMessages([{
          id: 'ai-greeting',
          role: 'ai',
          content: greeting,
          timestamp: new Date(),
        }]);
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
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
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

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'ai',
        content: "Desculpe, estou com dificuldades para processar sua solicitação. Poderia tentar novamente?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [order]);

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

    setMessages(prev => [...prev, confirmationMessage]);
    handleSendMessage(`Adicionei 1 ${product.name} ao pedido.`);
  }, [handleSendMessage]);

  const handleSubmitOrder = async (data: { name: string, phone: string }) => {
    setIsLoading(true);
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
      setMessages(prev => [...prev, finalMessage]);
      setOrder([]);
      setIsAwaitingOrderDetails(false);
    } catch (error) {
      console.error('Failed to submit order', error);
      // Inform user about the error
       const errorMessage: Message = {
        id: `error-submit-${Date.now()}`,
        role: 'ai',
        content: "Tivemos um problema ao finalizar seu pedido. Por favor, revise os dados e tente novamente.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    />
  );
}
