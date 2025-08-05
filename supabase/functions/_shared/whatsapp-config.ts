/**
 * Centralized WhatsApp Configuration
 * Professional configuration management for all WhatsApp operations
 */

export const WHATSAPP_CONFIG = {
  // Backend service configuration
  BACKEND_URL: Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-fcx5.onrender.com',
  
  // Timeout configurations (milliseconds)
  TIMEOUTS: {
    CONNECTION: 60000,        // 1 minute for socket connections
    QR_EXPIRY: 60000,        // 1 minute for QR code validity
    REQUEST: 15000,          // 15 seconds for HTTP requests
    HEALTH_CHECK: 5000,      // 5 seconds for health checks
    SESSION_CLEANUP: 120000  // 2 minutes before session cleanup
  },
  
  // Retry and limit configurations
  LIMITS: {
    MAX_QR_RETRIES: 5,
    MAX_CONNECTION_ATTEMPTS: 5,
    MAX_CONNECTING_TIME: 30 * 60 * 1000, // 30 minutes
    SESSION_CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    MAX_REQUESTS_PER_WINDOW: 50
  },
  
  // Message configuration
  MESSAGING: {
    TEST_PHONE: Deno.env.get('WHATSAPP_TEST_PHONE') || '+919106403233',
    MAX_MESSAGE_LENGTH: 4096,
    BULK_MESSAGE_BATCH_SIZE: 10,
    MESSAGE_RETRY_ATTEMPTS: 3
  },
  
  // Session status types
  STATUS: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    QR_READY: 'qr_ready',
    CONNECTED: 'connected',
    ERROR: 'error',
    EXPIRED: 'expired'
  } as const,
  
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    INITIALIZE: '/api/whatsapp/initialize',
    STATUS: '/api/whatsapp/status',
    SEND_MESSAGE: '/send-message',
    SEND_TEST: '/api/whatsapp/send-test',
    DISCONNECT: '/api/whatsapp/disconnect'
  }
} as const;

// Type definitions for better type safety
export type WhatsAppStatus = typeof WHATSAPP_CONFIG.STATUS[keyof typeof WHATSAPP_CONFIG.STATUS];

export interface WhatsAppResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

export interface SessionResponse extends WhatsAppResponse {
  session_id?: string;
  status?: WhatsAppStatus;
  qr_code?: string;
  firm_id?: string;
  ready?: boolean;
  qr_available?: boolean;
}

export interface MessageRequest {
  firmId: string;
  phone: string;
  message: string;
  messageType?: string;
}

export interface BulkMessageRequest {
  firmId: string;
  recipients: Array<{
    phone: string;
    message: string;
  }>;
  messageType?: string;
}