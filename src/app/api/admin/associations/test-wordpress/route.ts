import { NextRequest, NextResponse } from 'next/server';
import { ApiConfig } from '@/lib/types';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as dns from 'dns';
import * as https from 'https';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/**
 * Enhanced password sanitization with special character handling
 */
function sanitizePassword(password: string): string {
  // Remove all whitespace characters (spaces, tabs, newlines, etc.)
  let sanitized = password.replace(/\s/g, '');
  
  // Handle common copy-paste issues with special characters
  sanitized = sanitized
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, '') // Remove non-breaking spaces and unicode spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .trim();
  
  return sanitized;
}

/**
 * Enhanced API configuration sanitization with multiple credential formats
 */
function sanitizeApiConfig(apiConfig: ApiConfig): ApiConfig {
  const sanitized = { ...apiConfig };
  
  // Sanitize application password credentials
  if (sanitized.credentials.applicationPassword?.password) {
    const originalPassword = sanitized.credentials.applicationPassword.password;
    sanitized.credentials.applicationPassword.password = sanitizePassword(originalPassword);
    
    // Log sanitization without exposing sensitive data
    if (originalPassword !== sanitized.credentials.applicationPassword.password) {
      console.log(`[Auth] Password sanitized: removed ${originalPassword.length - sanitized.credentials.applicationPassword.password.length} characters`);
    }
  }
  
  // Sanitize username (remove whitespace)
  if (sanitized.credentials.applicationPassword?.username) {
    sanitized.credentials.applicationPassword.username = 
      sanitized.credentials.applicationPassword.username.trim();
  }
  
  // Sanitize WooCommerce credentials
  if (sanitized.credentials.wooCommerce?.consumerKey) {
    sanitized.credentials.wooCommerce.consumerKey = 
      sanitized.credentials.wooCommerce.consumerKey.trim();
  }
  
  if (sanitized.credentials.wooCommerce?.consumerSecret) {
    sanitized.credentials.wooCommerce.consumerSecret = 
      sanitized.credentials.wooCommerce.consumerSecret.trim();
  }
  
  return sanitized;
}

/**
 * Validate WordPress API endpoint availability
 */
