/**
 * TypeScript Type Definitions for WhatsApp Integration
 * Professional type definitions for better code quality and maintainability
 */

export interface WhatsAppSession {
  id: string;
  firm_id: string;
  session_id: string;
  status: WhatsAppStatus;
  qr_code?: string;
  connected_at?: string;
  last_ping: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppSessionCreate {
  firm_id: string;
  session_id: string;
  status: WhatsAppStatus;
  last_ping: string;
}

export interface WhatsAppSessionUpdate {
  status?: WhatsAppStatus;
  qr_code?: string;
  connected_at?: string;
  last_ping?: string;
}

export type WhatsAppStatus = 
  | 'disconnected'
  | 'connecting' 
  | 'qr_ready'
  | 'connected'
  | 'error'
  | 'expired';

export interface BackendStatusResponse {
  status: string;
  ready?: boolean;
  qr_code?: string;
  qr_retries?: number;
  connected_sockets?: number;
  created_at?: string;
  last_update?: string;
  connection_attempts?: number;
  message?: string;
  error?: string;
  queue_length?: number;
}

export interface SessionStatusResponse {
  status: WhatsAppStatus;
  ready: boolean;
  qr_available: boolean;
  qr_code?: string;
  queue_length: number;
  session_id: string;
  firm_id: string;
  connected_at?: string;
  last_ping: string;
  debug?: {
    backend_url: string;
    session_age: number;
    database_status: string;
  };
}

export interface MessageSendRequest {
  session_id: string;
  phone: string;
  message: string;
}

export interface MessageSendResponse {
  success: boolean;
  message: string;
  result?: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: any;
    messageTimestamp: string;
    status: string;
  };
}

export interface WhatsAppError extends Error {
  code?: string;
  statusCode?: number;
  context?: string;
}

export interface DatabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: string;
  statusCode?: number;
}

// Request/Response interfaces for edge functions
export interface InitializeSessionRequest {
  firmId?: string;
}

export interface InitializeSessionResponse {
  session_id: string;
  status: WhatsAppStatus;
  firm_id: string;
  backend_status?: string;
  message: string;
}

export interface CheckStatusRequest {
  firmId?: string;
}

export interface SendMessageRequest {
  firmId: string;
  phone: string;
  message: string;
}

export interface SendBulkMessageRequest {
  firmId: string;
  messages: Array<{
    phone: string;
    message: string;
  }>;
  messageType?: 'task_update' | 'payment_reminder' | 'general' | 'test';
}

export interface CleanupSessionRequest {
  firmId?: string;
}

export interface CleanupSessionResponse {
  success: boolean;
  cleaned_sessions: number;
  message: string;
}

// Utility types for better error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;