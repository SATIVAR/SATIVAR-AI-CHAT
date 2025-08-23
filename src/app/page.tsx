
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, UserDetails, Menu, Client, ConversationState } from '@/lib/types';
import { getAiResponse, submitOrder, getKnowledgeBase, findOrCreateClient, updateClient } from './actions';
import WelcomeScreen from '@/components/welcome-screen';


const USER_DETAILS_KEY = 'utopizap_user_details';
const CHAT_HISTORY_KEY = 'utopizap_chat_history';
const ORDER_KEY = 'utopizap_order';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('AguardandoInicio');
  
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
          setConversationState('MostrandoCategorias'); // Assume they want to continue
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
    setConversationState('AguardandoInicio');
    const greeting = `Olá, ${clientName}! 👋 Bem-vindo(a) de volta ao UTÓPICOS! Sou a UtópiZap, sua consultora gastronômica. Vamos montar um pedido delicioso hoje?`;
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
    setIsLoading(false);
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

    // State machine logic
    let nextState: ConversationState = conversationState;
    if (text.toLowerCase().includes('cardápio')) {
        nextState = 'MostrandoCategorias';
    } else if (text.toLowerCase().includes('finalizar')) {
        nextState = 'RevisandoPedido';
    } else if (menuRef.current?.categories.some(c => c.name.toLowerCase() === text.toLowerCase())) {
        nextState = 'MostrandoProdutos';
    }
    setConversationState(nextState);
    
    try {
      const res = await getAiResponse(newMessages, order, client, nextState);
      
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
  }, [messages, order, isLoading, client, conversationState]);

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

    // Change state to trigger upsell/cross-sell
    setConversationState('ItemAdicionado');
    // We don't send a message to the AI here anymore. The UI confirms the addition.
    const confirmationMessage: Message = {
        id: `confirm-${productId}-${Date.now()}`,
        role: 'ai',
        isConfirmation: true,
        content: `${product.name} adicionado ao carrinho!`,
        timestamp: new Date(),
    };
    updateChatHistory([...messages, confirmationMessage]);


  }, [order, client, messages]);

  const handleSubmitOrder = async (data: UserDetails) => {
    setIsLoading(true);

    const fullClientDetails: Client = { ...client!, ...data };
    setClient(fullClientDetails);
    localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(fullClientDetails));
    
    const submittedOrder = [...order]; // Capture the order state

    try {
      const result = await submitOrder(fullClientDetails, submittedOrder);

      if (!result.success) throw new Error("Order submission failed");

      const orderSummaryText = submittedOrder.map(item => `${item.quantity}x ${item.productName}`).join('\n');

      const finalMessage: Message = {
        id: `final-${Date.now()}`,
        role: 'ai',
        content: `Perfeito, ${data.name}! ✅ Seu pedido foi confirmado e já está sendo preparado.`,
        timestamp: new Date(),
        components: [
          {
            type: 'orderSummaryCard',
            summary: orderSummaryText,
            total: submittedOrder.reduce((acc, item) => acc + item.price * item.quantity, 0)
          },
          { type: 'quickReplyButton', label: 'Fazer novo pedido', payload: 'Gostaria de ver o cardápio' }
        ]
      };
      
      updateChatHistory([finalMessage]);
      updateOrder([]); 
      localStorage.removeItem(ORDER_KEY);
      setIsAwaitingOrderDetails(false);
      setConversationState('AguardandoInicio');

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

  const handleUpdateClient = async (data: Partial<Client>) => {
    if (!client?.id) return { success: false, error: "ID do cliente não encontrado." };

    const result = await updateClient(client.id, data);
    
    if (result.success) {
        const updatedClient = { ...client, ...data };
        setClient(updatedClient);
        localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(updatedClient));
    }
    
    return result;
  };

  const handleUpdateOrder = (productId: string, quantity: number) => {
    let updatedOrder;
    if (quantity <= 0) {
      updatedOrder = order.filter(item => item.id !== productId);
    } else {
      updatedOrder = order.map(item => item.id === productId ? { ...item, quantity } : item);
    }
    updateOrder(updatedOrder);
  };

  const handleCancelOrder = () => {
    // Clear the order locally
    updateOrder([]);
    localStorage.removeItem(ORDER_KEY);
    setIsAwaitingOrderDetails(false);

    // Reset conversation
    const cancelMessage: Message = {
      id: `ai-cancel-${Date.now()}`,
      role: 'ai',
      content: "Pedido cancelado. Se mudar de ideia, estou por aqui! 👋",
      timestamp: new Date(),
    };
    updateChatHistory([cancelMessage]);
    
    // Set a timeout to clear and start a new conversation
    setTimeout(() => {
        fetchGreeting(client?.name);
    }, 2000);
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
      onUpdateClient={handleUpdateClient}
      userDetails={client}
    />
  );
}

    