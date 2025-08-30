/**
 * Development logging utility for debugging tenant and middleware issues
 * Only logs in development environment to avoid cluttering production logs
 */

interface LogContext {
  [key: string]: any;
}

interface MiddlewareLogData {
  host?: string;
  pathname?: string;
  extractedTenant?: string | null;
  tenantFound?: boolean;
  associationId?: string;
  associationName?: string;
  isActive?: boolean;
  action?: 'allow' | 'redirect' | 'error' | 'skip';
  error?: string;
  timestamp?: Date;
}

class DevLogger {
  private isDevelopment: boolean;
  private prefix: string;

  constructor(prefix: string = '[DEV]') {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.prefix = prefix;
  }

  /**
   * Log general development information
   */
  log(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const timestamp = new Date().toISOString();
    console.log(`${this.prefix} [${timestamp}] ${message}`);
    
    if (context) {
      console.log(`${this.prefix} Context:`, JSON.stringify(context, null, 2));
    }
  }

  /**
   * Log middleware-specific debugging information
   */
  middleware(data: MiddlewareLogData): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    console.log(`${this.prefix} [MIDDLEWARE] [${timestamp}] Tenant Processing:`);
    console.log(`${this.prefix}   Host: ${data.host || 'unknown'}`);
    console.log(`${this.prefix}   Path: ${data.pathname || 'unknown'}`);
    console.log(`${this.prefix}   Extracted Tenant: ${data.extractedTenant || 'none'}`);
    console.log(`${this.prefix}   Tenant Found: ${data.tenantFound ? '✅' : '❌'}`);
    
    if (data.associationId) {
      console.log(`${this.prefix}   Association ID: ${data.associationId}`);
    }
    
    if (data.associationName) {
      console.log(`${this.prefix}   Association Name: ${data.associationName}`);
    }
    
    if (data.isActive !== undefined) {
      console.log(`${this.prefix}   Is Active: ${data.isActive ? '✅' : '❌'}`);
    }
    
    if (data.action) {
      console.log(`${this.prefix}   Action: ${data.action.toUpperCase()}`);
    }
    
    if (data.error) {
      console.log(`${this.prefix}   Error: ${data.error}`);
    }
    
    console.log(`${this.prefix} ----------------------------------------`);
  }

  /**
   * Log tenant context loading information
   */
  tenantContext(tenantId: string, success: boolean, details?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    const status = success ? '✅ SUCCESS' : '❌ FAILED';
    
    console.log(`${this.prefix} [TENANT-CONTEXT] [${timestamp}] ${status}`);
    console.log(`${this.prefix}   Tenant ID: ${tenantId}`);
    
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`${this.prefix}   ${key}: ${value}`);
      });
    }
  }

  /**
   * Log database operations
   */
  database(operation: string, success: boolean, details?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    const status = success ? '✅ SUCCESS' : '❌ FAILED';
    
    console.log(`${this.prefix} [DATABASE] [${timestamp}] ${operation} - ${status}`);
    
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`${this.prefix}   ${key}: ${value}`);
      });
    }
  }

  /**
   * Log errors with stack trace in development
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    console.error(`${this.prefix} [ERROR] [${timestamp}] ${message}`);
    
    if (error) {
      console.error(`${this.prefix} Error Details:`, error.message);
      console.error(`${this.prefix} Stack Trace:`, error.stack);
    }
    
    if (context) {
      console.error(`${this.prefix} Context:`, JSON.stringify(context, null, 2));
    }
  }

  /**
   * Log URL routing information
   */
  routing(url: string, shouldHaveTenant: boolean, result: 'success' | 'error' | 'fallback', details?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    const resultIcon = result === 'success' ? '✅' : result === 'error' ? '❌' : '⚠️';
    
    console.log(`${this.prefix} [ROUTING] [${timestamp}] ${resultIcon} ${result.toUpperCase()}`);
    console.log(`${this.prefix}   URL: ${url}`);
    console.log(`${this.prefix}   Should Have Tenant: ${shouldHaveTenant ? 'Yes' : 'No'}`);
    
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`${this.prefix}   ${key}: ${value}`);
      });
    }
  }
}

// Create singleton instances for different parts of the application
export const devLogger = new DevLogger('[DEV]');
export const middlewareLogger = new DevLogger('[DEV-MIDDLEWARE]');
export const tenantLogger = new DevLogger('[DEV-TENANT]');
export const dbLogger = new DevLogger('[DEV-DB]');

// Export types for use in other files
export type { MiddlewareLogData, LogContext };