async function validateWordPressEndpoint(baseUrl: string): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const response = await fetch(`${baseUrl}/wp-json/`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SATIZAP-WordPress-Validator/1.0'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        version: data.name || 'Unknown'
      };
    } else {
      return {
        available: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error: any) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Create enhanced authentication header with multiple encoding attempts
 */
function createAuthenticationHeader(credentials: { username: string; password: string }, testSession: TestSession): string {
  const { username, password } = credentials;
  
  try {
    // Primary encoding method: Buffer.from().toString('base64')
    const primaryAuth = Buffer.from(`${username}:${password}`).toString('base64');
    
    console.log(`[Test Session ${testSession.id}] Created auth header using Buffer encoding`);
    return primaryAuth;
    
  } catch (error) {
    console.warn(`[Test Session ${testSession.id}] Buffer encoding failed, using btoa fallback:`, error);
    
    // Fallback encoding method: btoa()
    try {
      const fallbackAuth = btoa(`${username}:${password}`);
      return fallbackAuth;
    } catch (fallbackError) {
      console.error(`[Test Session ${testSession.id}] All encoding methods failed:`, fallbackError);
      throw new Error('Failed to encode authentication credentials');
    }
  }
}

/**
 * Enhanced test session interface for comprehensive logging
 */
interface TestSession {
  id: string;
  timestamp: number;
  wordpressUrl: string;
  authMethod: string;
  userAgent?: string;
  ipAddress?: string;
  platform?: string;
  nodeVersion?: string;
  networkInterfaces?: string[];
}

/**
 * System information for platform-specific debugging
 */
interface SystemInfo {
  platform: string;
  nodeVersion: string;
  networkInterfaces: string[];
  dnsServers: string[];
  isWindows: boolean;
}

/**
 * Enhanced test result interface with detailed diagnostics
 */
interface EnhancedTestResult {
  success: boolean;
  sessionId: string;
  timestamp: number;
  authMethod: string;
  connectionTiming: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  error?: string;
  errorCategory?: 'DNS' | 'SSL' | 'HTTP' | 'TIMEOUT' | 'AUTH' | 'NETWORK' | 'UNKNOWN';
  details?: {
    wpVersion?: string;
    namespaces?: string[];
    authentication?: string;
    httpStatus?: number;
    responseHeaders?: Record<string, string>;
    errorText?: string;
    technicalDetails?: string;
  };
  diagnostics: {
    urlValidation: boolean;
    dnsResolution?: boolean;
    sslValid?: boolean;
    apiEndpointFound?: boolean;
    authenticationWorked?: boolean;
  };
}

/**
 * Test WordPress API connection for new associations (before saving)
 */
export async function POST(request: NextRequest) {
  // Generate unique test session ID for tracking
  const sessionId = randomUUID();
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { apiConfig, wordpressUrl, environment } = body;
    
    // Log environment information for debugging
    console.log(`[Test Session ${sessionId}] Testing WordPress connection for environment: ${environment || 'production'}`);
    
    // Gather system information for Windows-specific debugging
    const systemInfo = getSystemInfo();
    
    // Create test session for logging
    const testSession: TestSession = {
      id: sessionId,
      timestamp: startTime,
      wordpressUrl: wordpressUrl || 'unknown',
      authMethod: apiConfig?.authMethod || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      platform: systemInfo.platform,
      nodeVersion: systemInfo.nodeVersion,
      networkInterfaces: systemInfo.networkInterfaces
    };
    
    console.log(`[Test Session ${sessionId}] Starting WordPress connection test:`, {
      url: wordpressUrl,
      authMethod: apiConfig?.authMethod,
      timestamp: new Date(startTime).toISOString(),
      platform: systemInfo.platform,
      nodeVersion: systemInfo.nodeVersion,
      isWindows: systemInfo.isWindows,
      networkInterfaces: systemInfo.networkInterfaces.length,
      dnsServers: systemInfo.dnsServers.length
    });

    if (!apiConfig?.credentials) {
      const result: EnhancedTestResult = {
        success: false,
        sessionId,
        timestamp: startTime,
        authMethod: 'unknown',
        connectionTiming: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        },
        error: 'Credenciais da API são obrigatórias para teste de conexão',
        errorCategory: 'AUTH',
        diagnostics: {
          urlValidation: !!wordpressUrl,
          authenticationWorked: false
        }
      };
      
      console.log(`[Test Session ${sessionId}] FAILED - Missing credentials:`, result);
      return NextResponse.json(result, { status: 400 });
    }

    if (!wordpressUrl) {
      const result: EnhancedTestResult = {
        success: false,
        sessionId,
        timestamp: startTime,
        authMethod: apiConfig.authMethod || 'unknown',
        connectionTiming: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        },
        error: 'URL do WordPress é obrigatória para teste de conexão',
        errorCategory: 'NETWORK',
        diagnostics: {
          urlValidation: false,
          authenticationWorked: false
        }
      };
      
      console.log(`[Test Session ${sessionId}] FAILED - Missing URL:`, result);
      return NextResponse.json(result, { status: 400 });
    }

    // Determine authentication method and validate credentials
    const authMethod = apiConfig.authMethod || 'applicationPassword';
    let authHeader: string;
    
    // Sanitize the API config before processing
    const sanitizedApiConfig = sanitizeApiConfig(apiConfig);
    
    if (authMethod === 'applicationPassword') {
      if (!sanitizedApiConfig.credentials.applicationPassword?.username || !sanitizedApiConfig.credentials.applicationPassword?.password) {
        const result: EnhancedTestResult = {
          success: false,
          sessionId,
          timestamp: startTime,
          authMethod,
          connectionTiming: {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime
          },
          error: 'Usuário e senha de aplicação são obrigatórios',
          errorCategory: 'AUTH',
          diagnostics: {
            urlValidation: true,
            authenticationWorked: false
          }
        };
        
        console.log(`[Test Session ${sessionId}] FAILED - Missing application password credentials:`, result);
        return NextResponse.json(result, { status: 400 });
      }
      
      authHeader = createAuthenticationHeader({
        username: sanitizedApiConfig.credentials.applicationPassword.username,
        password: sanitizedApiConfig.credentials.applicationPassword.password
      }, testSession);
    } else {
      if (!sanitizedApiConfig.credentials.wooCommerce?.consumerKey || !sanitizedApiConfig.credentials.wooCommerce?.consumerSecret) {
        const result: EnhancedTestResult = {
          success: false,
          sessionId,
          timestamp: startTime,
          authMethod,
          connectionTiming: {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime
          },
          error: 'Consumer Key e Consumer Secret são obrigatórios',
          errorCategory: 'AUTH',
          diagnostics: {
            urlValidation: true,
            authenticationWorked: false
          }
        };
        
        console.log(`[Test Session ${sessionId}] FAILED - Missing WooCommerce credentials:`, result);
        return NextResponse.json(result, { status: 400 });
      }
      
      authHeader = createAuthenticationHeader({
        username: sanitizedApiConfig.credentials.wooCommerce.consumerKey,
        password: sanitizedApiConfig.credentials.wooCommerce.consumerSecret
      }, testSession);
    }

    // Test connection to WordPress API base endpoint first
    console.log(`[Test Session ${sessionId}] Testing connection with ${authMethod} authentication`);
    const testResult = await testWordPressConnection(authHeader, wordpressUrl, testSession);
    
    console.log(`[Test Session ${sessionId}] Test completed:`, {
      success: testResult.success,
      duration: testResult.connectionTiming.duration,
      errorCategory: testResult.errorCategory || 'N/A'
    });
    
    return NextResponse.json(testResult);

  } catch (error) {
    const endTime = Date.now();
    console.error(`[Test Session ${sessionId}] FATAL ERROR:`, error);
    
    const result: EnhancedTestResult = {
      success: false,
      sessionId,
      timestamp: startTime,
      authMethod: 'unknown',
      connectionTiming: {
        startTime,
        endTime,
        duration: endTime - startTime
      },
      error: 'Erro interno ao testar conexão com WordPress',
      errorCategory: 'UNKNOWN',
      details: {
        technicalDetails: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      diagnostics: {
        urlValidation: false,
        authenticationWorked: false
      }
    };
    
    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * Test WordPress API connection using provided credentials with enhanced logging
 */
async function testWordPressConnection(
  authHeader: string,
  wordpressUrl: string,
  testSession: TestSession
): Promise<EnhancedTestResult> {
  const connectionStartTime = Date.now();
  
  try {
    // Extract hostname for DNS pre-check
    const urlObj = new URL(wordpressUrl);
    const hostname = urlObj.hostname;
    
    // Perform DNS pre-check on Windows
    const systemInfo = getSystemInfo();
    if (systemInfo.isWindows) {
      console.log(`[Test Session ${testSession.id}] Performing DNS pre-check for Windows...`);
      const dnsCheck = await performDnsPreCheck(hostname);
      
      if (!dnsCheck.success) {
        console.log(`[Test Session ${testSession.id}] DNS pre-check failed:`, dnsCheck.error);
        return {
          success: false,
          sessionId: testSession.id,
          timestamp: testSession.timestamp,
          authMethod: testSession.authMethod,
          connectionTiming: {
            startTime: connectionStartTime,
            endTime: Date.now(),
            duration: Date.now() - connectionStartTime
          },
          error: `Falha na resolução DNS: ${dnsCheck.error}`,
          errorCategory: 'DNS',
          details: {
            technicalDetails: `DNS resolution failed for ${hostname}: ${dnsCheck.error}`
          },
          diagnostics: {
            urlValidation: true,
            dnsResolution: false,
            authenticationWorked: false
          }
        };
      }
      
      console.log(`[Test Session ${testSession.id}] DNS pre-check successful: ${hostname} -> ${dnsCheck.address}`);
    }
    
    // Test basic WordPress API access
    const baseApiUrl = `${wordpressUrl.replace(/\/$/, '')}/wp-json/`;
    
    console.log(`[Test Session ${testSession.id}] Attempting connection to: ${baseApiUrl}`);
    
    // Create Windows-compatible fetch configuration
    const fetchConfig = createWindowsFetchConfig(baseApiUrl, authHeader);
    
    // Use robust connection with retry mechanism
    console.log(`[Test Session ${testSession.id}] Starting robust connection with retry mechanism...`);
    const connectionResult = await performRobustConnection(baseApiUrl, authHeader, testSession);
    
    console.log(`[Test Session ${testSession.id}] Connection completed:`, {
      totalAttempts: connectionResult.totalAttempts,
      totalDuration: connectionResult.totalDuration,
      success: connectionResult.result.success
    });
    
    if (!connectionResult.result.success) {
      // All retry attempts failed
      const error = connectionResult.result.error!;
      const { errorCategory, errorMessage } = categorizeConnectionError(error);
      
      return {
        success: false,
        sessionId: testSession.id,
        timestamp: testSession.timestamp,
        authMethod: testSession.authMethod,
        connectionTiming: {
          startTime: connectionStartTime,
          endTime: Date.now(),
          duration: connectionResult.totalDuration
        },
        error: `${errorMessage} (${connectionResult.totalAttempts} tentativas)`,
        errorCategory,
        details: {
          technicalDetails: `${error.name || 'Error'}: ${error.message || 'Unknown error'} (Code: ${(error as any).code || 'N/A'}) - Tried ${connectionResult.totalAttempts} times`
        },
        diagnostics: {
          urlValidation: true,
          dnsResolution: (error as any).code !== 'ENOTFOUND',
          sslValid: (error as any).code !== 'CERT_HAS_EXPIRED' && (error as any).code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          apiEndpointFound: (error as any).code !== 'ECONNREFUSED',
          authenticationWorked: false
        }
      };
    }
    
    const response = connectionResult.result.response!;
    
    const connectionEndTime = Date.now();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log(`[Test Session ${testSession.id}] Response received:`, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      duration: connectionEndTime - connectionStartTime
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorCategory = categorizeHttpError(response.status);
      
      console.log(`[Test Session ${testSession.id}] HTTP Error:`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // Limit log size
        category: errorCategory
      });
      
      return {
        success: false,
        sessionId: testSession.id,
        timestamp: testSession.timestamp,
        authMethod: testSession.authMethod,
        connectionTiming: {
          startTime: connectionStartTime,
          endTime: Date.now(),
          duration: Date.now() - connectionStartTime
        },
        error: getHttpErrorMessage(response.status, response.statusText),
        errorCategory,
        details: {
          httpStatus: response.status,
          responseHeaders,
          errorText: errorText.substring(0, 1000), // Limit error text size
          technicalDetails: `HTTP ${response.status} ${response.statusText}`
        },
        diagnostics: {
          urlValidation: true,
          dnsResolution: true, // If we got a response, DNS worked
          sslValid: wordpressUrl.startsWith('https') ? response.status !== 526 : undefined,
          apiEndpointFound: response.status !== 404,
          authenticationWorked: response.status !== 401 && response.status !== 403
        }
      };
    }

    const data = await response.json();
    const finalConnectionEndTime = Date.now();
    
    console.log(`[Test Session ${testSession.id}] JSON Response parsed:`, {
      hasName: !!data.name,
      hasNamespaces: !!data.namespaces,
      namespacesCount: data.namespaces?.length || 0
    });
    
    // Check if the response indicates successful access to WordPress API
    if (data.name || data.namespaces) {
      const result: EnhancedTestResult = {
        success: true,
        sessionId: testSession.id,
        timestamp: testSession.timestamp,
        authMethod: testSession.authMethod,
        connectionTiming: {
          startTime: connectionStartTime,
          endTime: finalConnectionEndTime,
          duration: finalConnectionEndTime - connectionStartTime
        },
        details: {
          wpVersion: data.name,
          namespaces: data.namespaces,
          authentication: 'successful',
          httpStatus: response.status,
          responseHeaders,
          technicalDetails: `Successful connection to WordPress ${data.name || 'API'}`
        },
        diagnostics: {
          urlValidation: true,
          dnsResolution: true,
          sslValid: wordpressUrl.startsWith('https') ? true : undefined,
          apiEndpointFound: true,
          authenticationWorked: true
        }
      };
      
      console.log(`[Test Session ${testSession.id}] SUCCESS:`, {
        wpVersion: data.name,
        duration: result.connectionTiming.duration,
        namespacesFound: data.namespaces?.length || 0
      });
      
      return result;
    } else {
      return {
        success: false,
        sessionId: testSession.id,
        timestamp: testSession.timestamp,
        authMethod: testSession.authMethod,
        connectionTiming: {
          startTime: connectionStartTime,
          endTime: finalConnectionEndTime,
          duration: finalConnectionEndTime - connectionStartTime
        },
        error: 'Resposta inesperada da API do WordPress',
        errorCategory: 'UNKNOWN',
        details: {
          httpStatus: response.status,
          responseHeaders,
          technicalDetails: 'API responded but without expected WordPress data structure'
        },
        diagnostics: {
          urlValidation: true,
          dnsResolution: true,
          sslValid: wordpressUrl.startsWith('https') ? true : undefined,
          apiEndpointFound: true,
          authenticationWorked: false
        }
      };
    }

  } catch (error: any) {
    const errorConnectionEndTime = Date.now();
    const systemInfo = getSystemInfo();
    
    console.error(`[Test Session ${testSession.id}] Connection failed:`, {
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      duration: errorConnectionEndTime - connectionStartTime,
      platform: systemInfo.platform,
      isWindows: systemInfo.isWindows,
      windowsSpecific: categorizeWindowsSpecificError(error),
      networkInterfaces: systemInfo.networkInterfaces,
      dnsServers: systemInfo.dnsServers,
      cause: error.cause ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message
      } : undefined
    });
    
    const { errorCategory, errorMessage } = categorizeConnectionError(error);
    
    return {
      success: false,
      sessionId: testSession.id,
      timestamp: testSession.timestamp,
      authMethod: testSession.authMethod,
      connectionTiming: {
        startTime: connectionStartTime,
        endTime: errorConnectionEndTime,
        duration: errorConnectionEndTime - connectionStartTime
      },
      error: errorMessage,
      errorCategory,
      details: {
        technicalDetails: `${error.name || 'Error'}: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`
      },
      diagnostics: {
        urlValidation: true,
        dnsResolution: error.code !== 'ENOTFOUND',
        sslValid: error.code !== 'CERT_HAS_EXPIRED' && error.code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        apiEndpointFound: error.code !== 'ECONNREFUSED',
        authenticationWorked: false
      }
    };
  }
}

