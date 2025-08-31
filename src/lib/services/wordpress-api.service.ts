import { Association, ApiConfig } from '@/lib/types';
import { decryptApiConfig } from '@/lib/crypto';

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

export interface WordPressUser {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  url?: string;
  description?: string;
  link?: string;
  nickname?: string;
  slug?: string;
  roles?: string[];
  meta?: Record<string, any>;
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
  private apiConfig: ApiConfig | null = null;
  private legacyAuth: {
    apiKey: string;
    username: string;
    password: string;
  } | null = null;
  private isWindows: boolean;

  constructor(association: Association) {
    this.baseUrl = association.wordpressUrl.replace(/\/$/, ''); // Remove trailing slash
    this.isWindows = typeof window !== 'undefined' ? false : process.platform === 'win32';
    
    // Fallback to legacy authentication first
    if (association.wordpressAuth) {
      this.legacyAuth = association.wordpressAuth as {
        apiKey: string;
        username: string;
        password: string;
      };
    }
    
    // For apiConfig, we'll handle it in a separate method since it's async
    if (association.apiConfig) {
      if (typeof association.apiConfig === 'string') {
        // Encrypted apiConfig will be handled in async initialization
        console.log('Encrypted apiConfig detected, will decrypt on first use');
      } else {
        this.apiConfig = association.apiConfig;
      }
    }
  }

  /**
   * Initialize encrypted API configuration
   */
  private async initializeApiConfig(encryptedApiConfig: string): Promise<void> {
    if (!this.apiConfig) {
      try {
        this.apiConfig = await decryptApiConfig(encryptedApiConfig);
        console.log('API config decrypted successfully');
      } catch (error) {
        console.warn('Failed to decrypt apiConfig, using legacy auth:', error);
      }
    }
  }

  private async getHeaders(encryptedApiConfig?: string): Promise<HeadersInit> {
    // Initialize encrypted config if needed
    if (encryptedApiConfig && !this.apiConfig) {
      await this.initializeApiConfig(encryptedApiConfig);
    }
    
    let credentials: string;
    
    // Priority 1: Use new apiConfig if available
    if (this.apiConfig) {
      const authMethod = this.apiConfig.authMethod || 'applicationPassword';
      
      if (authMethod === 'applicationPassword' && this.apiConfig.credentials.applicationPassword) {
        credentials = Buffer.from(
          `${this.apiConfig.credentials.applicationPassword.username}:${this.apiConfig.credentials.applicationPassword.password}`
        ).toString('base64');
      } else if (authMethod === 'wooCommerce' && this.apiConfig.credentials.wooCommerce) {
        credentials = Buffer.from(
          `${this.apiConfig.credentials.wooCommerce.consumerKey}:${this.apiConfig.credentials.wooCommerce.consumerSecret}`
        ).toString('base64');
      } else {
        throw new Error('Invalid authentication configuration');
      }
    } 
    // Fallback: Use legacy authentication
    else if (this.legacyAuth) {
      credentials = Buffer.from(`${this.legacyAuth.username}:${this.legacyAuth.password}`).toString('base64');
    } else {
      throw new Error('No authentication configuration available');
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'SATIZAP-WordPress-Client/1.0',
    };
    
    // Windows-specific headers
    if (this.isWindows) {
      (headers as Record<string, string>)['Connection'] = 'close';
      (headers as Record<string, string>)['Cache-Control'] = 'no-cache';
    }
    
    // Add legacy API key if using legacy auth
    if (this.legacyAuth?.apiKey) {
      (headers as Record<string, string>)['X-API-Key'] = this.legacyAuth.apiKey;
    }
    
    return headers;
  }

  /**
   * Create Windows-compatible request configuration
   */
  private async createRequestConfig(method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any, encryptedApiConfig?: string): Promise<RequestInit> {
    const config: RequestInit = {
      method,
      headers: await this.getHeaders(encryptedApiConfig),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.isWindows ? 15000 : 10000), // Longer timeout on Windows
    };

    // Windows-specific optimizations
    if (this.isWindows) {
      // Additional Windows-specific configuration could go here
      // For now, we rely on the headers and timeout adjustments
    }

