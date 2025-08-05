/**
 * Simple WhatsApp Messaging Service
 * Clean, focused messaging for task notifications
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
    const { phone, message, firmId, action = 'send' } = await req.json();
    
    console.log('📥 WhatsApp message request:', {
      phone: phone,
      message: message ? message.substring(0, 50) + '...' : 'undefined',
      firmId: firmId,
      action: action
    });

    if (!phone || !message || !firmId) {
      throw new Error('Phone, message, and firmId are required');
    }

    // Get active session for firm
    const { data: sessions, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('session_id, status')
      .eq('firm_id', firmId)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessionError) {
      throw new Error('Database error: ' + sessionError.message);
    }

    if (!sessions || sessions.length === 0) {
      throw new Error('No connected WhatsApp session found. Please connect WhatsApp first.');
    }

    const session = sessions[0];
    console.log('✅ Using WhatsApp session:', session.session_id);

    // ✅ CRITICAL: Validate session with backend before sending message
    console.log('🔍 Validating session with backend...');
    try {
      const statusResponse = await fetch(`${BACKEND_URL}/api/whatsapp/status/${session.session_id}`, {
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

    // Format phone number (remove + if present)
    const formattedPhone = phone.replace(/^\+/, '');
    
    // Send message to backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_URL}/send-message`, {
        method: 'POST',
        signal: controller.signal,
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

      clearTimeout(timeoutId);

      console.log('🔍 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error:', errorText);
        throw new Error(`Backend service error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Message sent successfully:', result);

      return new Response(JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        result: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ Network error:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - backend is slow');
      }
      throw new Error('Failed to connect to WhatsApp backend: ' + fetchError.message);
    }

  } catch (error) {
    console.error('❌ WhatsApp messaging error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});