/**
 * Categorize HTTP errors for better user understanding
 */
function categorizeHttpError(status: number): EnhancedTestResult['errorCategory'] {
  if (status === 401 || status === 403) return 'AUTH';
  if (status === 404) return 'HTTP';
  if (status >= 500) return 'HTTP';
  if (status === 408 || status === 504) return 'TIMEOUT';
  if (status === 525 || status === 526) return 'SSL';
  return 'HTTP';
}

/**
 * Get user-friendly HTTP error messages
 */
function getHttpErrorMessage(status: number, statusText: string): string {
  switch (status) {
    case 401:
      return 'Credenciais inválidas. Verifique o usuário e senha.';
    case 403:
      return 'Acesso negado. Verifique as permissões das credenciais.';
    case 404:
      return 'Endpoint da API não encontrado. Verifique se o WordPress está acessível.';
    case 408:
      return 'Timeout na requisição. O servidor demorou muito para responder.';
    case 500:
      return 'Erro interno do servidor WordPress. Verifique os logs do WordPress.';
    case 502:
      return 'Bad Gateway. Problema na configuração do servidor.';
    case 503:
      return 'Serviço indisponível. O WordPress pode estar em manutenção.';
    case 504:
      return 'Gateway Timeout. O servidor demorou muito para responder.';
    case 525:
      return 'Erro de SSL/TLS. Problema na configuração de certificado.';
    case 526:
      return 'Certificado SSL inválido.';
    default:
      return `Erro HTTP ${status}: ${statusText}`;
  }
}

