
import { Product as PrismaProduct, ProductCategory as PrismaCategory, Order_status, Patient as PrismaPatient, Conversation as PrismaConversation, Message as PrismaMessage, Conversation_status, Message_senderType, Association as PrismaAssociation, PatientStatus } from '@prisma/client';

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

// Type aliases for easier usage
export type OrderStatus = Order_status;
export type ConversationStatus = Conversation_status;
export type SenderType = Message_senderType;
export type PatientStatusType = PatientStatus;

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
  cpf?: string;
  tipo_associacao?: string;
  nome_responsavel?: string;
  cpf_responsavel?: string;
  status?: PatientStatus;
  wordpress_id?: string;
}

export interface ConversationMessage extends Omit<PrismaMessage, 'metadata'> {
  metadata?: {
    components?: DynamicComponentData[];
    handoffReason?: string;
    prescriptionImageUrl?: string;
    [key: string]: any;
  };
}

export interface ConversationData extends Omit<PrismaConversation, 'Message'> {
  Patient: Patient & {
    Association: Association;
  };
  Message: ConversationMessage[];
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

// WordPress API Configuration Types
// Primary authentication method: Application Password
export interface ApiCredentials {
  // Primary authentication method (Application Password)
  applicationPassword?: {
    username: string;
    password: string; // Application Password generated in WordPress
  };
  // Legacy WooCommerce Consumer Key/Secret (fallback)
  wooCommerce?: {
    consumerKey: string;
    consumerSecret: string;
  };
}

export interface ApiEndpoints {
  // WordPress standard endpoints
  getUsers?: string;      // /wp-json/wp/v2/users
  createUsers?: string;   // /wp-json/wp/v2/users
  // WooCommerce endpoints
  getProdutos?: string;   // /wp-json/wc/v3/products
  getCategorias?: string; // /wp-json/wc/v3/products/categories
  getClientes?: string;   // Custom endpoint or WC customers
  createCliente?: string; // Custom endpoint or WC customers
  createPedido?: string;  // /wp-json/wc/v3/orders
  [key: string]: string | undefined; // Allow additional endpoints
}

export interface ApiConfig {
  credentials: ApiCredentials;
  endpoints: ApiEndpoints;
  authMethod: 'applicationPassword' | 'wooCommerce'; // Preferred authentication method
}

// Extended Association type with new apiConfig field
export interface Association extends Omit<PrismaAssociation, 'wordpressAuth' | 'publicDisplayName' | 'logoUrl' | 'welcomeMessage' | 'apiConfig' | 'chavePix' | 'dadosBancariosFormatados' | 'templateSaudacaoNovoPaciente' | 'templatePedidoConfirmado' | 'templateSolicitacaoReceita' | 'templatePrazoEntrega' | 'diasPrazoProducao' | 'valorFretePadrao' | 'regrasDesconto' | 'wordpressUrlDev'> {
  wordpressAuth: {
    apiKey: string;
    username: string;
    password: string;
    [key: string]: any;
  };
  // WordPress URL (inherited from Prisma)
  wordpressUrl: string;
  // Phase 3: Development WordPress URL for testing
  wordpressUrlDev?: string | null;
  // New structured API configuration
  apiConfig?: ApiConfig;
  // Public display fields for welcome screen personalization
  publicDisplayName?: string | null;
  logoUrl?: string | null;
  welcomeMessage?: string | null;
  // Conversation Settings (Phase 1 - Hybrid AI Engine)
  chavePix?: string | null;
  dadosBancariosFormatados?: string | null;
  templateSaudacaoNovoPaciente?: string | null;
  templatePedidoConfirmado?: string | null;
  templateSolicitacaoReceita?: string | null;
  templatePrazoEntrega?: string | null;
  diasPrazoProducao?: number | null;
  valorFretePadrao?: number | null;
  regrasDesconto?: string | null; // JSON string for discount rules
}

// Conversation Settings interface for type safety
export interface ConversationSettings {
  // Financial Data
  chavePix?: string;
  dadosBancariosFormatados?: string;
  // Standard Templates
  templateSaudacaoNovoPaciente?: string;
  templatePedidoConfirmado?: string;
  templateSolicitacaoReceita?: string;
  templatePrazoEntrega?: string;
  // Operational Parameters
  diasPrazoProducao?: number;
  valorFretePadrao?: number;
  regrasDesconto?: DiscountRules;
}

// Discount rules structure
export interface DiscountRules {
  acimaDeValor?: number;
  percentual?: number;
  // Add more rule types as needed
  [key: string]: any;
}

// Conversation State Management (Phase 4) - Hybrid AI Engine States
export enum HybridConversationState {
  GREETING = 'GREETING',
  AWAITING_PRESCRIPTION = 'AWAITING_PRESCRIPTION',
  COLLECTING_ORDER_ITEMS = 'COLLECTING_ORDER_ITEMS',
  AWAITING_QUOTE_CONFIRMATION = 'AWAITING_QUOTE_CONFIRMATION',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  AWAITING_USER_DETAILS = 'AWAITING_USER_DETAILS'
}

// AI Orchestration Response Types (Phase 3)
export interface AIOrchestrationResponse {
  action: 'call_tool' | 'call_function' | 'send_message' | 'request_info';
  toolName?: string;
  functionName?: string;
  parameters?: Record<string, any>;
  message?: string;
  nextState?: HybridConversationState;
}

// Order Quote Structure (Phase 2)
export interface OrderQuote {
  orderText: string;
  totalValue: number;
  subtotal: number;
  discount: number;
  shipping: number;
  items: OrderQuoteItem[];
}

export interface OrderQuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}


