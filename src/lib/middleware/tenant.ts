import { NextRequest } from 'next/server';
import { getAssociationBySubdomain } from '@/lib/services/association.service';
import { Association } from '@/lib/types';

export interface TenantContext {
  association: Association;
  subdomain: string;
}

export async function getTenantContext(request: NextRequest): Promise<TenantContext | null> {
  const host = request.headers.get('host') || '';
  
  // Extract subdomain from host
  const subdomain = extractSubdomain(host);
  
  if (!subdomain) {
    return null;
  }

  // Get association by subdomain
  const association = await getAssociationBySubdomain(subdomain);
  
  if (!association || !association.isActive) {
    return null;
  }

  return {
    association,
    subdomain,
  };
}

export function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];
  
  // Split by dots
  const parts = hostname.split('.');
  
  // For development (localhost), handle special cases
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    return 'demo'; // Default tenant for local development
  }
  
  // For production domains like associacao1.satizap.com
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // For custom domains, use the full hostname as subdomain
  if (parts.length === 2) {
    return parts[0];
  }
  
  return null;
}

export function createTenantUrl(subdomain: string, path: string = '/'): string {
  if (process.env.NODE_ENV === 'development') {
    return `http://${subdomain}.localhost:3000${path}`;
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
  const tenantContext = await getTenantContext(request);
  
  if (!tenantContext) {
    throw new Error('Invalid tenant or subdomain');
  }
  
  return handler(tenantContext);
}