/**
 * Create Windows-compatible HTTP agent for better networking
 */
function createWindowsCompatibleAgent(isHttps: boolean): https.Agent | undefined {
  const systemInfo = getSystemInfo();
  
  if (!systemInfo.isWindows) {
    return undefined; // Use default agent on non-Windows platforms
  }
  
  if (isHttps) {
    return new https.Agent({
      keepAlive: false, // Disable keep-alive on Windows to prevent connection pooling issues
      timeout: 10000,
      rejectUnauthorized: true, // Ensure SSL validation (can be disabled for dev if needed)
      secureProtocol: 'TLSv1_2_method', // Use TLS 1.2 explicitly
      ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384', // Modern cipher suite
      honorCipherOrder: true,
      maxSockets: 1, // Limit concurrent connections
      maxFreeSockets: 0, // Don't keep free sockets
      family: 4 // Force IPv4 on Windows to avoid dual-stack issues
    });
  }
  
  return undefined;
}

/**
 * Create enhanced fetch configuration for Windows compatibility
 */
function createWindowsFetchConfig(url: string, authHeader: string): RequestInit {
  const isHttps = url.startsWith('https');
  const systemInfo = getSystemInfo();
  
  const config: RequestInit = {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SATIZAP-WordPress-Tester/1.0',
      'Connection': systemInfo.isWindows ? 'close' : 'keep-alive', // Force connection close on Windows
      'Cache-Control': 'no-cache'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  };
  
  // Windows-specific configuration
  if (systemInfo.isWindows) {
    // Add Windows-specific headers and configuration
    (config.headers as Record<string, string>)['Accept-Encoding'] = 'gzip, deflate';
    (config.headers as Record<string, string>)['DNT'] = '1';
    
    // For Node.js 18+ with undici, we can pass agent configuration
    // Note: This might not work with all fetch implementations
    try {
      if (isHttps) {
        const agent = createWindowsCompatibleAgent(true);
        if (agent) {
          // @ts-ignore - Agent might not be directly supported
          config.agent = agent;
        }
      }
    } catch (error) {
      console.warn('Could not set custom agent for Windows compatibility:', error);
    }
  }
  
  return config;
}

