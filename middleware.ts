import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/middleware/tenant';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes not related to chat, and admin routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // For chat-related routes and the root route, we need tenant context
  if (pathname.startsWith('/satizap') || pathname === '/') {
    try {
      const tenantContext = await getTenantContext(request);
      
      // If no valid tenant context is found, redirect to association not found page
      if (!tenantContext) {
        const host = request.headers.get('host') || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        
        // For localhost development, allow access without tenant validation
        if (isLocalhost) {
          return NextResponse.next();
        }
        
        // For production, redirect to a not found page or main site
        return NextResponse.redirect(new URL('/association-not-found', request.url));
      }

      // Add tenant context to headers for API routes and pages to use
      const response = NextResponse.next();
      response.headers.set('X-Tenant-ID', tenantContext.association.id);
      response.headers.set('X-Tenant-Subdomain', tenantContext.subdomain);
      response.headers.set('X-Tenant-Name', tenantContext.association.name);
      
      return response;
      
    } catch (error) {
      console.error('Middleware error:', error);
      
      // On error, allow request to continue but log the error
      return NextResponse.next();
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
     */
    '/((?!api/upload|api/admin|admin|_next/static|_next/image|favicon.ico).*)',
  ],
};