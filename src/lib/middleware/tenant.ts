import { NextRequest } from 'next/server';
import { getAssociationBySubdomain } from '@/lib/services/association.service';
import { Association } from '@/lib/types';

export interface TenantContext {
  association: Association;
  subdomain: string;
}

export interface TenantContextOptions {
  enableFallback?: boolean;
  debugMode?: boolean;
  cacheEnabled?: boolean;
}

// Local cache for development associations to reduce database queries
interface AssociationCache {
  [subdomain: string]: {
    association: Association | null;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
  };
}

const developmentCache: AssociationCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache in development

// Enhanced development logging helper for tenant context
function logTenantDebug(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const logData = data ? JSON.stringify(data, null, 2) : '';
    console.log(`[TENANT DEBUG ${timestamp}] ${message}`, logData);
  }
}

// Detailed logging for tenant context flow tracking
function logTenantFlow(step: string, details: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TENANT FLOW] Step: ${step}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

// Database operation logging
function logTenantDatabase(operation: string, details: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TENANT DB] ${operation}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

// Error logging with context
function logTenantError(error: any, context: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[TENANT ERROR] ${new Date().toISOString()}`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      context
    });
  }
}

// Cache management functions for development
function getCachedAssociation(subdomain: string): Association | null | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined; // No caching in production
  }
  
  const cached = developmentCache[subdomain];
  if (!cached) {
    return undefined;
  }
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    // Cache expired
    delete developmentCache[subdomain];
    logTenantDebug('Cache expired for subdomain', { subdomain, age: now - cached.timestamp });
    return undefined;
  }
  
  logTenantDebug('Cache hit for subdomain', { 
    subdomain, 
    found: !!cached.association,
    age: now - cached.timestamp 
  });
  return cached.association;
}

function setCachedAssociation(subdomain: string, association: Association | null): void {
  if (process.env.NODE_ENV !== 'development') {
    return; // No caching in production
  }
  
  developmentCache[subdomain] = {
    association,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  };
  
  logTenantDebug('Cached association for subdomain', { 
    subdomain, 
    found: !!association,
    ttl: CACHE_TTL 
  });
}

function clearCache(): void {
  if (process.env.NODE_ENV === 'development') {
    Object.keys(developmentCache).forEach(key => delete developmentCache[key]);
    logTenantDebug('Development cache cleared');
  }
}

// Enhanced tenant slug validation for path-based routing
function isValidTenantSlug(slug: string): { valid: boolean; reason?: string } {
  // Basic format validation
  if (!slug || typeof slug !== 'string') {
    return { valid: false, reason: 'Slug is empty or not a string' };
  }
  
  // Length validation
  if (slug.length < 2 || slug.length > 63) {
    return { valid: false, reason: `Slug length must be between 2-63 characters, got ${slug.length}` };
  }
  
  // Format validation - allow letters, numbers, hyphens
  const formatRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  if (!formatRegex.test(slug)) {
    return { valid: false, reason: 'Slug contains invalid characters or format' };
  }
  
  // Reserved paths that should never be treated as tenant slugs
  const reservedPaths = [
    'api', 'admin', 'satizap', 'association-not-found', 'atendimento', 
    '_next', 'favicon', 'robots', 'sitemap', 'manifest', 'sw',
    'static', 'public', 'assets', 'images', 'css', 'js',
    'auth', 'login', 'logout', 'register', 'signup', 'signin',
    'dashboard', 'panel', 'console', 'app', 'portal',
    'www', 'mail', 'ftp', 'blog', 'support', 'help', 'docs', 'status'
  ];
  
  if (reservedPaths.includes(slug.toLowerCase())) {
    return { valid: false, reason: `Slug '${slug}' is reserved` };
  }
  
  // Additional validation for common file extensions
  const fileExtensions = ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.json', '.xml', '.txt'];
  if (fileExtensions.some(ext => slug.toLowerCase().endsWith(ext))) {
    return { valid: false, reason: `Slug appears to be a file with extension` };
  }
  
  return { valid: true };
}

export async function getTenantContext(
  request: NextRequest, 
  options: TenantContextOptions = {}
): Promise<TenantContext | null> {
  const { enableFallback = false, debugMode = false, cacheEnabled = true } = options;
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  
  logTenantFlow('TENANT_CONTEXT_START', {
    host,
    pathname,
    url: request.url,
    method: request.method,
    searchParams,
    userAgent: request.headers.get('user-agent'),
    options: { enableFallback, debugMode, cacheEnabled }
  });
  
  logTenantDebug('Starting tenant context extraction with comprehensive request details', {
    host,
    pathname,
    url: request.url,
    method: request.method,
    searchParams,
    options: { enableFallback, debugMode, cacheEnabled },
    headers: {
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin')
    },
    timestamp: new Date().toISOString()
  });
  
  // Extract subdomain from host and pathname (for development path-based routing)
  logTenantFlow('SUBDOMAIN_EXTRACTION_START', {
    host,
    pathname,
    method: 'extractSubdomain',
    options
  });
  
  const extractionResult = extractSubdomainEnhanced(host, pathname, { debugMode });
  
  logTenantFlow('SUBDOMAIN_EXTRACTION_RESULT', {
    extractedSubdomain: extractionResult.subdomain,
    extractionMethod: extractionResult.method,
    isValid: extractionResult.isValid,
    validationReason: extractionResult.validationReason,
    host,
    pathname,
    success: !!extractionResult.subdomain && extractionResult.isValid
  });
  
  logTenantDebug('Subdomain extraction result with detailed analysis', {
    extractionResult,
    host,
    pathname,
    hostParts: host.split('.'),
    pathParts: pathname.split('/').filter(p => p.length > 0),
    extractionMethod: host.includes('localhost') ? 'path-based' : 'subdomain-based'
  });
  
  if (!extractionResult.subdomain || !extractionResult.isValid) {
    logTenantFlow('NO_VALID_SUBDOMAIN_FOUND', {
      host,
      pathname,
      extractedSubdomain: extractionResult.subdomain,
      isValid: extractionResult.isValid,
      validationReason: extractionResult.validationReason,
      extractionMethod: extractionResult.method,
      reason: extractionResult.subdomain ? 'Invalid subdomain format' : 'No subdomain extracted',
      action: 'return_null'
    });
    logTenantDebug('No valid subdomain found - returning null with context', {
      extractionResult,
      host,
      pathname,
      possibleCauses: [
        'Root path in development',
        'Invalid hostname format',
        'Reserved path segment',
        'No valid tenant identifier',
        'Invalid slug format',
        'Slug validation failed'
      ]
    });
    return null;
  }

  const subdomain = extractionResult.subdomain;

  try {
    // Check cache first if enabled
    let association: Association | null = null;
    let fromCache = false;
    
    if (cacheEnabled && process.env.NODE_ENV === 'development') {
      const cachedResult = getCachedAssociation(subdomain);
      if (cachedResult !== undefined) {
        association = cachedResult;
        fromCache = true;
        
        logTenantFlow('CACHE_HIT', {
          subdomain,
          found: !!association,
          source: 'cache'
        });
      }
    }
    
    if (!fromCache) {
      logTenantFlow('DATABASE_QUERY_START', {
        subdomain,
        action: 'getAssociationBySubdomain',
        queryType: 'association_lookup',
        cacheEnabled,
        fromCache: false
      });
      
      logTenantDatabase('ASSOCIATION_LOOKUP', {
        subdomain,
        query: 'getAssociationBySubdomain',
        startTime: new Date().toISOString(),
        cacheEnabled
      });
      
      logTenantDebug('Attempting to get association by subdomain with query details', {
        subdomain,
        action: 'database_query',
        queryFunction: 'getAssociationBySubdomain',
        expectedFields: ['id', 'name', 'subdomain', 'isActive', 'wordpressUrl'],
        cacheEnabled,
        fromCache
      });
      
      // Get association by subdomain
      const queryStartTime = Date.now();
      association = await getAssociationBySubdomain(subdomain);
      const queryDuration = Date.now() - queryStartTime;
      
      // Cache the result if caching is enabled
      if (cacheEnabled && process.env.NODE_ENV === 'development') {
        setCachedAssociation(subdomain, association);
      }
      
      logTenantFlow('DATABASE_QUERY_COMPLETE', {
        subdomain,
        found: !!association,
        queryDuration: `${queryDuration}ms`,
        associationId: association?.id,
        associationName: association?.name,
        fromCache: false
      });
    } else {
      logTenantFlow('DATABASE_QUERY_COMPLETE', {
        subdomain,
        found: !!association,
        queryDuration: '0ms (cached)',
        associationId: association?.id,
        associationName: association?.name,
        fromCache: true
      });
    }
    
    logTenantDatabase('ASSOCIATION_LOOKUP_RESULT', {
      subdomain,
      found: !!association,
      associationId: association?.id,
      associationName: association?.name,
      isActive: association?.isActive,
      wordpressUrl: association?.wordpressUrl,
      fromCache
    });
    
    logTenantDebug('Association query result with comprehensive details', {
      found: !!association,
      associationId: association?.id,
      associationName: association?.name,
      isActive: association?.isActive,
      subdomain: association?.subdomain,
      wordpressUrl: association?.wordpressUrl,
      createdAt: association?.createdAt,
      updatedAt: association?.updatedAt,
      searchedSubdomain: subdomain,
      fromCache,
      cacheEnabled
    });
    
    if (!association) {
      logTenantFlow('ASSOCIATION_NOT_FOUND', {
        searchedSubdomain: subdomain,
        reason: 'No association with this subdomain exists',
        action: 'return_null'
      });
      logTenantDebug('Association not found in database with search details', {
        searchedSubdomain: subdomain,
        reason: 'No association with this subdomain exists',
        suggestions: [
          'Check if association exists in database',
          'Verify subdomain spelling',
          'Run seed script to create test data',
          'Check database connection'
        ]
      });
      return null;
    }
    
    if (!association.isActive) {
      logTenantFlow('ASSOCIATION_INACTIVE', {
        associationId: association.id,
        associationName: association.name,
        isActive: association.isActive,
        reason: 'Association exists but isActive = false',
        action: 'return_null'
      });
      logTenantDebug('Association found but inactive with full details', {
        associationId: association.id,
        associationName: association.name,
        subdomain: association.subdomain,
        isActive: association.isActive,
        reason: 'Association exists but isActive = false',
        createdAt: association.createdAt,
        updatedAt: association.updatedAt,
        suggestion: 'Update isActive to true in database'
      });
      return null;
    }

    const tenantContext = {
      association,
      subdomain,
    };
    
    logTenantFlow('TENANT_CONTEXT_SUCCESS', {
      associationId: tenantContext.association.id,
      associationName: tenantContext.association.name,
      subdomain: tenantContext.subdomain,
      isActive: tenantContext.association.isActive,
      action: 'return_context'
    });
    
    logTenantDebug('Tenant context created successfully with complete details', {
      tenantContext: {
        associationId: tenantContext.association.id,
        associationName: tenantContext.association.name,
        subdomain: tenantContext.subdomain,
        isActive: tenantContext.association.isActive,
        wordpressUrl: tenantContext.association.wordpressUrl,
        createdAt: tenantContext.association.createdAt,
        updatedAt: tenantContext.association.updatedAt
      },
      requestInfo: {
        originalHost: host,
        originalPathname: pathname,
        extractedSubdomain: subdomain
      }
    });

    return tenantContext;
    
  } catch (error) {
    logTenantFlow('DATABASE_ERROR', {
      error: error instanceof Error ? error.message : String(error),
      subdomain,
      action: 'throw_error'
    });
    
    logTenantError(error, {
      subdomain,
      host,
      pathname,
      operation: 'getAssociationBySubdomain',
      timestamp: new Date().toISOString()
    });
    
    logTenantDebug('Error getting association from database with full context', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: (error as any).cause
      } : error,
      subdomain,
      action: 'database_error',
      context: {
        host,
        pathname,
        operation: 'getAssociationBySubdomain',
        possibleCauses: [
          'Database connection issue',
          'Invalid query parameters',
          'Database schema mismatch',
          'Network timeout'
        ]
      }
    });
    
    // Re-throw the error to be handled by middleware
    throw error;
  }
}

// Enhanced subdomain extraction with validation and better development support
interface SubdomainExtractionResult {
  subdomain: string | null;
  method: 'subdomain' | 'path-based' | 'custom-domain' | 'fallback';
  isValid: boolean;
  validationReason?: string;
}

export function extractSubdomainEnhanced(
  host: string, 
  pathname?: string, 
  options: { debugMode?: boolean } = {}
): SubdomainExtractionResult {
  const { debugMode = false } = options;
  
  logTenantFlow('ENHANCED_SUBDOMAIN_EXTRACTION_START', {
    host,
    pathname,
    nodeEnv: process.env.NODE_ENV,
    debugMode,
    method: 'extractSubdomainEnhanced'
  });
  
  if (debugMode) {
    logTenantDebug('Enhanced subdomain extraction with input analysis', {
      host,
      pathname,
      nodeEnv: process.env.NODE_ENV,
      hostLength: host.length,
      pathnameLength: pathname?.length || 0,
      hasPort: host.includes(':'),
      hasDots: host.includes('.')
    });
  }
  
  // Remove port if present
  const hostname = host.split(':')[0];
  const port = host.includes(':') ? host.split(':')[1] : null;
  
  logTenantFlow('HOST_PARSING', {
    originalHost: host,
    hostname,
    port,
    hasPort: !!port
  });
  
  // Split by dots
  const parts = hostname.split('.');
  
  logTenantFlow('HOSTNAME_ANALYSIS', {
    hostname,
    parts,
    partsCount: parts.length,
    isLocalhost: hostname === 'localhost',
    isIP: hostname.startsWith('127.0.0.1')
  });
  
  // For development (localhost), handle path-based routing with enhanced validation
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    logTenantFlow('DEVELOPMENT_ENVIRONMENT', {
      hostname,
      isDevelopment: process.env.NODE_ENV === 'development',
      hasPathname: !!pathname,
      pathnameLength: pathname?.length || 0
    });
    
    if (pathname && process.env.NODE_ENV === 'development') {
      // Extract first path segment as tenant slug
      const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
      
      logTenantFlow('PATH_SEGMENT_ANALYSIS', {
        pathname,
        pathSegments,
        segmentCount: pathSegments.length,
        firstSegment: pathSegments[0] || 'none'
      });
      
      if (pathSegments.length > 0) {
        const potentialSlug = pathSegments[0];
        const validation = isValidTenantSlug(potentialSlug);
        
        logTenantFlow('ENHANCED_SLUG_VALIDATION', {
          potentialSlug,
          isValid: validation.valid,
          validationReason: validation.reason,
          pathSegments
        });
        
        if (validation.valid) {
          return {
            subdomain: potentialSlug,
            method: 'path-based',
            isValid: true
          };
        } else {
          return {
            subdomain: potentialSlug,
            method: 'path-based',
            isValid: false,
            validationReason: validation.reason
          };
        }
      }
    }
    
    // For localhost without valid path, return null (no fallback to demo)
    return {
      subdomain: null,
      method: 'fallback',
      isValid: false,
      validationReason: 'No valid path-based tenant found in development'
    };
  }
  
  // For production domains like associacao1.satizap.com
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const validation = isValidTenantSlug(subdomain);
    
    logTenantFlow('PRODUCTION_SUBDOMAIN_EXTRACTED', {
      subdomain,
      source: 'subdomain',
      fullHostname: hostname,
      domainStructure: 'subdomain.domain.tld',
      isValid: validation.valid,
      validationReason: validation.reason
    });
    
    return {
      subdomain,
      method: 'subdomain',
      isValid: validation.valid,
      validationReason: validation.reason
    };
  }
  
  // For custom domains, use the full hostname as subdomain
  if (parts.length === 2) {
    const subdomain = parts[0];
    const validation = isValidTenantSlug(subdomain);
    
    logTenantFlow('CUSTOM_DOMAIN_EXTRACTED', {
      subdomain,
      source: 'custom_domain',
      fullHostname: hostname,
      domainStructure: 'domain.tld',
      isValid: validation.valid,
      validationReason: validation.reason
    });
    
    return {
      subdomain,
      method: 'custom-domain',
      isValid: validation.valid,
      validationReason: validation.reason
    };
  }
  
  logTenantFlow('NO_SUBDOMAIN_FOUND', {
    hostname,
    parts,
    partsCount: parts.length,
    reason: 'No matching extraction pattern'
  });
  
  return {
    subdomain: null,
    method: 'fallback',
    isValid: false,
    validationReason: 'No matching extraction pattern'
  };
}

// Legacy function for backward compatibility
export function extractSubdomain(host: string, pathname?: string): string | null {
  const result = extractSubdomainEnhanced(host, pathname);
  return result.isValid ? result.subdomain : null;
}

export function createTenantUrl(subdomain: string, path: string = '/'): string {
  if (process.env.NODE_ENV === 'development') {
    // Phase 1: Use path-based routing for development
    const port = process.env.PORT || '9002'; // Default to 9002 as per project config
    return `http://localhost:${port}/${subdomain}${path === '/' ? '' : path}`;
  }
  
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'satizap.com';
  return `https://${subdomain}.${domain}${path}`;
}

