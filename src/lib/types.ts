
import { Product as PrismaProduct, ProductCategory as PrismaCategory, OrderStatus } from '@prisma/client';

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
