/**
 * Professional WhatsApp Error Handler
 * Centralized error handling and response formatting
 */

import type { WhatsAppError, ApiError } from './whatsapp-types.ts';

export class WhatsAppErrorHandler {
  /**
   * Determine appropriate HTTP status code based on error type
   */
  static determineStatusCode(error: Error | WhatsAppError): number {
    if ('statusCode' in error && error.statusCode) {
      return error.statusCode;
    }

    const message = error.message.toLowerCase();
    
    // Authentication/Authorization errors
    if (message.includes('unauthorized') || message.includes('invalid user token')) {
      return 401;
    }
    
    if (message.includes('forbidden') || message.includes('no firm assigned')) {
      return 403;
    }
    
    // Client errors
    if (message.includes('missing required') || 
        message.includes('invalid request') ||
        message.includes('bad request')) {
      return 400;
    }
    
    // Resource not found
    if (message.includes('not found') || 
        message.includes('no connected whatsapp session')) {
      return 404;
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many')) {
      return 429;
    }
    
    // Network/External service errors
    if (message.includes('network error') || 
        message.includes('failed to connect') ||
        message.includes('timeout')) {
      return 503;
    }
    
    // Default to 500 for unknown errors
    return 500;
  }

  /**
   * Sanitize error messages for client consumption
   */
  static sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /key/gi,
      /secret/gi,
      /auth/gi
    ];
    
    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    // Provide user-friendly messages for common errors
    const errorMappings: Record<string, string> = {
      'Network error': 'WhatsApp service is temporarily unavailable. Please try again in a moment.',
      'Timeout': 'Request timed out. Please check your connection and try again.',
      'Invalid JSON': 'Invalid data format received. Please contact support.',
      'No authorization header': 'Authentication required. Please log in again.',
      'Invalid user token': 'Your session has expired. Please log in again.',
      'No firm assigned': 'No firm selected. Please select a firm first.',
      'No connected WhatsApp session': 'WhatsApp not connected. Please initialize WhatsApp first.'
    };
    
    for (const [pattern, replacement] of Object.entries(errorMappings)) {
      if (sanitized.includes(pattern)) {
        return replacement;
      }
    }
    
    return sanitized;
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(error: Error | WhatsAppError, context?: string): {
    status: number;
    body: ApiError;
  } {
    const statusCode = this.determineStatusCode(error);
    const sanitizedMessage = this.sanitizeErrorMessage(error.message);
    
    console.error(`❌ [${context || 'WhatsApp'}] Error:`, {
      message: error.message,
      stack: error.stack,
      context: 'context' in error ? error.context : undefined
    });

    return {
      status: statusCode,
      body: {
        error: sanitizedMessage,
        message: context ? `${context}: ${sanitizedMessage}` : sanitizedMessage,
        statusCode,
        ...(Deno.env.get('NODE_ENV') === 'development' && {
          details: error.message,
          stack: error.stack
        })
      }
    };
  }

  /**
   * Handle database-specific errors
   */
  static handleDatabaseError(error: any, operation: string): {
    status: number;
    body: ApiError;
  } {
    console.error(`❌ Database error during ${operation}:`, error);
    
    let message = 'Database operation failed';
    let statusCode = 500;
    
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          message = 'Resource already exists';
          statusCode = 409;
          break;
        case '23503': // Foreign key violation
          message = 'Referenced resource not found';
          statusCode = 400;
          break;
        case '42P01': // Undefined table
          message = 'Database configuration error';
          statusCode = 500;
          break;
        default:
          message = `Database error: ${error.message}`;
      }
    }
    
    return {
      status: statusCode,
      body: {
        error: message,
        statusCode,
        ...(Deno.env.get('NODE_ENV') === 'development' && {
          details: error.message,
          code: error.code
        })
      }
    };
  }

  /**
   * Handle WhatsApp backend service errors
   */
  static handleBackendError(error: WhatsAppError, operation: string): {
    status: number;
    body: ApiError;
  } {
    console.error(`❌ Backend service error during ${operation}:`, error);
    
    let message = 'WhatsApp service error';
    let statusCode = 503;
    
    if (error.statusCode) {
      statusCode = error.statusCode;
      
      switch (error.statusCode) {
        case 404:
          message = 'WhatsApp session not found';
          break;
        case 400:
          message = 'Invalid WhatsApp request';
          break;
        case 500:
          message = 'WhatsApp service internal error';
          break;
        default:
          message = `WhatsApp service error: ${error.message}`;
      }
    }
    
    return {
      status: statusCode,
      body: {
        error: message,
        statusCode,
        ...(Deno.env.get('NODE_ENV') === 'development' && {
          details: error.message,
          context: error.context
        })
      }
    };
  }

  /**
   * Log error with structured format
   */
  static logError(error: Error, context: string, metadata?: Record<string, any>): void {
    const logData = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      ...metadata
    };
    
    console.error('❌ WhatsApp Error:', JSON.stringify(logData, null, 2));
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error | WhatsAppError): boolean {
    const retryablePatterns = [
      /network error/i,
      /timeout/i,
      /connection refused/i,
      /service unavailable/i,
      /502/,
      /503/,
      /504/
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }
}