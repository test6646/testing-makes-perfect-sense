import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BACKEND_URL = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-fcx5.onrender.com';

    console.log('🔍 Testing backend connectivity...');
    console.log('Backend URL:', BACKEND_URL);

    // Test health endpoint first
    try {
      const healthResponse = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Backend health check passed:', healthData);
      } else {
        console.log('⚠️ Backend health check failed:', healthResponse.status, healthResponse.statusText);
      }
    } catch (healthError) {
      console.error('❌ Backend health check error:', healthError);
    }

    // Test initialize endpoint
    try {
      const initResponse = await fetch(`${BACKEND_URL}/api/whatsapp/initialize`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (initResponse.ok) {
        const initData = await initResponse.json();
        console.log('✅ Backend initialize test passed:', initData);
        
        return new Response(JSON.stringify({
          success: true,
          backend_url: BACKEND_URL,
          health_status: 'ok',
          initialize_status: 'ok',
          session_id: initData.session_id,
          message: 'Backend is working correctly'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorText = await initResponse.text();
        console.log('❌ Backend initialize failed:', initResponse.status, initResponse.statusText, errorText);
        
        return new Response(JSON.stringify({
          success: false,
          backend_url: BACKEND_URL,
          error: `Initialize failed: ${initResponse.status} ${initResponse.statusText}`,
          details: errorText,
          message: 'Backend initialize endpoint failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (initError) {
      console.error('❌ Backend initialize error:', initError);
      
      return new Response(JSON.stringify({
        success: false,
        backend_url: BACKEND_URL,
        error: initError.message,
        message: 'Failed to connect to backend'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Test function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Test function failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});