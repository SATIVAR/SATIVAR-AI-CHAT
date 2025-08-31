import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decryptApiConfig } from '@/lib/crypto';
import { sanitizePhone } from '@/lib/utils/phone';

interface DiagnosticTest {
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  params?: Record<string, any>;
  body?: any;
}

interface DiagnosticResult {
  testName: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  url: string;
  response?: any;
  error?: string;
  details?: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { testType, testData } = body;

    // Get association
    const association = await prisma.association.findUnique({
      where: { id }
    });

    if (!association) {
      return NextResponse.json({ error: 'Associação não encontrada' }, { status: 404 });
    }

    if (!association.wordpressUrl || !association.apiConfig) {
      return NextResponse.json({ 
        error: 'Associação não possui configuração WordPress completa' 
      }, { status: 400 });
    }

    // Decrypt API config
    const apiConfig = await decryptApiConfig(association.apiConfig as string);
    
    // Create authentication header
    let authHeader: string;
    if (apiConfig.authMethod === 'applicationPassword') {
      authHeader = Buffer.from(
        `${apiConfig.credentials.applicationPassword!.username}:${apiConfig.credentials.applicationPassword!.password}`
      ).toString('base64');
    } else {
      authHeader = Buffer.from(
        `${apiConfig.credentials.wooCommerce!.consumerKey}:${apiConfig.credentials.wooCommerce!.consumerSecret}`
      ).toString('base64');
    }

    const baseUrl = association.wordpressUrl.replace(/\/$/, '');
    const results: DiagnosticResult[] = [];

    // Define available tests
    const tests: Record<string, DiagnosticTest> = {
      searchPatientByPhone: {
        name: 'Buscar Paciente por Telefone',
        description: 'Testa a busca de paciente usando o endpoint customizado do plugin Sativar',
        endpoint: '/wp-json/sativar/v1/clientes',
        method: 'GET',
        params: {
          'acf_filters[telefone]': testData?.phone || '85996201636'
        }
      },
      listProducts: {
        name: 'Listar Produtos WooCommerce',
        description: 'Testa o acesso aos produtos do WooCommerce',
        endpoint: '/wp-json/wc/v3/products',
        method: 'GET',
        params: {
          per_page: 5
        }
      },
      listOrders: {
        name: 'Listar Pedidos WooCommerce',
        description: 'Testa o acesso aos pedidos do WooCommerce',
        endpoint: '/wp-json/wc/v3/orders',
        method: 'GET',
        params: {
          per_page: 5
        }
      },
      listCustomers: {
        name: 'Listar Clientes WooCommerce',
        description: 'Testa o acesso aos clientes do WooCommerce',
        endpoint: '/wp-json/wc/v3/customers',
        method: 'GET',
        params: {
          per_page: 5
        }
      },
      listUsers: {
        name: 'Listar Usuários WordPress',
        description: 'Testa o acesso aos usuários do WordPress',
        endpoint: '/wp-json/wp/v2/users',
        method: 'GET',
        params: {
          per_page: 5
        }
      }
    };

    // Run specific test or all tests
    const testsToRun = testType === 'all' ? Object.keys(tests) : [testType];

    for (const testKey of testsToRun) {
      const test = tests[testKey];
      if (!test) continue;

      const startTime = Date.now();
      
      try {
        // Build URL with parameters
        let url = `${baseUrl}${test.endpoint}`;
        if (test.params) {
          const params = new URLSearchParams();
          Object.entries(test.params).forEach(([key, value]) => {
            params.append(key, String(value));
          });
          url += `?${params.toString()}`;
        }

        // Sanitize phone number if it's a phone search test
        if (testKey === 'searchPatientByPhone' && testData?.phone) {
          const cleanPhone = sanitizePhone(testData.phone);
          url = url.replace(testData.phone, cleanPhone);
        }

        const response = await fetch(url, {
          method: test.method,
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
            'User-Agent': 'SATIZAP-Endpoint-Diagnostics/1.0'
          },
          body: test.body ? JSON.stringify(test.body) : undefined,
          signal: AbortSignal.timeout(10000)
        });

        const responseTime = Date.now() - startTime;
        let responseData: any;

        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }

        results.push({
          testName: test.name,
          success: response.ok,
          statusCode: response.status,
          responseTime,
          url,
          response: responseData,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          details: {
            description: test.description,
            method: test.method,
            headers: Object.fromEntries(response.headers.entries())
          }
        });

      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        
        results.push({
          testName: test.name,
          success: false,
          responseTime,
          url: `${baseUrl}${test.endpoint}`,
          error: error.message || 'Erro de conexão',
          details: {
            description: test.description,
            method: test.method,
            errorCode: error.code,
            errorName: error.name
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      associationName: association.name,
      wordpressUrl: association.wordpressUrl,
      testsRun: testsToRun.length,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        averageResponseTime: results.reduce((acc, r) => acc + r.responseTime, 0) / results.length
      }
    });

  } catch (error) {
    console.error('Error in endpoint diagnostics:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}