/**
 * Professional WhatsApp Backend API Client
 * Centralized API communication with the external WhatsApp service
 */

import { WHATSAPP_CONFIG } from './whatsapp-config.ts';
import type { 
  BackendStatusResponse, 
  MessageSendRequest, 
  MessageSendResponse,
  AsyncResult,
  WhatsAppError
} from './whatsapp-types.ts';

export class WhatsAppBackendAPI {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = WHATSAPP_CONFIG.BACKEND_URL;
    this.defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Supabase-Edge-Function'
    };
  }

  /**
   * Create an AbortController with timeout for requests
   */
  private createTimeoutController(timeoutMs: number = WHATSAPP_CONFIG.TIMEOUTS.REQUEST) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeoutId };
  }

  /**
   * Make a safe HTTP request with proper error handling
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): AsyncResult<T> {
    const { controller, timeoutId } = this.createTimeoutController();
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`🌐 Making request to: ${url}`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Backend API error: ${response.status} ${response.statusText}`, errorText);
        
        const error: WhatsAppError = new Error(`Backend API error: ${response.status} ${response.statusText}`);
        error.statusCode = response.status;
        error.context = errorText;
        
        return { success: false, error };
      }

      const responseText = await response.text();
      
      try {
        const data = JSON.parse(responseText) as T;
        console.log(`✅ Backend API response received for ${endpoint}`);
        return { success: true, data };
      } catch (parseError) {
        console.error('❌ Failed to parse backend response:', parseError);
        console.log('Raw response:', responseText);
        
        const error: WhatsAppError = new Error('Invalid JSON response from backend');
        error.context = responseText;
        
        return { success: false, error };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ Network error for ${endpoint}:`, error);
      
      const whatsappError: WhatsAppError = new Error(`Network error: ${error.message}`);
      whatsappError.context = endpoint;
      
      return { success: false, error: whatsappError };
    }
  }

  /**
   * Check backend service health
   */
  async checkHealth(): AsyncResult<{ status: string; timestamp: string }> {
    const { controller, timeoutId } = this.createTimeoutController(WHATSAPP_CONFIG.TIMEOUTS.HEALTH_CHECK);
    
    try {
      const response = await fetch(`${this.baseUrl}${WHATSAPP_CONFIG.ENDPOINTS.HEALTH}`, {
        signal: controller.signal,
        headers: this.defaultHeaders
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend health check passed');
        return { success: true, data };
      } else {
        console.log('⚠️ Backend health check failed:', response.status);
        return { success: false, error: new Error(`Health check failed: ${response.status}`) };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Backend health check error:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Initialize a WhatsApp session on the backend
   */
  async initializeSession(sessionId: string, firmId: string): AsyncResult<{ success: boolean; session_id: string; message: string }> {
    return this.makeRequest(WHATSAPP_CONFIG.ENDPOINTS.INITIALIZE, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        firm_id: firmId
      })
    });
  }

  /**
   * Get session status from backend
   */
  async getSessionStatus(sessionId: string): AsyncResult<BackendStatusResponse> {
    return this.makeRequest(`${WHATSAPP_CONFIG.ENDPOINTS.STATUS}/${sessionId}`);
  }

  /**
   * Send a message through the backend
   */
  async sendMessage(request: MessageSendRequest): AsyncResult<MessageSendResponse> {
    console.log(`📤 Sending message to ${request.phone} via session ${request.session_id}`);
    
    return this.makeRequest(WHATSAPP_CONFIG.ENDPOINTS.SEND_MESSAGE, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Send a test message
   */
  async sendTestMessage(sessionId: string, phone: string, message: string): AsyncResult<MessageSendResponse> {
    return this.makeRequest(WHATSAPP_CONFIG.ENDPOINTS.SEND_TEST, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        phone,
        message
      })
    });
  }

  /**
   * Disconnect a session on the backend
   */
  async disconnectSession(sessionId: string): AsyncResult<{ success: boolean; message: string }> {
    return this.makeRequest(WHATSAPP_CONFIG.ENDPOINTS.DISCONNECT, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId
      })
    });
  }

  /**
   * Check if backend is available
   */
  async isBackendAvailable(): Promise<boolean> {
    const healthResult = await this.checkHealth();
    return healthResult.success;
  }

  /**
   * Get backend URL for debugging
   */
  getBackendUrl(): string {
    return this.baseUrl;
  }
}