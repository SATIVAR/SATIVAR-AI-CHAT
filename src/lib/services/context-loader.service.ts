/**
 * Dynamic Context Loading Service for Phase 2 Implementation
 * 
 * This service implements the core functionality for Phase 2:
 * - Dynamic context loading via getContext(tenantId)
 * - Environment-based URL selection (Phase 3 - Environment Logic)
 * - In-memory caching for API configurations
 * - Secure credential management
 * - Automatic cache invalidation
 */

import { Association, ApiConfig } from '@/lib/types';
import { getAssociationBySubdomain } from '@/lib/services/association.service';
import { decryptApiConfig } from '@/lib/crypto';

/**
 * Environment-based WordPress URL selection
 * Always uses the production WordPress URL from the association
 */
function selectWordPressUrl(association: Association): string {
  console.log(`[ContextLoader] Using WordPress URL for ${association.name}: ${association.wordpressUrl}`);
  return association.wordpressUrl;
}

// In-memory cache for API configurations
interface CachedContext {
  association: Association;
  apiConfig: ApiConfig | null;
  selectedWordPressUrl: string; // Environment-selected URL
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const contextCache = new Map<string, CachedContext>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL
const CACHE_CHECK_INTERVAL = 5 * 60 * 1000; // Check for expired entries every 5 minutes

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, cached] of contextCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      contextCache.delete(key);
      console.log(`[ContextLoader] Removed expired cache entry for: ${key}`);
    }
  }
}

// Set up automatic cache cleanup
setInterval(cleanupExpiredCache, CACHE_CHECK_INTERVAL);

/**
 * Complete context for AI operations
 */
export interface TenantContext {
  associationId: string;
  associationName: string;
  subdomain: string;
  wordpressUrl: string;
  apiConfig: ApiConfig | null;
  // Legacy fallback
  wordpressAuth?: {
    apiKey: string;
    username: string;
    password: string;
  };
  // AI configuration
  promptContext?: string;
  aiDirectives?: string;
  aiRestrictions?: string;
  // Public display
  publicDisplayName?: string;
  logoUrl?: string;
  welcomeMessage?: string;
}

/**
 * Main function to get dynamic context for a tenant (Phase 2 Core Function)
 * 
 * @param tenantId - Can be either subdomain or association ID
 * @param forceRefresh - Force cache refresh
 * @returns Complete tenant context or null if not found
 */
export async function getContext(
  tenantId: string, 
  forceRefresh: boolean = false
): Promise<TenantContext | null> {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh && contextCache.has(tenantId)) {
      const cached = contextCache.get(tenantId)!;
      const now = Date.now();
      
      // Return cached data if still valid
      if (now - cached.timestamp <= cached.ttl) {
        console.log(`[ContextLoader] Using cached context for: ${tenantId}`);
        return buildTenantContext(cached.association, cached.apiConfig, cached.selectedWordPressUrl);
      } else {
        // Remove expired cache entry
        contextCache.delete(tenantId);
        console.log(`[ContextLoader] Cache expired for: ${tenantId}`);
      }
    }

    console.log(`[ContextLoader] Loading fresh context for: ${tenantId}`);
    
    // Load association data
    // First try as subdomain, then as ID
    let association: Association | null = null;
    
    // Try as subdomain first (most common case)
    association = await getAssociationBySubdomain(tenantId);
    
    // If not found and looks like an ID, try direct lookup
    if (!association && tenantId.length > 10) {
      try {
        const { getAssociationById } = await import('@/lib/services/association.service');
        association = await getAssociationById(tenantId);
      } catch (error) {
        console.warn(`[ContextLoader] Failed to load by ID: ${tenantId}`, error);
      }
    }
    
    if (!association) {
      console.warn(`[ContextLoader] Association not found: ${tenantId}`);
      return null;
    }

    // Select appropriate WordPress URL based on environment
    const selectedWordPressUrl = selectWordPressUrl(association);

    // Extract and decrypt API configuration
    let apiConfig: ApiConfig | null = null;
    
    if (association.apiConfig) {
      try {
        if (typeof association.apiConfig === 'string') {
          apiConfig = await decryptApiConfig(association.apiConfig);
        } else {
          apiConfig = association.apiConfig;
        }
        console.log(`[ContextLoader] Successfully loaded API config for: ${association.name}`);
      } catch (error) {
        console.error(`[ContextLoader] Failed to decrypt API config for ${association.name}:`, error);
        apiConfig = null;
      }
    }

    // Cache the result with environment-selected URL
    const cachedContext: CachedContext = {
      association,
      apiConfig,
      selectedWordPressUrl,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    };
    
    contextCache.set(tenantId, cachedContext);
    contextCache.set(association.id, cachedContext); // Cache by ID as well
    
    console.log(`[ContextLoader] Cached context for: ${association.name} (${tenantId})`);
    
    return buildTenantContext(association, apiConfig, selectedWordPressUrl);
    
  } catch (error) {
    console.error(`[ContextLoader] Error loading context for ${tenantId}:`, error);
    return null;
  }
}