    return config;
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wc/v3${endpoint}`;
    const config = await this.createRequestConfig(method, body);
    
    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API Error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      // Enhanced error logging for Windows debugging
      if (this.isWindows) {
        console.error('WordPress API Request Failed (Windows):', {
          url,
          method,
          error: error.message,
          code: error.code,
          platform: 'win32'
        });
      }
      throw error;
    }
  }

  private async makeWpRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wp/v2${endpoint}`;
    const config = await this.createRequestConfig(method, body);
    
    console.log(`[WordPress Service] Making WP Core API request to: ${url}`);
    
    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[WordPress Service] WP Core API Error: ${response.status} - ${errorText}`);
        throw new Error(`WordPress Core API Error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      // Enhanced error logging for Windows debugging
      if (this.isWindows) {
        console.error('WordPress Core API Request Failed (Windows):', {
          url,
          method,
          error: error.message,
          code: error.code,
          platform: 'win32'
        });
      }
      throw error;
    }
  }

  /**
   * Test WordPress API connection with Windows compatibility
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const url = `${this.baseUrl}/wp-json/`;
      const config = await this.createRequestConfig('GET');
      
      console.log(`Testing WordPress connection to: ${url} (Platform: ${this.isWindows ? 'Windows' : 'Other'})`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            platform: this.isWindows ? 'win32' : 'unix'
          }
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        details: {
          wpVersion: data.name,
          namespaces: data.namespaces,
          platform: this.isWindows ? 'win32' : 'unix',
          authMethod: this.apiConfig?.authMethod || 'legacy'
        }
      };
    } catch (error: any) {
      console.error('WordPress connection test failed:', {
        error: error.message,
        code: error.code,
        platform: this.isWindows ? 'win32' : 'unix'
      });
      
      return {
        success: false,
        error: error.message || 'Unknown connection error',
        details: {
          errorCode: error.code,
          platform: this.isWindows ? 'win32' : 'unix'
        }
      };
    }
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

  // User/Patient methods
  async getUsers(params?: {
    search?: string;
    per_page?: number;
    page?: number;
    roles?: string[];
  }): Promise<WordPressUser[]> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'roles' && Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const endpoint = `/users?${queryParams.toString()}`;
    console.log(`[WordPress Service] Getting users from: ${this.baseUrl}/wp-json/wp/v2${endpoint}`);
    return this.makeWpRequest<WordPressUser[]>(endpoint);
  }

  async createUser(userData: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    password: string;
    roles?: string[];
    meta?: Record<string, any>;
  }): Promise<WordPressUser> {
    return this.makeWpRequest<WordPressUser>('/users', 'POST', userData);
  }

  async getUserByEmail(email: string): Promise<WordPressUser | null> {
    const users = await this.getUsers({ search: email, per_page: 1 });
    return users.find(user => user.email === email) || null;
  }

  /**
   * Find user by phone number (WhatsApp) using custom endpoint
   * CORREÇÃO FASE 1: Usar apenas o endpoint customizado correto
   */
  async findUserByPhone(whatsapp: string): Promise<WordPressUser & { acf?: any } | null> {
    try {
      const { sanitizePhone } = await import('@/lib/utils/phone');
      const cleanWhatsapp = sanitizePhone(whatsapp);
      
      console.log(`[FASE 1 - LOG 1] Searching for phone: ${whatsapp} (cleaned: ${cleanWhatsapp})`);
      
      // CORREÇÃO FASE 1: Usar APENAS o endpoint customizado correto
      const customEndpointUrl = `${this.baseUrl}/wp-json/sativar/v1/clientes?acf_filters[telefone]=${cleanWhatsapp}`;
      const config = await this.createRequestConfig('GET');
      
      console.log(`[FASE 1 - LOG 3] URL construída para WordPress: ${customEndpointUrl}`);
      
      const response = await fetch(customEndpointUrl, config);
      
      console.log(`[FASE 1 - LOG 4A] WordPress Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[FASE 1 - LOG 4A] WordPress Error Response:`, errorText);
        return null;
      }
      
      const clientsData = await response.json();
      console.log(`[FASE 1 - LOG 4A] WordPress Response Body:`, clientsData);
      
      // O endpoint customizado retorna um objeto com dados ou array vazio
      if (!clientsData || (Array.isArray(clientsData) && clientsData.length === 0)) {
        console.log(`[FASE 1 - LOG 4D] No clients found in WordPress`);
        return null;
      }
      
      // Se encontrou dados, normalizar e retornar
      let clientData;
      if (Array.isArray(clientsData) && clientsData.length > 0) {
        clientData = clientsData[0]; // Pegar o primeiro resultado
      } else if (clientsData && typeof clientsData === 'object' && !Array.isArray(clientsData)) {
        clientData = clientsData; // Dados diretos do cliente
      } else {
        console.log(`[FASE 1 - LOG 4D] Invalid response format from WordPress`);
        return null;
      }
      
      console.log(`[FASE 1 - LOG 4C] MATCH FOUND! Client ID: ${clientData.id}`);
      
      const normalizedUser = this.normalizeWordPressUser(clientData);
      console.log(`[FASE 1 - LOG 4C] Returning user: ${normalizedUser.name}`);
      
      return normalizedUser;
      
    } catch (error) {
      console.error('[FASE 1 - LOG 4D] Error in smart phone search:', error);
      return null;
    }
  }
  

  
  /**
   * Normaliza dados do cliente WordPress para formato padrão
   */
  private normalizeWordPressUser(userData: any): WordPressUser & { acf?: any } {
    // Extrair nome de múltiplas fontes possíveis
    let name = userData.name || userData.display_name;
    
    if (!name && userData.acf) {
      name = userData.acf.nome_completo || userData.acf.nome || userData.acf.name;
    }
    
    if (!name && userData.title?.rendered) {
      name = userData.title.rendered;
    }
    
    // Se ainda não tem nome, usar ID como fallback
    if (!name) {
      name = `Cliente ${userData.id || userData.ID || 'Desconhecido'}`;
    }
    
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return {
      id: userData.id || userData.ID,
      username: userData.username || userData.user_login || `cliente_${userData.id}`,
      name: name,
      first_name: userData.first_name || firstName,
      last_name: userData.last_name || lastName,
      email: userData.email || userData.user_email || `cliente${userData.id}@temp.local`,
      acf: userData.acf || {}
    } as WordPressUser & { acf?: any };
  }

  async findOrCreatePatient(patientData: {
    name: string;
    whatsapp: string;
    email?: string;
  }): Promise<{ user: WordPressUser; created: boolean }> {
    // Try to find existing user by email or WhatsApp
    let existingUser: WordPressUser | null = null;
    
    // First try to find by WhatsApp (primary identifier)
    existingUser = await this.findUserByPhone(patientData.whatsapp);
    
    // If not found by WhatsApp and email is provided, try email
    if (!existingUser && patientData.email) {
      existingUser = await this.getUserByEmail(patientData.email);
    }
    
    // If not found by email, try searching by WhatsApp in user meta or description
    if (!existingUser) {
      const users = await this.getUsers({ search: patientData.whatsapp, per_page: 5 });
      existingUser = users.find(user => 
        user.description?.includes(patientData.whatsapp) ||
        user.meta?.whatsapp === patientData.whatsapp
      ) || null;
    }
    
    if (existingUser) {
      return { user: existingUser, created: false };
    }
    
    // Create new user
    const [firstName, ...lastNameParts] = patientData.name.split(' ');
    const lastName = lastNameParts.join(' ');
    
    const newUser = await this.createUser({
      username: patientData.whatsapp.replace(/[^a-zA-Z0-9]/g, ''), // Clean username
      email: patientData.email || `${patientData.whatsapp}@temp.local`,
      first_name: firstName,
      last_name: lastName,
      name: patientData.name,
      password: Math.random().toString(36).substring(2, 15), // Random password
      roles: ['customer'],
      meta: {
        whatsapp: patientData.whatsapp,
        source: 'satizap'
      }
    });
    
    return { user: newUser, created: true };
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
}

// Factory function to create WordPress API service for association
export function createWordPressApiService(association: Association): WordPressApiService {
  return new WordPressApiService(association);
}