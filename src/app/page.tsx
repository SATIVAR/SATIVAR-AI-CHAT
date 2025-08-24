
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, UserDetails, Menu, Client, ConversationState, Order } from '@/lib/types';
import { getAiResponse, submitOrder, getKnowledgeBase, findOrCreateClient, updateClient } from './actions';
import WelcomeScreen from '@/components/welcome-screen';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import OrderDetailsModal from '@/components/chat/order-details-modal';


const USER_DETAILS_KEY = 'utopizap_user_details';
const CHAT_HISTORY_KEY = 'utopizap_chat_history';
const ORDER_KEY = 'utopizap_order';
const ACTIVE_ORDER_ID_KEY = 'utopizap_active_order_id';
const ACTIVE_ORDER_SNAPSHOT_KEY = 'utopizap_active_order_snapshot';


export default function Home() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('AguardandoInicio');
  
  const [client, setClient] = useState<Client | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderSnapshot, setActiveOrderSnapshot] = useState<Order | null>(null);
  
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

  const menuRef = useRef<Menu | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  const updateChatHistory = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedMessages));
  }
  
  const updateOrder = (updatedOrder: OrderItem[]) => {
      setOrder(updatedOrder);
      localStorage.setItem(ORDER_KEY, JSON.stringify(updatedOrder));
  }

  const fetchGreeting = useCallback(async (clientName?: string) => {
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
  }, []);

  const handleClearAfterOrder = useCallback(() => {
    setActiveOrderId(null);
    setActiveOrderSnapshot(null);
    previousStatusRef.current = null;
    localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
    localStorage.removeItem(ACTIVE_ORDER_SNAPSHOT_KEY);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(ORDER_KEY); // Clear the cart
    setOrder([]); // Clear the cart in state
    
    if (client) {
      fetchGreeting(client.name);
    }
  }, [client, fetchGreeting]);

  const handleCancelOrder = useCallback(() => {
    updateOrder([]);
    setIsAwaitingOrderDetails(false);
    
    if(activeOrderId) {
       handleClearAfterOrder();
    }

    const cancelMessage: Message = {
      id: `ai-cancel-${Date.now()}`,
      role: 'ai',
      content: "Pedido cancelado. Se mudar de ideia, estou por aqui! 👋",
      timestamp: new Date(),
      components: [
        { type: 'quickReplyButton', label: 'Começar de novo', payload: 'Gostaria de ver o cardápio' }
      ]
    };
    updateChatHistory([cancelMessage]);
    setConversationState('AguardandoInicio');
  }, [activeOrderId, handleClearAfterOrder]);


  useEffect(() => {
    getKnowledgeBase().then(menu => menuRef.current = menu);

    try {
      const storedClient = localStorage.getItem(USER_DETAILS_KEY);
      if (storedClient) {
        const parsedClient: Client = JSON.parse(storedClient);
        setClient(parsedClient);
        
        const storedChatHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        const storedOrderId = localStorage.getItem(ACTIVE_ORDER_ID_KEY);
        const storedOrderSnapshot = localStorage.getItem(ACTIVE_ORDER_SNAPSHOT_KEY);
        
        if (storedOrderId) {
            setActiveOrderId(storedOrderId);
            if (storedOrderSnapshot) {
              const parsedSnapshot = JSON.parse(storedOrderSnapshot);
              const serializableOrderData = {
                ...parsedSnapshot,
                createdAt: new Date(parsedSnapshot.createdAt),
                updatedAt: new Date(parsedSnapshot.updatedAt),
              };
              setActiveOrderSnapshot(serializableOrderData);
            }
        } 
        
        if (storedChatHistory) {
          const parsedMessages: Message[] = JSON.parse(storedChatHistory).map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(parsedMessages);
          if (!storedOrderId) {
            setConversationState('MostrandoCategorias');
          }
        } else if (!storedOrderId) {
          fetchGreeting(parsedClient.name);
        }

        const storedOrder = localStorage.getItem(ORDER_KEY);
        if (storedOrder) {
            setOrder(JSON.parse(storedOrder));
        }

      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, [fetchGreeting]);

  useEffect(() => {
    if (!activeOrderId) return;

    const unsub = onSnapshot(doc(db, "orders", activeOrderId), (doc) => {
        const orderData = doc.data() as Order;
        if (!orderData) return;
        
        const serializableOrderData = {
          ...orderData,
          id: doc.id,
          createdAt: (orderData.createdAt as any).toDate(),
          updatedAt: (orderData.updatedAt as any).toDate(),
        };
        setActiveOrderSnapshot(serializableOrderData);
        localStorage.setItem(ACTIVE_ORDER_SNAPSHOT_KEY, JSON.stringify(serializableOrderData));

        const currentStatus = orderData.status;
        const previousStatus = previousStatusRef.current;
        
        if (previousStatus === null) {
            previousStatusRef.current = currentStatus;
            return;
        }

        if (currentStatus === previousStatus) return;
        previousStatusRef.current = currentStatus;
        if(currentStatus === 'Recebido') return;


        let statusMessage = '';
        switch (currentStatus) {
            case 'Em Preparo':
                statusMessage = 'Boas notícias! Seu pedido já está sendo preparado com todo o carinho. 👨‍🍳';
                break;
            case 'Pronto para Entrega':
                statusMessage = 'Seu pedido está pronto para entrega e sairá em breve! 🚀';
                break;
            case 'Finalizado':
                statusMessage = 'Seu pedido foi entregue! Esperamos que goste. Bom apetite! 🎉';
                handleClearAfterOrder();
                break;
             case 'Cancelado':
                statusMessage = 'Seu pedido foi cancelado pelo restaurante. Entraremos em contato se necessário.';
                handleClearAfterOrder();
                break;
        }

        if (statusMessage) {
            const aiMessage: Message = {
                id: `status-${Date.now()}`,
                role: 'ai',
                content: statusMessage,
                timestamp: new Date(),
                 components: currentStatus !== 'Finalizado' && currentStatus !== 'Cancelado' ? [
                  { type: 'quickReplyButton', label: 'Ver Detalhes do Pedido', payload: 'ver_detalhes' }
                 ] : undefined,
            };
            setMessages(prevMessages => [...prevMessages, aiMessage]);
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([...messages, aiMessage]));
             toast({
                title: 'Atualização do Pedido!',
                description: statusMessage,
            });
        }
    });

    return () => unsub();

}, [activeOrderId, messages, toast, handleClearAfterOrder]); 


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


  const handleSendMessage = useCallback(async (text: string, stateOverride?: ConversationState) => {
    if (!text.trim() || isLoading || !client) return;
    
    if (text === 'ver_detalhes') {
      setIsOrderDetailsModalOpen(true);
      return;
    }
    
    if (text.toLowerCase().includes('cancelar')) {
        handleCancelOrder();
        return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    
    const newMessages = [...messages, userMessage];
    updateChatHistory(newMessages);
    setIsLoading(true);

    let nextState: ConversationState = stateOverride || conversationState;
    if (text.toLowerCase().includes('cardápio') || text.toLowerCase().includes('outra categoria') || text.toLowerCase().includes('ver outras categorias')) {
        nextState = 'MostrandoCategorias';
    } else if (text.toLowerCase().includes('finalizar')) {
        nextState = 'RevisandoPedido';
    } else if (menuRef.current?.categories.some(c => c.name.toLowerCase() === text.toLowerCase() || `ver ${c.name.toLowerCase()}` === text.toLowerCase())) {
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
  }, [messages, order, isLoading, client, conversationState, handleCancelOrder]);

  const handleAddToOrder = (productId: string) => {
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

    const confirmationMessage: Message = {
      id: `confirm-${Date.now()}`,
      role: 'ai',
      content: `Adicionado: 1x ${product.name}`,
      timestamp: new Date(),
      isConfirmation: true,
    };

    updateChatHistory([...messages, confirmationMessage]);
    
    setTimeout(() => {
        setMessages(prevMessages => prevMessages.filter(m => m.id !== confirmationMessage.id));
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.filter(m => m.id !== confirmationMessage.id)));
    }, 2000);
  };

  const handleSubmitOrder = async (data: UserDetails) => {
    setIsLoading(true);

    const fullClientDetails: Client = { ...client!, ...data };
    setClient(fullClientDetails);
    localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(fullClientDetails));
    
    const submittedOrder = [...order];

    try {
      const result = await submitOrder(fullClientDetails, submittedOrder);
      if (!result.success || !result.orderId) throw new Error("Order submission failed");

      const summaryText = submittedOrder.map(item => `${item.quantity}x ${item.productName}`).join('\n');
      const totalAmount = submittedOrder.reduce((acc, item) => acc + item.price * item.quantity, 0);

      const finalMessage: Message = {
        id: `final-${Date.now()}`,
        role: 'ai',
        content: `Perfeito, ${data.name}! ✅ Seu pedido foi recebido com sucesso e já está na fila para preparo. Vou te manter atualizado por aqui sobre cada etapa!`,
        timestamp: new Date(),
        components: [
          { 
            type: 'orderSummaryCard',
            summary: summaryText,
            total: totalAmount,
          },
          { type: 'orderControlButtons' }
        ]
      };
      
      setActiveOrderId(result.orderId);
      localStorage.setItem(ACTIVE_ORDER_ID_KEY, result.orderId);
      
      updateChatHistory([finalMessage]);
      updateOrder([]); 
      
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


  if (!client) {
    return <WelcomeScreen onLogin={handleLogin} isLoading={isLoading} />
  }

  return (
    <>
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
      activeOrderId={activeOrderId}
      activeOrderStatus={activeOrderSnapshot?.status || null}
      onOpenOrderDetails={() => setIsOrderDetailsModalOpen(true)}
    />
    <OrderDetailsModal
      isOpen={isOrderDetailsModalOpen}
      setIsOpen={setIsOrderDetailsModalOpen}
      order={activeOrderSnapshot}
    />
    </>
  );
}



    