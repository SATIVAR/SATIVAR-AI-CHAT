export interface SendMessageParams {
  sessionId: string;
  to: string;
  message: string;
  type?: 'text' | 'image' | 'document';
}

export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  sessionId: string;
}

export class WhatsAppService {
  constructor() {
    // Não precisamos do AssociationService por enquanto
  }

  /**
   * Envia mensagem via WAHA API
   */
  async sendMessage(params: SendMessageParams): Promise<boolean> {
    try {
      const config = await this.getWhatsAppConfig(params.sessionId);
      
      if (!config) {
        console.error('Configuração WAHA não encontrada para sessão:', params.sessionId);
        return false;
      }

      const payload = {
        chatId: params.to,
        text: params.message,
        session: params.sessionId
      };

      console.log('Enviando mensagem via WAHA:', payload);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Só adicionar API key se estiver configurada
      if (config.apiKey) {
        headers['X-Api-Key'] = config.apiKey;
      }

      const response = await fetch(`${config.apiUrl}/api/sendText`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao enviar mensagem WAHA:', response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log('Mensagem enviada com sucesso:', result);
      return true;

    } catch (error) {
      console.error('Erro no serviço WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia imagem via WAHA API
   */
  async sendImage(params: SendMessageParams & { imageUrl: string; caption?: string }): Promise<boolean> {
    try {
      const config = await this.getWhatsAppConfig(params.sessionId);
      
      if (!config) {
        console.error('Configuração WAHA não encontrada para sessão:', params.sessionId);
        return false;
      }

      const payload = {
        chatId: params.to,
        file: {
          url: params.imageUrl
        },
        caption: params.caption || '',
        session: params.sessionId
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Só adicionar API key se estiver configurada
      if (config.apiKey) {
        headers['X-Api-Key'] = config.apiKey;
      }

      const response = await fetch(`${config.apiUrl}/api/sendImage`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao enviar imagem WAHA:', response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log('Imagem enviada com sucesso:', result);
      return true;

    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      return false;
    }
  }

  /**
   * Verifica status da sessão WAHA
   */
  async getSessionStatus(sessionId: string): Promise<any> {
    try {
      const config = await this.getWhatsAppConfig(sessionId);
      
      if (!config) {
        return null;
      }

      const headers: Record<string, string> = {};
      
      // Só adicionar API key se estiver configurada
      if (config.apiKey) {
        headers['X-Api-Key'] = config.apiKey;
      }

      const response = await fetch(`${config.apiUrl}/api/sessions/${sessionId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();

    } catch (error) {
      console.error('Erro ao verificar status da sessão:', error);
      return null;
    }
  }

  /**
   * Obtém configuração WAHA para uma sessão
   */
  private async getWhatsAppConfig(sessionId: string): Promise<WhatsAppConfig | null> {
    try {
      // Usar configuração do .env
      const config: WhatsAppConfig = {
        apiUrl: process.env.WAHA_API_URL || `http://localhost:${process.env.WAHA_PORT || 3000}`,
        apiKey: process.env.WAHA_API_KEY || '',
        sessionId: sessionId
      };

      return config;

    } catch (error) {
      console.error('Erro ao obter configuração WAHA:', error);
      return null;
    }
  }

  /**
   * Testa conectividade com WAHA
   */
  async testConnection(): Promise<boolean> {
    try {
      const apiUrl = process.env.WAHA_API_URL || `http://localhost:${process.env.WAHA_PORT || 3000}`;
      const apiKey = process.env.WAHA_API_KEY || '';

      const headers: Record<string, string> = {};
      
      // Só adicionar API key se estiver configurada
      if (apiKey) {
        headers['X-Api-Key'] = apiKey;
      }

      const response = await fetch(`${apiUrl}/api/sessions`, {
        method: 'GET',
        headers
      });

      return response.ok;

    } catch (error) {
      console.error('Erro ao testar conexão WAHA:', error);
      return false;
    }
  }
}