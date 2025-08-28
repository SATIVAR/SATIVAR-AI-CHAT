
import { Product as PrismaProduct, ProductCategory as PrismaCategory, OrderStatus, Patient as PrismaPatient, Conversation as PrismaConversation, Message as PrismaMessage, ConversationStatus, SenderType, Association as PrismaAssociation } from '@prisma/client';

export interface ProductCategory extends PrismaCategory {}

// Estendendo o tipo Product do Prisma para corresponder ao que a UI espera
export interface Product extends Omit<PrismaProduct, 'price'> {
  price: number; // A UI espera um número, o Prisma usa Decimal
  category?: string; // Campo opcional adicionado pela lógica de negócios
}

export interface OrderItem extends Product {
  quantity: number;
  unitPrice: number;
  productName: string;
}

export interface ProductCardData {
  type: 'productCard';
  productId: string;
  imageUrl: string;
  name: string;
  description: string;
  price: number;
}

export interface QuickReplyButtonData {
  type: 'quickReplyButton';
  label: string;
  payload: string;
}

export interface OrderSummaryCardData {
    type: 'orderSummaryCard';
    summary?: string;
    total?: number;
}

export interface OrderControlButtonsData {
    type: 'orderControlButtons';
}

export type DynamicComponentData = ProductCardData | QuickReplyButtonData | OrderSummaryCardData | OrderControlButtonsData;

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  components?: DynamicComponentData[];
  isConfirmation?: boolean;
}

export interface Menu {
  categories: PrismaCategory[];
  items: Product[];
}

export interface AddressDetails {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  reference?: string;
  [key: string]: any; // Index signature for Prisma JsonValue compatibility
}

export interface UserDetails {
  name: string;
  phone: string;
  address?: AddressDetails;
}

// Tipo de Pedido para a lógica da aplicação
export interface Order {
  id?: string;
  clientId: string;
  clientInfo: UserDetails;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  status: OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tipo Cliente para a lógica da aplicação
export interface Client {
    id: string;
    name: string;
    phone: string;
    address?: AddressDetails;
    isActive: boolean;
    createdAt: Date;
    lastOrderAt: Date;
}

export type ConversationState = 
    | 'AguardandoInicio'
    | 'MostrandoCategorias'
    | 'MostrandoProdutos'
    | 'RevisandoPedido';

// SATIZAP - Novos tipos para o sistema de conversa
export interface Patient extends PrismaPatient {}

export interface PatientFormData {
  name: string;
  whatsapp: string;
  email?: string;
}

export interface ConversationMessage extends Omit<PrismaMessage, 'metadata'> {
  metadata?: {
    components?: DynamicComponentData[];
    handoffReason?: string;
    prescriptionImageUrl?: string;
    [key: string]: any;
  };
}

export interface ConversationData extends Omit<PrismaConversation, 'messages'> {
  patient: Patient;
  messages: ConversationMessage[];
  attendant?: {
    id: string;
    name: string;
  };
}

export interface HandoffRequest {
  conversationId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AttendantSession {
  id: string;
  name: string;
  isOnline: boolean;
  activeConversations: string[];
}

// Multi-tenant types
export interface Association extends PrismaAssociation {
  wordpressAuth: {
    apiKey: string;
    username: string;
    password: string;
    [key: string]: any;
  };
}


