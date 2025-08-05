/**
 * ULTRA-RELIABLE WhatsApp Session Manager
 * ZERO POLLING - PURE REAL-TIME - PERSISTENT CONNECTIONS
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const BACKEND_URL = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-fcx5.onrender.com';

class WhatsAppSessionManager {
  /**
   * ✅ RELIABLE Backend Request - No Aggressive Timeouts
   */
  private async makeBackendRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${BACKEND_URL}${endpoint}`;
      console.log(`🌐 Backend request: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        console.error(`❌ Backend error ${response.status}`);
        return { success: false, error: `Backend error: ${response.status}` };
      }

      const data = await response.json();
      console.log(`✅ Backend response:`, data);
      return { success: true, data };

    } catch (error) {
      console.error(`❌ Backend request failed:`, error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * ✅ PERSISTENT Session Initialization
   */
  async initializeSession(firmId: string) {
    try {
      console.log(`🚀 Initializing PERSISTENT session for firm: ${firmId}`);

      // ✅ CRITICAL: NEVER delete existing connected sessions
      const { data: existingSessions } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('firm_id', firmId)
        .eq('status', 'connected');

      if (existingSessions && existingSessions.length > 0) {
        console.log('✅ PERSISTENT Connected session found - maintaining connection');
        return {
          success: true,
          session_id: existingSessions[0].session_id,
          status: 'connected',
          message: 'Using persistent connected session'
        };
      }

      // Only clean up truly old disconnected sessions (24+ hours old)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('firm_id', firmId)
        .eq('status', 'disconnected')
        .lt('updated_at', oneDayAgo);

      // Generate new session ID
      const sessionId = `firm_${firmId}_${Date.now()}`;
      
      // Create database session
      const { error: dbError } = await supabase
        .from('whatsapp_sessions')
        .insert({
          firm_id: firmId,
          session_id: sessionId,
          status: 'connecting',
          last_ping: new Date().toISOString()
        });

      if (dbError) {
        console.error('❌ Database session creation failed:', dbError);
        return { success: false, error: 'Failed to create session' };
      }

      console.log('✅ Database session created');

      // Initialize with backend (no timeout pressure)
      const backendResult = await this.makeBackendRequest('/api/whatsapp/initialize', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          firm_id: firmId
        })
      });

      if (backendResult.success) {
        console.log('✅ Backend initialization successful');
      } else {
        console.log('⚠️ Backend initialization failed, session still created');
      }

      return {
        success: true,
        session_id: sessionId,
        status: 'connecting',
        message: 'Session initialized successfully'
      };

    } catch (error) {
      console.error('❌ Initialize session error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ ENHANCED Status Check with Health Validation
   */
  async getSessionStatus(firmId: string) {
    try {
      console.log(`🔍 Getting session status with health check for firm: ${firmId}`);

      // Get latest session from database
      const { data: dbSession } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!dbSession) {
        console.log('📋 No session found');
        return {
          status: 'disconnected',
          ready: false,
          qr_available: false
        };
      }

      console.log(`📋 Found session: ${dbSession.session_id} (status: ${dbSession.status})`);

      // ✅ ENHANCED: Always validate connected sessions with backend
      if (dbSession.status === 'connected') {
        console.log('🔍 Validating connected session with backend...');
        const backendResult = await this.makeBackendRequest(`/api/whatsapp/status/${dbSession.session_id}`);
        
        if (!backendResult.success || !backendResult.data) {
          console.log('❌ Backend validation failed, marking session as disconnected');
          
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('session_id', dbSession.session_id);

          return {
            status: 'disconnected',
            ready: false,
            qr_available: false,
            message: 'Session expired, please reconnect'
          };
        }

        const backendData = backendResult.data;
        if (backendData.status !== 'connected' && !backendData.ready) {
          console.log(`❌ Backend shows session not connected: ${backendData.status}`);
          
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('session_id', dbSession.session_id);

          return {
            status: 'disconnected',
            ready: false,
            qr_available: false,
            message: 'Session lost connection, please reconnect'
          };
        }

        // Update last_ping for healthy session
        await supabase
          .from('whatsapp_sessions')
          .update({ last_ping: new Date().toISOString() })
          .eq('session_id', dbSession.session_id);

        console.log('✅ Connected session validated and healthy');
      }

      // Check backend for status updates on pending sessions
      if (['connecting', 'qr_ready'].includes(dbSession.status)) {
        const backendResult = await this.makeBackendRequest(`/api/whatsapp/status/${dbSession.session_id}`);
        
        if (backendResult.success && backendResult.data) {
          const backendData = backendResult.data;
          console.log(`✅ Backend status: ${backendData.status}`);

          let newStatus = dbSession.status;
          let updateData: any = {
            last_ping: new Date().toISOString()
          };

          // Update based on backend status
          if (backendData.status === 'qr_ready' && backendData.qr_code) {
            newStatus = 'qr_ready';
            updateData.qr_code = backendData.qr_code;
          } else if (backendData.status === 'connected' || backendData.ready === true) {
            newStatus = 'connected';
            updateData.connected_at = backendData.created_at || new Date().toISOString();
          }

          // ✅ ONLY update if there's actual progress
          if (newStatus !== dbSession.status || updateData.qr_code !== dbSession.qr_code) {
            updateData.status = newStatus;
            
            await supabase
              .from('whatsapp_sessions')
              .update(updateData)
              .eq('session_id', dbSession.session_id);

            console.log(`🔄 Updated status: ${dbSession.status} -> ${newStatus}`);

            return {
              status: newStatus,
              ready: newStatus === 'connected',
              qr_available: newStatus === 'qr_ready' && !!updateData.qr_code,
              qr_code: updateData.qr_code || dbSession.qr_code,
              session_id: dbSession.session_id,
              connected_at: updateData.connected_at || dbSession.connected_at
            };
          }
        }
      }

      return {
        status: dbSession.status,
        ready: dbSession.status === 'connected',
        qr_available: dbSession.status === 'qr_ready' && !!dbSession.qr_code,
        qr_code: dbSession.qr_code,
        session_id: dbSession.session_id,
        connected_at: dbSession.connected_at
      };

    } catch (error) {
      console.error('❌ Get session status error:', error);
      return {
        status: 'error',
        ready: false,
        qr_available: false
      };
    }
  }

  /**
   * ✅ MANUAL Disconnect Only
   */
  async disconnectSession(firmId: string) {
    try {
      console.log(`🔌 MANUALLY disconnecting session for firm: ${firmId}`);

      // Get current session
      const { data: dbSession } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!dbSession) {
        return { success: true, message: 'No session to disconnect' };
      }

      // Call backend to disconnect
      await this.makeBackendRequest(`/api/whatsapp/disconnect/${dbSession.session_id}`, {
        method: 'POST'
      });

      // Update database
      await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'disconnected',
          updated_at: new Date().toISOString(),
          last_ping: new Date().toISOString()
        })
        .eq('session_id', dbSession.session_id);

      console.log(`✅ Session ${dbSession.session_id} manually disconnected`);

      return {
        success: true,
        message: 'Session disconnected successfully',
        session_id: dbSession.session_id
      };

    } catch (error) {
      console.error('❌ Disconnect session error:', error);
      return { success: false, error: error.message };
    }
  }
}

const sessionManager = new WhatsAppSessionManager();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get firm ID
    let firmId: string | null = null;
    let action = 'status';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        firmId = body?.firmId;
        action = body?.action || 'status';
      } catch {
        // No body
      }
    }

    if (!firmId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_firm_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.current_firm_id) {
        throw new Error('User has no firm assigned');
      }

      firmId = profile.current_firm_id;
    }

    console.log(`📞 WhatsApp ${action} request for firm: ${firmId}`);

    // Route to appropriate handler
    switch (action) {
      case 'initialize': {
        const result = await sessionManager.initializeSession(firmId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        const result = await sessionManager.getSessionStatus(firmId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        const result = await sessionManager.disconnectSession(firmId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Session manager error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});