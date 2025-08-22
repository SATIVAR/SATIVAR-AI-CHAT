
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface ProductCardData {
  type: 'productCard';
  productId: string;
  imageUrl: string;
  name: string;
  description: string;
  price: number;
  action: string;
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
  categories: {
    id: string;
    name: string;
    description: string;
  }[];
  items: Product[];
}

export interface Order {
  customer: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
  total: number;
}
