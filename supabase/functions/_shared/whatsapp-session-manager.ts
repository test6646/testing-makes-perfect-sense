/**
 * Professional WhatsApp Session Manager
 * Centralized session management logic for all WhatsApp operations
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WHATSAPP_CONFIG } from './whatsapp-config.ts';
import type { 
  WhatsAppSession, 
  WhatsAppSessionCreate, 
  WhatsAppSessionUpdate, 
  WhatsAppStatus,
  BackendStatusResponse,
  Result,
  AsyncResult
} from './whatsapp-types.ts';

export class WhatsAppSessionManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  /**
   * Get the active session for a firm
   */
  async getActiveSession(firmId: string): AsyncResult<WhatsAppSession | null> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Failed to get active session:', error);
        return { success: false, error: new Error(error.message) };
      }

      const session = sessions?.[0] || null;
      
      if (session) {
        console.log(`📋 Found active session: ${session.session_id} (status: ${session.status})`);
      } else {
        console.log(`📋 No active session found for firm: ${firmId}`);
      }

      return { success: true, data: session };
    } catch (error) {
      console.error('❌ Error getting active session:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Create a new session for a firm
   */
  async createSession(firmId: string, sessionId?: string): AsyncResult<WhatsAppSession> {
    try {
      const generatedSessionId = sessionId || `firm_${firmId}_${Date.now()}`;
      
      const sessionData: WhatsAppSessionCreate = {
        firm_id: firmId,
        session_id: generatedSessionId,
        status: 'connecting',
        last_ping: new Date().toISOString()
      };

      const { data: session, error } = await this.supabase
        .from('whatsapp_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create session:', error);
        return { success: false, error: new Error(error.message) };
      }

      console.log(`✅ Created new session: ${session.session_id} for firm: ${firmId}`);
      return { success: true, data: session };
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update session status and metadata
   */
  async updateSession(
    sessionId: string, 
    updates: WhatsAppSessionUpdate
  ): AsyncResult<WhatsAppSession> {
    try {
      const updateData = {
        ...updates,
        last_ping: new Date().toISOString()
      };

      const { data: session, error } = await this.supabase
        .from('whatsapp_sessions')
        .update(updateData)
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update session:', error);
        return { success: false, error: new Error(error.message) };
      }

      console.log(`🔄 Updated session: ${sessionId} with status: ${updates.status}`);
      return { success: true, data: session };
    } catch (error) {
      console.error('❌ Error updating session:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Clean up old or expired sessions for a firm
   */
  async cleanupOldSessions(firmId: string, keepMostRecent = true): AsyncResult<number> {
    try {
      let query = this.supabase.from('whatsapp_sessions');

      if (keepMostRecent) {
        // Get all sessions except the most recent one
        const { data: sessions, error: fetchError } = await this.supabase
          .from('whatsapp_sessions')
          .select('id')
          .eq('firm_id', firmId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          return { success: false, error: new Error(fetchError.message) };
        }

        if (sessions.length <= 1) {
          return { success: true, data: 0 }; // No cleanup needed
        }

        // Delete all except the first (most recent)
        const idsToDelete = sessions.slice(1).map(s => s.id);
        const { error } = await this.supabase
          .from('whatsapp_sessions')
          .delete()
          .in('id', idsToDelete);

        if (error) {
          return { success: false, error: new Error(error.message) };
        }

        console.log(`🧹 Cleaned up ${idsToDelete.length} old sessions for firm: ${firmId}`);
        return { success: true, data: idsToDelete.length };
      } else {
        // Clean up expired/error sessions older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: deletedSessions, error } = await this.supabase
          .from('whatsapp_sessions')
          .delete()
          .eq('firm_id', firmId)
          .or(`status.eq.expired,status.eq.error,updated_at.lt.${oneHourAgo}`)
          .select();

        if (error) {
          return { success: false, error: new Error(error.message) };
        }

        console.log(`🧹 Cleaned up ${deletedSessions?.length || 0} expired sessions for firm: ${firmId}`);
        return { success: true, data: deletedSessions?.length || 0 };
      }
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): AsyncResult<boolean> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Failed to delete session:', error);
        return { success: false, error: new Error(error.message) };
      }

      console.log(`🗑️ Deleted session: ${sessionId}`);
      return { success: true, data: true };
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Check if a session is expired based on last activity
   */
  isSessionExpired(session: WhatsAppSession, maxAge = WHATSAPP_CONFIG.LIMITS.MAX_CONNECTING_TIME): boolean {
    const lastActivity = new Date(session.updated_at || session.created_at);
    const age = Date.now() - lastActivity.getTime();
    return age > maxAge;
  }

  /**
   * Validate session status for operations
   */
  canSendMessages(session: WhatsAppSession): boolean {
    return session.status === WHATSAPP_CONFIG.STATUS.CONNECTED;
  }

  /**
   * Generate a unique session ID for a firm
   */
  generateSessionId(firmId: string): string {
    return `firm_${firmId}_${Date.now()}`;
  }

  /**
   * Get session age in seconds
   */
  getSessionAge(session: WhatsAppSession): number {
    const created = new Date(session.created_at);
    return Math.floor((Date.now() - created.getTime()) / 1000);
  }
}