/**
 * Build standardized tenant context object
 * Uses environment-selected WordPress URL for optimal development/production workflow
 */
function buildTenantContext(
  association: Association, 
  apiConfig: ApiConfig | null, 
  selectedWordPressUrl?: string
): TenantContext {
  // Use provided URL or fallback to environment selection
  const wordpressUrl = selectedWordPressUrl || selectWordPressUrl(association);
  
  return {
    associationId: association.id,
    associationName: association.name,
    subdomain: association.subdomain,
    wordpressUrl,
    apiConfig,
    wordpressAuth: association.wordpressAuth,
    promptContext: association.promptContext || undefined,
    aiDirectives: association.aiDirectives || undefined,
    aiRestrictions: association.aiRestrictions || undefined,
    publicDisplayName: association.publicDisplayName || undefined,
    logoUrl: association.logoUrl || undefined,
    welcomeMessage: association.welcomeMessage || undefined,
  };
}

/**
 * Clear cache for specific tenant (useful after updates)
 */
export function clearContextCache(tenantId: string): void {
  contextCache.delete(tenantId);
  console.log(`[ContextLoader] Cleared cache for: ${tenantId}`);
}

/**
 * Clear all cache entries (useful for testing or major updates)
 */
export function clearAllContextCache(): void {
  contextCache.clear();
  console.log(`[ContextLoader] Cleared all cache entries`);
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats(): { 
  size: number; 
  entries: { tenant: string; age: number; ttl: number }[] 
} {
  const now = Date.now();
  const entries = Array.from(contextCache.entries()).map(([tenant, cached]) => ({
    tenant,
    age: now - cached.timestamp,
    ttl: cached.ttl
  }));
  
  return {
    size: contextCache.size,
    entries
  };
}

/**
 * Validate API configuration for a tenant
 * Returns whether the tenant has a valid API configuration
 */
export async function validateTenantApiConfig(tenantId: string): Promise<{
  isValid: boolean;
  hasApiConfig: boolean;
  hasLegacyAuth: boolean;
  authMethod?: 'applicationPassword' | 'wooCommerce' | 'legacy';
  error?: string;
}> {
  try {
    const context = await getContext(tenantId);
    
    if (!context) {
      return {
        isValid: false,
        hasApiConfig: false,
        hasLegacyAuth: false,
        error: 'Tenant not found'
      };
    }
    
    // Check for new API config
    if (context.apiConfig) {
      const authMethod = context.apiConfig.authMethod || 'applicationPassword';
      let isValid = false;
      
      if (authMethod === 'applicationPassword') {
        isValid = !!(
          context.apiConfig.credentials.applicationPassword?.username &&
          context.apiConfig.credentials.applicationPassword?.password
        );
      } else if (authMethod === 'wooCommerce') {
        isValid = !!(
          context.apiConfig.credentials.wooCommerce?.consumerKey &&
          context.apiConfig.credentials.wooCommerce?.consumerSecret
        );
      }
      
      return {
        isValid,
        hasApiConfig: true,
        hasLegacyAuth: !!context.wordpressAuth,
        authMethod
      };
    }
    
    // Check for legacy auth
    if (context.wordpressAuth) {
      const isValid = !!(
        context.wordpressAuth.username &&
        context.wordpressAuth.password
      );
      
      return {
        isValid,
        hasApiConfig: false,
        hasLegacyAuth: true,
        authMethod: 'legacy'
      };
    }
    
    return {
      isValid: false,
      hasApiConfig: false,
      hasLegacyAuth: false,
      error: 'No authentication configuration found'
    };
    
  } catch (error) {
    return {
      isValid: false,
      hasApiConfig: false,
      hasLegacyAuth: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  getContext,
  clearContextCache,
  clearAllContextCache,
  getCacheStats,
  validateTenantApiConfig
};