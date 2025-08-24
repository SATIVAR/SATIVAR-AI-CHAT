
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '@/components/chat/chat-layout';
import { Message, OrderItem, UserDetails, Menu, Client, ConversationState, Order } from '@/lib/types';
import { getAiResponse, submitOrder, getKnowledgeBase, findOrCreateClient, updateClient } from './actions';
import WelcomeScreen from '@/components/welcome-screen';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';


const USER_DETAILS_KEY = 'utopizap_user_details';
const CHAT_HISTORY_KEY = 'utopizap_chat_history';
const ORDER_KEY = 'utopizap_order';
const ACTIVE_ORDER_ID_KEY = 'utopizap_active_order_id';


export default function Home() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAwaitingOrderDetails, setIsAwaitingOrderDetails] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('AguardandoInicio');
  
  const [client, setClient] = useState<Client | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<Order['status'] | null>(null);
  
  const menuRef = useRef<Menu | null>(null);
  const previousStatusRef = useRef<string | null>(null);


  useEffect(() => {
    getKnowledgeBase().then(menu => menuRef.current = menu);

    try {
      const storedClient = localStorage.getItem(USER_DETAILS_KEY);
      if (storedClient) {
        const parsedClient: Client = JSON.parse(storedClient);
        setClient(parsedClient);
        
        const storedChatHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        const storedOrderId = localStorage.getItem(ACTIVE_ORDER_ID_KEY);
        
        if (storedOrderId) {
            setActiveOrderId(storedOrderId);
        } else if (storedChatHistory) {
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
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId) return;

    const unsub = onSnapshot(doc(db, "orders", activeOrderId), (doc) => {
        const orderData = doc.data() as Order;
        if (!orderData) return;

        const currentStatus = orderData.status;
        setActiveOrderStatus(currentStatus); // Store current status
        const previousStatus = previousStatusRef.current;

        // Evita notificações duplicadas no primeiro carregamento
        if (currentStatus === previousStatus) return;

        previousStatusRef.current = currentStatus;
        // Evita notificar sobre o status "Recebido" que já é o inicial
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
            };
            updateChatHistory([...messages, aiMessage]);
             toast({
                title: 'Atualização do Pedido!',
                description: statusMessage,
            });
        }
    });

    return () => unsub();

}, [activeOrderId, messages]); // Adicionado messages aqui para garantir que o histórico seja atual


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
    // Only store history if there's no active order being tracked
    if (!activeOrderId) {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedMessages));
    }
  }

  const handleSendMessage = useCallback(async (text: string, stateOverride?: ConversationState) => {
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
    let nextState: ConversationState = stateOverride || conversationState;
    if (text.toLowerCase().includes('cardápio') || text.toLowerCase().includes('outra categoria')) {
        nextState = 'MostrandoCategorias';
    } else if (text.toLowerCase().includes('finalizar')) {
        nextState = 'RevisandoPedido';
    } else if (menuRef.current?.categories.some(c => c.name.toLowerCase() === text.toLowerCase() || `ver ${c.name.toLowerCase()}` === text.toLowerCase())) {
        nextState = 'MostrandoProdutos';
    } else if (text.toLowerCase().includes('cancelar')) {
        handleCancelOrder();
        setIsLoading(false);
        return;
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
  }, [messages, order, isLoading, client, conversationState, activeOrderId]);

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

    // Show a temporary confirmation message
    const confirmationMessage: Message = {
      id: `confirm-${Date.now()}`,
      role: 'ai',
      content: `Adicionado: 1x ${product.name}`,
      timestamp: new Date(),
      isConfirmation: true, // This is a new flag
    };

    updateChatHistory([...messages, confirmationMessage]);
    
    // Auto-remove the confirmation after a few seconds
    setTimeout(() => {
        setMessages(prevMessages => prevMessages.filter(m => m.id !== confirmationMessage.id));
        if (!activeOrderId) {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.filter(m => m.id !== confirmationMessage.id)));
        }
    }, 2000);


  };

  const handleSubmitOrder = async (data: UserDetails) => {
    setIsLoading(true);

    const fullClientDetails: Client = { ...client!, ...data };
    setClient(fullClientDetails);
    localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(fullClientDetails));
    
    const submittedOrder = [...order]; // Capture the order state

    try {
      const result = await submitOrder(fullClientDetails, submittedOrder);
      if (!result.success || !result.orderId) throw new Error("Order submission failed");

      // Generate the summary details
      const summaryText = submittedOrder.map(item => `${item.quantity}x ${item.productName}`).join('\n');
      const totalAmount = submittedOrder.reduce((acc, item) => acc + item.price * item.quantity, 0);

      // Create a final confirmation message with a detailed summary card
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
          { type: 'orderControlButtons' } // Will now conditionally show cancel button
        ]
      };
      
      // Correctly set the state for order tracking
      setActiveOrderId(result.orderId);
      setActiveOrderStatus('Recebido'); // Set initial status
      localStorage.setItem(ACTIVE_ORDER_ID_KEY, result.orderId);
      
      // Clear previous history and set the new one with only the final message
      localStorage.removeItem(CHAT_HISTORY_KEY);
      updateChatHistory([finalMessage]);
      
      // Clean up the current order from state and storage
      updateOrder([]); 
      localStorage.removeItem(ORDER_KEY);
      
      setIsAwaitingOrderDetails(false);
      setConversationState('AguardandoInicio'); // Ready for a new order

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

  const handleClearAfterOrder = () => {
    setActiveOrderId(null);
    setActiveOrderStatus(null);
    previousStatusRef.current = null;
    localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
  };


  const handleCancelOrder = () => {
    updateOrder([]);
    localStorage.removeItem(ORDER_KEY);
    setIsAwaitingOrderDetails(false);
    if(activeOrderId) {
        // Here you might want to call a server action to update order status to 'Canceled' in Firestore
        // For now, we just clear the local state
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
      activeOrderId={activeOrderId}
      activeOrderStatus={activeOrderStatus}
    />
  );
}
