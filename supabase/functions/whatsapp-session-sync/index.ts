/**
 * WhatsApp Session Sync
 * Periodic function to sync session status between database and backend
 * Ensures database status accurately reflects backend reality
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting WhatsApp session sync...');

    // Get all active sessions (not disconnected)
    const { data: activeSessions, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .neq('status', 'disconnected')
      .order('created_at', { ascending: false });

    if (sessionError) {
      console.error('❌ Database error:', sessionError);
      throw new Error('Database error: ' + sessionError.message);
    }

    console.log(`📋 Found ${activeSessions?.length || 0} active sessions to sync`);

    if (!activeSessions || activeSessions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active sessions to sync',
        synced: 0,
        errors: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let syncedCount = 0;
    let errorCount = 0;
    const syncResults = [];

    // Sync each session
    for (const session of activeSessions) {
      try {
        console.log(`🔍 Syncing session: ${session.session_id} (current: ${session.status})`);
        
        const statusResponse = await fetch(`${BACKEND_URL}/api/whatsapp/status/${session.session_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });

        let backendStatus = 'disconnected';
        let backendData = null;

        if (statusResponse.ok) {
          try {
            backendData = await statusResponse.json();
            backendStatus = backendData.status || 'disconnected';
            console.log(`✅ Backend status for ${session.session_id}: ${backendStatus}`);
          } catch (parseError) {
            console.error(`❌ Failed to parse status for ${session.session_id}:`, parseError);
            backendStatus = 'disconnected';
          }
        } else {
          console.log(`❌ Backend status check failed for ${session.session_id}: ${statusResponse.status}`);
          backendStatus = 'disconnected';
        }

        // Determine correct status based on backend response
        let correctStatus = 'disconnected';
        let updateData: any = {
          last_ping: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (backendData) {
          if (backendData.status === 'connected' || backendData.ready === true) {
            correctStatus = 'connected';
            if (backendData.created_at) {
              updateData.connected_at = backendData.created_at;
            }
          } else if (backendData.status === 'qr_ready' && backendData.qr_code) {
            correctStatus = 'qr_ready';
            updateData.qr_code = backendData.qr_code;
          } else if (backendData.status === 'connecting') {
            correctStatus = 'connecting';
          }
        }

        // Only update if status changed
        if (correctStatus !== session.status) {
          console.log(`🔄 Updating ${session.session_id}: ${session.status} -> ${correctStatus}`);
          
          updateData.status = correctStatus;
          
          await supabase
            .from('whatsapp_sessions')
            .update(updateData)
            .eq('session_id', session.session_id);

          syncResults.push({
            session_id: session.session_id,
            old_status: session.status,
            new_status: correctStatus,
            action: 'updated'
          });
        } else {
          // Just update last_ping to show it's healthy
          await supabase
            .from('whatsapp_sessions')
            .update({ last_ping: new Date().toISOString() })
            .eq('session_id', session.session_id);

          syncResults.push({
            session_id: session.session_id,
            status: correctStatus,
            action: 'pinged'
          });
        }

        syncedCount++;

      } catch (error) {
        console.error(`❌ Error syncing session ${session.session_id}:`, error);
        errorCount++;
        
        // On error, mark as disconnected to be safe
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('session_id', session.session_id);

        syncResults.push({
          session_id: session.session_id,
          old_status: session.status,
          new_status: 'disconnected',
          action: 'error_disconnect',
          error: error.message
        });
      }
    }

    console.log(`✅ Session sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Session sync completed',
      synced: syncedCount,
      errors: errorCount,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Session sync error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});