import { Association } from '@/lib/types';

export interface WordPressProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number;
  in_stock: boolean;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  meta_data: Array<{
    key: string;
    value: any;
  }>;
}

export interface WordPressOrder {
  id?: number;
  status: string;
  customer_id?: number;
  billing: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  line_items: Array<{
    product_id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: string;
  meta_data?: Array<{
    key: string;
    value: any;
  }>;
}

export class WordPressApiService {
  private baseUrl: string;
  private auth: {
    apiKey: string;
    username: string;
    password: string;
  };

  constructor(association: Association) {
    this.baseUrl = association.wordpressUrl.replace(/\/$/, ''); // Remove trailing slash
    this.auth = association.wordpressAuth as {
      apiKey: string;
      username: string;
      password: string;
    };
  }

  private getHeaders(): HeadersInit {
    const credentials = btoa(`${this.auth.username}:${this.auth.password}`);
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'X-API-Key': this.auth.apiKey,
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wc/v3${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Product methods
  async getProducts(params?: {
    category?: number;
    search?: string;
    per_page?: number;
    page?: number;
    status?: 'publish' | 'draft';
    stock_status?: 'instock' | 'outofstock';
  }): Promise<WordPressProduct[]> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/products?${queryParams.toString()}`;
    return this.makeRequest<WordPressProduct[]>(endpoint);
  }

  async getProduct(productId: number): Promise<WordPressProduct> {
    return this.makeRequest<WordPressProduct>(`/products/${productId}`);
  }

  async searchProducts(searchTerm: string, limit: number = 10): Promise<WordPressProduct[]> {
    return this.getProducts({
      search: searchTerm,
      per_page: limit,
      status: 'publish',
      stock_status: 'instock',
    });
  }

  // Order methods
  async createOrder(orderData: Omit<WordPressOrder, 'id'>): Promise<WordPressOrder> {
    // Add SATIZAP metadata
    const enhancedOrderData = {
      ...orderData,
      meta_data: [
        ...(orderData.meta_data || []),
        {
          key: '_satizap_source',
          value: 'chatbot',
        },
        {
          key: '_satizap_timestamp',
          value: new Date().toISOString(),
        },
      ],
    };

    return this.makeRequest<WordPressOrder>('/orders', 'POST', enhancedOrderData);
  }

  async getOrder(orderId: number): Promise<WordPressOrder> {
    return this.makeRequest<WordPressOrder>(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: number, status: string): Promise<WordPressOrder> {
    return this.makeRequest<WordPressOrder>(`/orders/${orderId}`, 'PUT', { status });
  }

  // Category methods
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    return this.makeRequest('/products/categories');
  }

  // Health check
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('/products?per_page=1');
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Factory function to create WordPress API service for association
export function createWordPressApiService(association: Association): WordPressApiService {
  return new WordPressApiService(association);
}