/**
 * Exponential backoff retry mechanism for resilient connections
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Result of a connection attempt with retry information
 */
interface ConnectionAttemptResult {
  success: boolean;
  response?: Response;
  error?: Error;
  attempt: number;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Adaptive timeout configuration based on connection conditions
 */
function getAdaptiveTimeout(attemptNumber: number, isWindows: boolean): number {
  // Base timeout: 5s for first attempt, increase with retries
  let timeout = 5000 + (attemptNumber * 2000);
  
  // Windows needs more time due to networking stack differences
  if (isWindows) {
    timeout += 3000;
  }
  
  // Cap at 15 seconds maximum
  return Math.min(timeout, 15000);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'WSAECONNRESET',
    'WSAETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT'
  ];
  
  const retryableNames = [
    'TimeoutError',
    'AbortError'
  ];
  
  return retryableCodes.includes(error.code) || 
         retryableNames.includes(error.name) ||
         (error.message && error.message.includes('fetch failed'));
}

/**
 * Perform a single connection attempt with enhanced error handling
 */
async function attemptConnection(
  url: string,
  config: RequestInit,
  attemptNumber: number,
  testSession: TestSession
): Promise<ConnectionAttemptResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[Test Session ${testSession.id}] Connection attempt ${attemptNumber} to: ${url}`);
    
    const response = await fetch(url, config);
    const endTime = Date.now();
    
    return {
      success: true,
      response,
      attempt: attemptNumber,
      timing: {
        startTime,
        endTime,
        duration: endTime - startTime
      }
    };
  } catch (error: any) {
    const endTime = Date.now();
    
    console.log(`[Test Session ${testSession.id}] Attempt ${attemptNumber} failed:`, {
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      duration: endTime - startTime,
      isRetryable: isRetryableError(error)
    });
    
    return {
      success: false,
      error,
      attempt: attemptNumber,
      timing: {
        startTime,
        endTime,
        duration: endTime - startTime
      }
    };
  }
}

/**
 * Robust connection with exponential backoff retry mechanism
 */
async function performRobustConnection(
  url: string,
  authHeader: string,
  testSession: TestSession
): Promise<{ result: ConnectionAttemptResult; totalAttempts: number; totalDuration: number }> {
  const systemInfo = getSystemInfo();
  const retryConfig: RetryConfig = {
    maxRetries: systemInfo.isWindows ? 5 : 3, // More retries on Windows
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2
  };
  
  const overallStartTime = Date.now();
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    // Get adaptive timeout for this attempt
    const timeout = getAdaptiveTimeout(attempt, systemInfo.isWindows);
    
    // Create fresh configuration for each attempt
    const config = createWindowsFetchConfig(url, authHeader);
    config.signal = AbortSignal.timeout(timeout);
    
    const attemptResult = await attemptConnection(url, config, attempt, testSession);
    
    if (attemptResult.success) {
      return {
        result: attemptResult,
        totalAttempts: attempt,
        totalDuration: Date.now() - overallStartTime
      };
    }
    
    lastError = attemptResult.error;
    
    // Don't retry if the error is not retryable
    if (!isRetryableError(attemptResult.error)) {
      console.log(`[Test Session ${testSession.id}] Non-retryable error, stopping attempts`);
      return {
        result: attemptResult,
        totalAttempts: attempt,
        totalDuration: Date.now() - overallStartTime
      };
    }
    
    // Don't wait after the last attempt
    if (attempt < retryConfig.maxRetries) {
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );
      
      console.log(`[Test Session ${testSession.id}] Waiting ${delay}ms before retry ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All attempts failed
  return {
    result: {
      success: false,
      error: lastError,
      attempt: retryConfig.maxRetries,
      timing: {
        startTime: overallStartTime,
        endTime: Date.now(),
        duration: Date.now() - overallStartTime
      }
    },
    totalAttempts: retryConfig.maxRetries,
    totalDuration: Date.now() - overallStartTime
  };
}
async function performDnsPreCheck(hostname: string): Promise<{ success: boolean; address?: string; error?: string }> {
  try {
    const result = await dnsLookup(hostname, { family: 4 }); // Force IPv4
    return {
      success: true,
      address: result.address
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
function getSystemInfo(): SystemInfo {
  const networkInterfaces = os.networkInterfaces();
  const interfaceNames = Object.keys(networkInterfaces)
    .filter(name => networkInterfaces[name]?.some(iface => !iface.internal))
    .slice(0, 3); // Limit to prevent log spam
    
  return {
    platform: os.platform(),
    nodeVersion: process.version,
    networkInterfaces: interfaceNames,
    dnsServers: dns.getServers(),
    isWindows: os.platform() === 'win32'
  };
}

/**
 * Windows-specific error detection and categorization
 */
function categorizeWindowsSpecificError(error: any): { isWindowsSpecific: boolean; category?: string; message?: string } {
  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Windows-specific network error codes
  const windowsNetworkCodes = [
    'WSAECONNRESET',   // 10054 - Connection reset by peer
    'WSAECONNREFUSED', // 10061 - Connection refused
    'WSAENETUNREACH',  // 10051 - Network is unreachable
    'WSAETIMEDOUT',    // 10060 - Connection timed out
    'WSAEHOSTUNREACH', // 10065 - No route to host
    'WSAEADDRNOTAVAIL' // 10049 - Address not available
  ];
  
  if (windowsNetworkCodes.includes(errorCode)) {
    return {
      isWindowsSpecific: true,
      category: 'WINDOWS_NETWORK',
      message: `Windows networking error (${errorCode}): ${getWindowsErrorMessage(errorCode)}`
    };
  }
  
  // Windows Defender or Firewall interference
  if (errorMessage.includes('blocked') || errorMessage.includes('firewall') || errorMessage.includes('defender')) {
    return {
      isWindowsSpecific: true,
      category: 'WINDOWS_FIREWALL',
      message: 'Possível bloqueio do Windows Defender ou Firewall'
    };
  }
  
  // Node.js fetch implementation issues on Windows
  if (errorCode === 'UND_ERR_CONNECT_TIMEOUT' || errorMessage.includes('undici')) {
    return {
      isWindowsSpecific: true,
      category: 'WINDOWS_FETCH',
      message: 'Problema com implementação do fetch no Windows'
    };
  }
  
  return { isWindowsSpecific: false };
}

/**
 * Get user-friendly Windows error messages
 */
function getWindowsErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'WSAECONNRESET':
      return 'Conexão resetada (problema na pilha de rede do Windows)';
    case 'WSAECONNREFUSED':
      return 'Conexão recusada (servidor inacessível ou firewall)';
    case 'WSAENETUNREACH':
      return 'Rede inacessível (problema de roteamento do Windows)';
    case 'WSAETIMEDOUT':
      return 'Timeout de conexão (configuração de rede do Windows)';
    case 'WSAEHOSTUNREACH':
      return 'Host inacessível (problema de DNS ou roteamento)';
    case 'WSAEADDRNOTAVAIL':
      return 'Endereço não disponível (configuração de interface de rede)';
    default:
      return 'Erro de rede específico do Windows';
  }
}

/**
 * Categorize connection errors for better diagnostics with Windows-specific detection
 */
function categorizeConnectionError(error: any): { errorCategory: EnhancedTestResult['errorCategory'], errorMessage: string } {
  // Check for Windows-specific errors first
  const windowsError = categorizeWindowsSpecificError(error);
  if (windowsError.isWindowsSpecific) {
    return {
      errorCategory: 'NETWORK',
      errorMessage: windowsError.message || 'Erro específico do Windows'
    };
  }
  
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return {
      errorCategory: 'TIMEOUT',
      errorMessage: 'Timeout: Não foi possível conectar dentro do tempo limite (10s)'
    };
  }
  
  if (error.code === 'ENOTFOUND') {
    return {
      errorCategory: 'DNS',
      errorMessage: 'Domínio não encontrado. Verifique a URL do WordPress'
    };
  }
  
  if (error.code === 'ECONNREFUSED') {
    return {
      errorCategory: 'NETWORK',
      errorMessage: 'Conexão recusada. Verifique se o servidor está acessível'
    };
  }
  
  if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return {
      errorCategory: 'SSL',
      errorMessage: 'Erro de certificado SSL. Verifique a configuração HTTPS do WordPress'
    };
  }
  
  if (error.code === 'ECONNRESET') {
    return {
      errorCategory: 'NETWORK',
      errorMessage: 'Conexão resetada pelo servidor. Tente novamente'
    };
  }
  
  // Enhanced error detection for fetch failures
  if (error.message?.includes('fetch failed') && error.cause) {
    const cause = error.cause;
    return categorizeConnectionError(cause); // Recursively analyze the root cause
  }
  
  return {
    errorCategory: 'UNKNOWN',
    errorMessage: `Erro de conexão: ${error.message || 'Erro desconhecido'}`
  };
}