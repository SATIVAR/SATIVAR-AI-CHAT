
import type { Timestamp } from 'firebase/firestore';

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
  imageUrl?: string;
  nextStepSuggestion?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface Product {
  id: string;
  name:string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  category?: string;
}

export interface OrderItem extends Product {
  quantity: number;
  unitPrice: number; // Snapshot of the price at the time of order
  productName: string; // Snapshot of the name at the time of order
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
}

export type DynamicComponentData = ProductCardData | QuickReplyButtonData | OrderSummaryCardData;

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  components?: DynamicComponentData[];
  isConfirmation?: boolean;
}

export interface Menu {
  categories: ProductCategory[];
  items: (Product & { category: string })[];
}

export interface UserDetails {
  name: string;
  phone: string;
  address?: {
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      reference?: string;
  };
}

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
  status: 'Recebido' | 'Em Preparo' | 'Pronto para Entrega' | 'Finalizado' | 'Cancelado';
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface Client {
    id?: string;
    name: string;
    phone: string;
    address?: {
        street?: string;
        number?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        reference?: string;
    };
    isActive?: boolean;
    createdAt: Date | Timestamp;
    lastOrderAt: Date | Timestamp;
}
