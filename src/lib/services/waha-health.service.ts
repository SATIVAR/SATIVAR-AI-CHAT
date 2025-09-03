/**
 * WAHA Health Check and Connection Testing Service
 * Provides utilities to monitor WAHA service health and test connectivity
 */

export interface WAHAHealthStatus {
  isHealthy: boolean;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  responseTime?: number;
  version?: string;
  sessions?: WAHASessionInfo[];
  error?: string;
  timestamp: Date;
}

export interface WAHASessionInfo {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  config?: {
    webhooks?: string[];
  };
}

export interface WAHAConnectionConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
}

export class WAHAHealthService {
  private readonly defaultTimeout = 10000; // 10 seconds

  /**
   * Perform comprehensive health check of WAHA service
   */
  async checkHealth(config: WAHAConnectionConfig): Promise<WAHAHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Try ping endpoint first (works without auth in free version)
      const pingResponse = await this.makeRequest(
        `${config.apiUrl}/ping`,
        { ...config, apiKey: undefined }, // Don't send API key for ping
        'GET'
      );

      const responseTime = Date.now() - startTime;

      if (pingResponse.ok) {
        // Try to get version info if possible
        let version = undefined;
        try {
          const versionResponse = await this.makeRequest(
            `${config.apiUrl}/api/version`,
            config,
            'GET'
          );
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            version = versionData.version;
          }
        } catch {
          // Version endpoint might require auth, ignore error
        }
        
        return {
          isHealthy: true,
          status: 'healthy',
          responseTime,
          version,
          timestamp: new Date()
        };
      } else {
        return {
          isHealthy: false,
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${pingResponse.status}: ${pingResponse.statusText}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: false,
        status: 'unreachable',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get all active sessions from WAHA
   */
  async getSessions(config: WAHAConnectionConfig): Promise<WAHASessionInfo[]> {
    try {
      // Try without API key first (free version)
      let response = await this.makeRequest(
        `${config.apiUrl}/api/sessions`,
        { ...config, apiKey: undefined },
        'GET'
      );

      // If unauthorized, try with API key
      if (response.status === 401 && config.apiKey) {
        response = await this.makeRequest(
          `${config.apiUrl}/api/sessions`,
          config,
          'GET'
        );
      }

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get sessions: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting WAHA sessions:', error);
      throw error;
    }
  }

  /**
   * Test connection to WAHA service with detailed diagnostics
   */
  async testConnection(config: WAHAConnectionConfig): Promise<{
    success: boolean;
    health: WAHAHealthStatus;
    sessions?: WAHASessionInfo[];
    diagnostics: {
      urlReachable: boolean;
      authenticationValid: boolean;
      apiResponding: boolean;
    };
  }> {
    const diagnostics = {
      urlReachable: false,
      authenticationValid: false,
      apiResponding: false
    };

    // Test basic health endpoint
    const health = await this.checkHealth(config);
    
    if (health.status === 'healthy') {
      diagnostics.urlReachable = true;
      diagnostics.apiResponding = true;
      
      // Test authentication by trying to get sessions
      try {
        const sessions = await this.getSessions(config);
        diagnostics.authenticationValid = true;
        
        return {
          success: true,
          health,
          sessions,
          diagnostics
        };
      } catch (error) {
        // Authentication might have failed
        return {
          success: false,
          health,
          diagnostics
        };
      }
    } else if (health.status === 'unhealthy') {
      diagnostics.urlReachable = true;
      // API is reachable but not healthy
    }

    return {
      success: false,
      health,
      diagnostics
    };
  }

  /**
   * Create a new WhatsApp session for testing
   */
  async createTestSession(
    config: WAHAConnectionConfig,
    sessionName: string = 'test-session'
  ): Promise<{
    success: boolean;
    sessionName: string;
    qrCode?: string;
    error?: string;
  }> {
    try {
      const response = await this.makeRequest(
        `${config.apiUrl}/api/sessions`,
        config,
        'POST',
        {
          name: sessionName,
          config: {
            webhooks: [
              {
                url: process.env.WAHA_WEBHOOK_URL || 'http://localhost:3001/api/webhooks/whatsapp',
                events: ['message', 'message.ack', 'session.status']
              }
            ]
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          sessionName,
          qrCode: result.qr
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          sessionName,
          error: `HTTP ${response.status}: ${error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        sessionName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a test session
   */
  async deleteSession(
    config: WAHAConnectionConfig,
    sessionName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest(
        `${config.apiUrl}/api/sessions/${sessionName}`,
        config,
        'DELETE'
      );

      return {
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Make HTTP request to WAHA API with proper headers and timeout
   */
  private async makeRequest(
    url: string,
    config: WAHAConnectionConfig,
    method: 'GET' | 'POST' | 'DELETE',
    body?: any
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['X-Api-Key'] = config.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, config.timeout || this.defaultTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
}

// Export singleton instance
export const wahaHealthService = new WAHAHealthService();