/**
 * WhatsApp Message Sender
 * Sends WhatsApp messages via the backend service
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firmId, phone, message } = await req.json();
    
    console.log('📥 WhatsApp message request:', {
      firmId: firmId,
      phone: phone,
      message: message ? message.substring(0, 50) + '...' : 'undefined'
    });

    if (!firmId || !phone || !message) {
      throw new Error('Missing required fields: firmId, phone, message');
    }

    // Get active session for firm - use enhanced query to get most recent connected session
    console.log('🔍 Fetching WhatsApp session for firm:', firmId);
    const { data: sessions, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('session_id, status, created_at')
      .eq('firm_id', firmId)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('📋 Session query result:', { sessions, sessionError });

    if (sessionError) {
      console.error('❌ Database error:', sessionError);
      throw new Error('Database error: ' + sessionError.message);
    }

    if (!sessions || sessions.length === 0) {
      console.log('⚠️ No connected session found');
      throw new Error('No connected WhatsApp session found. Please connect WhatsApp first.');
    }

    const session = sessions[0];
    console.log('✅ Using WhatsApp session:', session.session_id);

    // ✅ CRITICAL: Validate session with backend before sending message
    const backendUrl = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-fcx5.onrender.com';
    
    console.log('🔍 Validating session with backend...');
    try {
      const statusResponse = await fetch(`${backendUrl}/api/whatsapp/status/${session.session_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (!statusResponse.ok) {
        console.error('❌ Session validation failed:', statusResponse.status);
        
        // Mark session as disconnected in database
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('session_id', session.session_id);

        throw new Error('WhatsApp session has expired. Please reconnect WhatsApp first.');
      }

      const statusData = await statusResponse.json();
      console.log('✅ Session validation result:', statusData);

      if (statusData.status !== 'connected' && !statusData.ready) {
        console.error('❌ Backend session not ready:', statusData);
        
        // Update database status to match backend
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('session_id', session.session_id);

        throw new Error('WhatsApp session is not ready. Please reconnect WhatsApp first.');
      }

    } catch (validationError) {
      console.error('❌ Session validation error:', validationError);
      
      // If it's a network error, still try to send (backend might be slow)
      if (!validationError.message.includes('expired') && !validationError.message.includes('not ready')) {
        console.log('⚠️ Session validation failed due to network, proceeding anyway...');
      } else {
        throw validationError;
      }
    }

    // Format phone number (remove + if present, ensure proper format)
    const formattedPhone = phone.replace(/^\+/, '');
    
    console.log('📤 Sending WhatsApp message via backend:', backendUrl);
    console.log('📋 Message payload:', {
      sessionId: session.session_id,
      phone: formattedPhone,
      message: message.substring(0, 100) + '...' // Show first 100 chars
    });
    
    const response = await fetch(`${backendUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        session_id: session.session_id,
        phone: formattedPhone,
        message: message
      })
    });

    console.log('🔍 Backend response status:', response.status);
    console.log('🔍 Backend response headers:', Object.fromEntries(response.headers.entries()));

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('❌ Failed to parse backend response as JSON:', jsonError);
      const text = await response.text();
      console.log('📄 Raw response text:', text);
      return new Response(
        JSON.stringify({ error: 'Invalid response from WhatsApp service', details: text }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Backend response data:', result);

    if (!response.ok) {
      console.error('❌ Failed to send WhatsApp message:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ WhatsApp message sent successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp message sent successfully',
      result: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ WhatsApp message error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});