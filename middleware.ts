import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';
import { getUserSession } from '@/lib/auth';

// Enhanced development logging helper
function logMiddlewareDebug(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const logData = data ? JSON.stringify(data, null, 2) : '';
    console.log(`[MIDDLEWARE DEBUG ${timestamp}] ${message}`, logData);
  }
}

// Helper function to create development error redirects
function createDevErrorRedirect(request: NextRequest, errorType: string, message: string, tenant?: string) {
  const errorUrl = new URL('/dev-error', request.url);
  errorUrl.searchParams.set('type', errorType);
  errorUrl.searchParams.set('message', encodeURIComponent(message));
  if (tenant) {
    errorUrl.searchParams.set('tenant', tenant);
  }
  errorUrl.searchParams.set('timestamp', new Date().toISOString());
  return NextResponse.redirect(errorUrl);
}

// Detailed logging for middleware flow tracking
function logMiddlewareFlow(step: string, details: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MIDDLEWARE FLOW] Step: ${step}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

// Error logging with stack trace
function logMiddlewareError(error: any, context: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[MIDDLEWARE ERROR] ${new Date().toISOString()}`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      context
    });
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  
  // Enhanced initial request logging
  logMiddlewareFlow('REQUEST_START', {
    url: request.url,
    pathname,
    host,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    headers: Object.fromEntries([...request.headers.entries()])
  });
  
  logMiddlewareDebug('Processing request with detailed context', {
    url: request.url,
    pathname,
    host,
    method: request.method,
    searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
    timestamp: new Date().toISOString()
  });

  // Skip middleware for static files, but handle admin routes with RBAC
  const skipConditions = {
    nextStatic: pathname.startsWith('/_next'),
    apiUpload: pathname.startsWith('/api/upload'),
    staticFile: pathname.includes('.') && !pathname.includes('/admin'),
    favicon: pathname.startsWith('/favicon')
  };
  
  const shouldSkip = Object.values(skipConditions).some(condition => condition);
  
  logMiddlewareFlow('SKIP_CHECK', {
    pathname,
    skipConditions,
    shouldSkip,
    decision: shouldSkip ? 'SKIP' : 'CONTINUE'
  });
  
  if (shouldSkip) {
    logMiddlewareDebug('Skipping middleware for static/admin route', { 
      pathname,
      reason: Object.entries(skipConditions).find(([_, value]) => value)?.[0]
    });
    return NextResponse.next();
  }

  // Phase 1: Handle development path-based routing
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isDevelopment = process.env.NODE_ENV === 'development' || (isLocalhost && !process.env.NODE_ENV);
  
  logMiddlewareFlow('ENVIRONMENT_DETECTION', {
    host,
    isLocalhost,
    nodeEnv: process.env.NODE_ENV,
    isDevelopment,
    port: host.split(':')[1] || 'default',
    hostname: host.split(':')[0]
  });
  
  logMiddlewareDebug('Environment detection with enhanced details', {
    host,
    isLocalhost,
    nodeEnv: process.env.NODE_ENV,
    isDevelopment,
    hostParts: host.split('.'),
    portInfo: host.includes(':') ? `Port: ${host.split(':')[1]}` : 'No port specified'
  });
  
  // Extract potential tenant slug from path in development
  let tenantSlug = null;
  let isDynamicRoute = false;
  
  logMiddlewareFlow('TENANT_EXTRACTION_START', {
    isLocalhost,
    isDevelopment,
    pathname,
    shouldExtract: isLocalhost && isDevelopment
  });
  
  if (isLocalhost && isDevelopment) {
    const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
    const reservedPaths = ['satizap', 'admin', 'api', 'association-not-found', 'atendimento'];
    
    logMiddlewareDebug('Path analysis for tenant extraction with detailed breakdown', {
      pathname,
      pathSegments,
      segmentCount: pathSegments.length,
      reservedPaths,
      firstSegment: pathSegments[0] || 'none'
    });
    
    if (pathSegments.length > 0) {
      const potentialSlug = pathSegments[0];
      const isReservedPath = reservedPaths.includes(potentialSlug);
      const regexTest = /^[a-z0-9-]+$/.test(potentialSlug);
      const lengthValid = potentialSlug.length >= 3;
      
      logMiddlewareFlow('SLUG_VALIDATION', {
        potentialSlug,
        isReservedPath,
        regexTest,
        lengthValid,
        validSlug: !isReservedPath && regexTest && lengthValid
      });
      
      logMiddlewareDebug('Validating potential tenant slug with comprehensive checks', {
        potentialSlug,
        checks: {
          isReservedPath,
          regexTest,
          lengthValid,
          regexPattern: '^[a-z0-9-]+$',
          minLength: 3,
          actualLength: potentialSlug.length
        }
      });
      
      if (!isReservedPath && regexTest && lengthValid) {
        tenantSlug = potentialSlug;
        isDynamicRoute = true;
        logMiddlewareFlow('TENANT_EXTRACTED', {
          tenantSlug,
          isDynamicRoute,
          source: 'path_segment'
        });
        logMiddlewareDebug('Tenant slug extracted successfully', {
          tenantSlug,
          isDynamicRoute,
          extractionMethod: 'path-based',
          validationPassed: true
        });
      } else {
        const failureReason = isReservedPath ? 'Reserved path' : 
                             !regexTest ? 'Invalid format' : 
                             'Length too short';
        logMiddlewareFlow('TENANT_EXTRACTION_FAILED', {
          potentialSlug,
          reason: failureReason,
          isReservedPath,
          regexTest,
          lengthValid
        });
        logMiddlewareDebug('Tenant slug validation failed', {
          potentialSlug,
          reason: failureReason,
          details: { isReservedPath, regexTest, lengthValid }
        });
      }
    } else {
      logMiddlewareFlow('NO_PATH_SEGMENTS', {
        pathname,
        reason: 'Root path or empty segments'
      });
      logMiddlewareDebug('No tenant slug extraction needed', {
        reason: 'Root path - no segments to analyze'
      });
    }
  } else {
    logMiddlewareFlow('TENANT_EXTRACTION_SKIPPED', {
      isLocalhost,
      isDevelopment,
      reason: !isLocalhost ? 'Not localhost' : 'Not development'
    });
  }

  // For chat-related routes, dynamic routes, tenant APIs, we need tenant context
  // The root route (/) is now a public Hero Section and doesn't need tenant context
  const tenantContextChecks = {
    satizapRoute: pathname.startsWith('/satizap'),
    dynamicRoute: isDynamicRoute,
    tenantInfoApi: pathname.startsWith('/api/tenant-info'),
    patientsApi: pathname.startsWith('/api/patients'),
    messagesApi: pathname.startsWith('/api/messages')
  };
  
  // Explicitly exclude root route and error pages from tenant validation
  const isRootRoute = pathname === '/';
  const isErrorPage = pathname.startsWith('/association-not-found') || pathname.startsWith('/dev-error');
  const isPublicRoute = isRootRoute || isErrorPage;
  
  const needsTenantContext = Object.values(tenantContextChecks).some(check => check) && !isPublicRoute;
  
  logMiddlewareFlow('TENANT_CONTEXT_REQUIREMENT', {
    pathname,
    needsTenantContext,
    checks: tenantContextChecks,
    tenantSlug,
    isDynamicRoute,
    isRootRoute,
    isErrorPage,
    isPublicRoute
  });
  
  logMiddlewareDebug('Tenant context requirement check with detailed analysis', {
    needsTenantContext,
    pathname,
    tenantSlug,
    checks: tenantContextChecks,
    publicRouteChecks: {
      isRootRoute,
      isErrorPage,
      isPublicRoute
    },
    decision: needsTenantContext ? 'REQUIRE_TENANT_CONTEXT' : 'NO_TENANT_CONTEXT_NEEDED'
  });
  
  if (needsTenantContext) {
    try {
      logMiddlewareFlow('TENANT_CONTEXT_FETCH_START', {
        pathname,
        tenantSlug,
        host,
        method: 'getTenantContext'
      });
      
      logMiddlewareDebug('Attempting to get tenant context with full request details', {
        url: request.url,
        pathname,
        host,
        tenantSlug,
        extractedFrom: isDynamicRoute ? 'path' : 'subdomain'
      });
      
      const tenantContext = await getTenantContext(request, {
        enableFallback: isDevelopment && isLocalhost,
        debugMode: isDevelopment,
        cacheEnabled: isDevelopment
      });
      
      logMiddlewareFlow('TENANT_CONTEXT_FETCH_RESULT', {
        found: !!tenantContext,
        associationId: tenantContext?.association?.id,
        subdomain: tenantContext?.subdomain,
        associationName: tenantContext?.association?.name,
        isActive: tenantContext?.association?.isActive,
        wordpressUrl: tenantContext?.association?.wordpressUrl
      });
      
      logMiddlewareDebug('Tenant context result with comprehensive details', {
        found: !!tenantContext,
        associationId: tenantContext?.association?.id,
        subdomain: tenantContext?.subdomain,
        associationName: tenantContext?.association?.name,
        isActive: tenantContext?.association?.isActive,
        wordpressUrl: tenantContext?.association?.wordpressUrl,
        createdAt: tenantContext?.association?.createdAt,
        requestedSlug: tenantSlug
      });
      
      // Graceful error handling for development environment
      if (!tenantContext) {
        // In development, provide more informative error handling
        if (isDevelopment && isLocalhost) {
          logMiddlewareFlow('DEVELOPMENT_GRACEFUL_FALLBACK', {
            tenantSlug,
            pathname,
            isDynamicRoute,
            action: 'redirect_to_dev_error',
            reason: 'Development environment - informative error page'
          });
          logMiddlewareDebug('Development - redirecting to informative error page', {
            action: 'redirect_to_dev_error',
            reason: 'Development environment - better debugging experience',
            requestedSlug: tenantSlug,
            pathname,
            isDynamicRoute,
            errorType: 'tenant-not-found'
          });
          
          // For dynamic routes (tenant-specific), redirect to dev-error page
          if (isDynamicRoute && tenantSlug) {
            return createDevErrorRedirect(
              request, 
              'tenant-not-found', 
              `Associação "${tenantSlug}" não foi encontrada no banco de dados`, 
              tenantSlug
            );
          }
          
          // For other routes, continue with graceful fallback
          const response = NextResponse.next();
          response.headers.set('X-Dev-Tenant-Missing', 'true');
          response.headers.set('X-Dev-Requested-Tenant', tenantSlug || 'none');
          response.headers.set('X-Dev-Fallback-Mode', 'graceful');
          
          return response;
        }
        
        // For production, redirect to appropriate error page
        logMiddlewareFlow('PRODUCTION_REDIRECT_NOT_FOUND', {
          action: 'redirect_not_found',
          redirectUrl: '/association-not-found',
          originalUrl: request.url,
          isProduction: !isLocalhost,
          tenantSlug
        });
        logMiddlewareDebug('Production - redirecting to not found page', {
          action: 'redirect_not_found',
          redirectUrl: '/association-not-found',
          originalUrl: request.url,
          pathname,
          host,
          tenantSlug
        });
        
        return NextResponse.redirect(new URL('/association-not-found', request.url));
      }

      // Add tenant context to headers for API routes and pages to use
      const response = NextResponse.next();
      const headers = {
        'X-Tenant-ID': tenantContext.association.id,
        'X-Tenant-Subdomain': tenantContext.subdomain,
        'X-Tenant-Name': tenantContext.association.name
      };
      
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      logMiddlewareFlow('HEADERS_SET_SUCCESS', {
        action: 'headers_set',
        headers,
        responseStatus: response.status,
        pathname
      });
      
      logMiddlewareDebug('Tenant context headers set successfully with full details', {
        action: 'headers_set',
        tenantId: tenantContext.association.id,
        subdomain: tenantContext.subdomain,
        name: tenantContext.association.name,
        headers,
        pathname,
        finalUrl: request.url
      });
      
      return response;
      
    } catch (error) {
      logMiddlewareFlow('MIDDLEWARE_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        pathname,
        tenantSlug,
        host,
        action: 'graceful_error_handling',
        isDevelopment,
        isLocalhost
      });
      
      logMiddlewareError(error, {
        pathname,
        tenantSlug,
        host,
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        isDevelopment,
        isLocalhost
      });
      
      logMiddlewareDebug('Middleware error occurred - implementing graceful handling', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: (error as any).cause
        } : error,
        action: 'graceful_error_handling',
        context: {
          pathname,
          tenantSlug,
          host,
          url: request.url,
          timestamp: new Date().toISOString(),
          isDevelopment,
          isLocalhost
        }
      });
      
      console.error('Middleware error:', error);
      
      // Enhanced error handling for development
      if (isDevelopment && isLocalhost) {
        logMiddlewareFlow('DEVELOPMENT_ERROR_FALLBACK', {
          action: 'redirect_to_dev_error',
          reason: 'Development environment - detailed error page',
          pathname,
          tenantSlug,
          errorType: 'middleware-error'
        });
        
        // For tenant-specific routes, show detailed error page
        if (isDynamicRoute && tenantSlug) {
          return createDevErrorRedirect(
            request,
            'middleware-error',
            error instanceof Error ? error.message : 'Erro interno do middleware',
            tenantSlug
          );
        }
        
        // For other routes, continue with error headers
        const response = NextResponse.next();
        response.headers.set('X-Dev-Middleware-Error', 'true');
        response.headers.set('X-Dev-Error-Message', error instanceof Error ? error.message : String(error));
        response.headers.set('X-Dev-Requested-Tenant', tenantSlug || 'none');
        response.headers.set('X-Dev-Fallback-Mode', 'error-recovery');
        
        return response;
      }
      
      // In production, still continue but without debug headers
      return NextResponse.next();
    }
  }

  logMiddlewareFlow('NO_TENANT_CONTEXT_NEEDED', {
    action: 'continue_no_tenant_needed',
    pathname,
    reason: 'Route does not require tenant validation',
    isPublicRoute,
    isRootRoute,
    isErrorPage
  });
  
  logMiddlewareDebug('No tenant context needed - continuing with detailed info', {
    action: 'continue_no_tenant_needed',
    pathname,
    host,
    url: request.url,
    reason: 'Route does not require tenant validation',
    routeType: isRootRoute ? 'root_hero_section' : 
               isErrorPage ? 'error_page' : 
               'other_public_route'
  });

  // RBAC Authorization Check for Admin Routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    logMiddlewareFlow('RBAC_CHECK_START', {
      pathname,
      requiresAuth: true,
      checkType: 'admin_access'
    });

    // Check for authentication cookie/session
    const authCookie = request.cookies.get('auth-session');
    
    if (!authCookie) {
      logMiddlewareFlow('RBAC_NO_AUTH', {
        action: 'redirect_to_login',
        pathname,
        reason: 'No authentication cookie found'
      });
      
      // Redirect to login page
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Parse session data (you'll need to implement session parsing)
      const sessionData = JSON.parse(authCookie.value);
      
      logMiddlewareFlow('RBAC_SESSION_CHECK', {
        hasSession: !!sessionData,
        userEmail: sessionData?.email,
        userRole: sessionData?.role,
        associationId: sessionData?.associationId
      });

      // For manager role, restrict access to their association only
      if (sessionData.role === 'manager') {
        const associationSpecificRoutes = [
          `/admin/associations/${sessionData.associationId}`,
          `/api/admin/associations/${sessionData.associationId}`
        ];

        const isAllowedRoute = associationSpecificRoutes.some(route => 
          pathname.startsWith(route)
        );

        if (!isAllowedRoute && !pathname.startsWith('/admin/dashboard')) {
          logMiddlewareFlow('RBAC_ACCESS_DENIED', {
            userRole: sessionData.role,
            associationId: sessionData.associationId,
            requestedPath: pathname,
            action: 'redirect_to_dashboard'
          });

          // Redirect manager to their specific dashboard
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }

      // Add user context to headers
      const response = NextResponse.next();
      response.headers.set('X-User-Role', sessionData.role);
      response.headers.set('X-User-Association', sessionData.associationId || '');
      response.headers.set('X-User-Email', sessionData.email);

      logMiddlewareFlow('RBAC_ACCESS_GRANTED', {
        userRole: sessionData.role,
        associationId: sessionData.associationId,
        pathname,
        action: 'continue_with_auth_headers'
      });

      return response;

    } catch (error) {
      logMiddlewareError(error, {
        context: 'RBAC_session_parsing',
        pathname,
        authCookie: authCookie?.value?.substring(0, 50) + '...'
      });

      // Invalid session, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/upload (file uploads)
     * - api/admin (admin API routes)
     * - admin (admin dashboard)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * Phase 1: Include all potential tenant slug paths for development
     * Include api/tenant-info and other tenant-specific APIs
     */
    '/((?!api/upload|api/admin|admin|_next/static|_next/image|favicon.ico).*)',
  ],
};