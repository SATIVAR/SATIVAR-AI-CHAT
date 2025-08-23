
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string; // Should correspond to a category id
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
  items: Product[];
}

export interface UserDetails {
  name: string;
  phone: string;
}

export interface Order {
  customer: UserDetails;
  items: OrderItem[];
  total: number;
}
