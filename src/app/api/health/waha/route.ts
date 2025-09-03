import { NextRequest, NextResponse } from 'next/server';
import { wahaHealthService, WAHAConnectionConfig } from '@/lib/services/waha-health.service';

/**
 * WAHA Health Check API Endpoint
 * GET /api/health/waha - Check WAHA service health
 * POST /api/health/waha - Test WAHA connection with custom config
 */

export async function GET() {
  try {
    // Use default WAHA configuration from environment
    const config: WAHAConnectionConfig = {
      apiUrl: `http://localhost:${process.env.WAHA_PORT || '3000'}`,
      apiKey: process.env.WAHA_API_KEY,
      timeout: 10000
    };

    const result = await wahaHealthService.testConnection(config);

    return NextResponse.json({
      success: result.success,
      health: result.health,
      sessions: result.sessions,
      diagnostics: result.diagnostics,
      config: {
        apiUrl: config.apiUrl,
        hasApiKey: !!config.apiKey,
        timeout: config.timeout
      }
    }, {
      status: result.success ? 200 : 503
    });

  } catch (error) {
    console.error('WAHA health check error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const config: WAHAConnectionConfig = {
      apiUrl: body.apiUrl || `http://localhost:${process.env.WAHA_PORT || '3000'}`,
      apiKey: body.apiKey || process.env.WAHA_API_KEY,
      timeout: body.timeout || 10000
    };

    // Validate required fields
    if (!config.apiUrl) {
      return NextResponse.json({
        success: false,
        error: 'API URL is required'
      }, { status: 400 });
    }

    const result = await wahaHealthService.testConnection(config);

    return NextResponse.json({
      success: result.success,
      health: result.health,
      sessions: result.sessions,
      diagnostics: result.diagnostics,
      testedConfig: {
        apiUrl: config.apiUrl,
        hasApiKey: !!config.apiKey,
        timeout: config.timeout
      }
    }, {
      status: result.success ? 200 : 503
    });

  } catch (error) {
    console.error('WAHA connection test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request body',
      timestamp: new Date().toISOString()
    }, {
      status: 400
    });
  }
}