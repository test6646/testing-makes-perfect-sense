/**
 * WhatsApp Session Health Check
 * Validates and syncs session status between database and backend
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
    console.log('🔍 Starting WhatsApp health check...');

    // Get all sessions marked as connected in database
    const { data: connectedSessions, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('status', 'connected');

    if (sessionError) {
      console.error('❌ Database error:', sessionError);
      throw new Error('Database error: ' + sessionError.message);
    }

    console.log(`📋 Found ${connectedSessions?.length || 0} connected sessions in database`);

    if (!connectedSessions || connectedSessions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No connected sessions to check',
        checked: 0,
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let checkedCount = 0;
    let updatedCount = 0;

    // Check each session with backend
    for (const session of connectedSessions) {
      try {
        console.log(`🔍 Checking session: ${session.session_id}`);
        checkedCount++;

        const statusResponse = await fetch(`${BACKEND_URL}/api/whatsapp/status/${session.session_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });

        if (!statusResponse.ok) {
          console.log(`❌ Session ${session.session_id} not found in backend, marking as disconnected`);
          
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('session_id', session.session_id);

          updatedCount++;
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`✅ Session ${session.session_id} backend status:`, statusData.status);

        // If backend shows disconnected but database shows connected, update database
        if (statusData.status !== 'connected' && !statusData.ready) {
          console.log(`🔄 Updating session ${session.session_id} status: connected -> disconnected`);
          
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('session_id', session.session_id);

          updatedCount++;
        } else {
          // Update last_ping to show session is healthy
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              last_ping: new Date().toISOString()
            })
            .eq('session_id', session.session_id);
        }

      } catch (error) {
        console.error(`❌ Error checking session ${session.session_id}:`, error);
        
        // If we can't reach backend, mark session as disconnected
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('session_id', session.session_id);

        updatedCount++;
      }
    }

    console.log(`✅ Health check complete. Checked: ${checkedCount}, Updated: ${updatedCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Health check completed',
      checked: checkedCount,
      updated: updatedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});