export function isValidSubdomain(subdomain: string): boolean {
  // Check subdomain format (alphanumeric, hyphens, 3-63 characters)
  const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  
  if (!subdomainRegex.test(subdomain)) {
    return false;
  }
  
  if (subdomain.length < 3 || subdomain.length > 63) {
    return false;
  }
  
  // Reserved subdomains
  const reserved = [
    'www', 'api', 'admin', 'mail', 'ftp', 'blog', 'support', 
    'help', 'docs', 'status', 'app', 'dashboard', 'portal'
  ];
  
  return !reserved.includes(subdomain.toLowerCase());
}

// Middleware helper for API routes
export async function withTenantContext<T>(
  request: NextRequest,
  handler: (context: TenantContext) => Promise<T>
): Promise<T> {
  logTenantFlow('WITH_TENANT_CONTEXT_START', {
    url: request.url,
    method: request.method,
    pathname: request.nextUrl.pathname,
    host: request.headers.get('host')
  });
  
  logTenantDebug('withTenantContext called with request details', {
    url: request.url,
    method: request.method,
    pathname: request.nextUrl.pathname,
    host: request.headers.get('host'),
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  try {
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext) {
      logTenantFlow('WITH_TENANT_CONTEXT_FAILED', {
        error: 'Invalid tenant or subdomain',
        url: request.url,
        method: request.method,
        action: 'throw_error'
      });
      logTenantDebug('withTenantContext failed - no tenant context with details', {
        error: 'Invalid tenant or subdomain',
        url: request.url,
        method: request.method,
        pathname: request.nextUrl.pathname,
        host: request.headers.get('host'),
        possibleCauses: [
          'Subdomain not found in database',
          'Association is inactive',
          'Invalid hostname format',
          'Database connection issue'
        ]
      });
      throw new Error('Invalid tenant or subdomain');
    }
    
    logTenantFlow('WITH_TENANT_CONTEXT_SUCCESS', {
      tenantId: tenantContext.association.id,
      subdomain: tenantContext.subdomain,
      associationName: tenantContext.association.name,
      action: 'call_handler'
    });
    
    logTenantDebug('withTenantContext success - calling handler with context', {
      tenantId: tenantContext.association.id,
      subdomain: tenantContext.subdomain,
      associationName: tenantContext.association.name,
      isActive: tenantContext.association.isActive,
      url: request.url,
      method: request.method
    });
    
    const handlerStartTime = Date.now();
    const result = await handler(tenantContext);
    const handlerDuration = Date.now() - handlerStartTime;
    
    logTenantFlow('HANDLER_EXECUTION_COMPLETE', {
      tenantId: tenantContext.association.id,
      handlerDuration: `${handlerDuration}ms`,
      success: true
    });
    
    return result;
    
  } catch (error) {
    logTenantFlow('WITH_TENANT_CONTEXT_ERROR', {
      error: error instanceof Error ? error.message : String(error),
      url: request.url,
      method: request.method
    });
    
    logTenantError(error, {
      url: request.url,
      method: request.method,
      pathname: request.nextUrl.pathname,
      host: request.headers.get('host'),
      operation: 'withTenantContext'
    });
    
    throw error;
  }
}

// Export cache management functions for development use
export const cacheManager = {
  clear: clearCache,
  getStats: () => {
    if (process.env.NODE_ENV !== 'development') {
      return { message: 'Cache only available in development' };
    }
    
    const now = Date.now();
    const entries = Object.entries(developmentCache);
    const active = entries.filter(([, cache]) => now - cache.timestamp < cache.ttl);
    const expired = entries.filter(([, cache]) => now - cache.timestamp >= cache.ttl);
    
    return {
      total: entries.length,
      active: active.length,
      expired: expired.length,
      entries: entries.map(([subdomain, cache]) => ({
        subdomain,
        found: !!cache.association,
        age: now - cache.timestamp,
        expired: now - cache.timestamp >= cache.ttl
      }))
    };
  },
  get: (subdomain: string) => {
    if (process.env.NODE_ENV !== 'development') {
      return undefined;
    }
    return getCachedAssociation(subdomain);
  }
};