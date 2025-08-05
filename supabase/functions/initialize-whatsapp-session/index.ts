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
    // Get user's JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user's firm ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.current_firm_id) {
      throw new Error('User has no firm assigned');
    }

    const firmId = profile.current_firm_id;
    console.log('🏢 Initializing WhatsApp session for firm:', firmId);

    // CRITICAL FIX: ONE SESSION PER FIRM - Check for existing session first
    const { data: existingSessions, error: checkError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });

    if (!checkError && existingSessions && existingSessions.length > 0) {
      const existingSession = existingSessions[0];
      console.log(`♻️ Found existing session: ${existingSession.session_id} (status: ${existingSession.status})`);
      
      // Only reuse if the session is in a valid state
      if (['connected', 'connecting', 'qr_ready'].includes(existingSession.status)) {
        console.log(`✅ Reusing existing session: ${existingSession.session_id}`);
        
        // Update last_ping to keep it active
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            last_ping: new Date().toISOString(),
            status: existingSession.status === 'connected' ? 'connected' : 'connecting'
          })
          .eq('id', existingSession.id);

        const BACKEND_URL = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-fcx5.onrender.com';
        
        // Try to restore backend session
        try {
          const response = await fetch(`${BACKEND_URL}/api/whatsapp/initialize`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: existingSession.session_id,
              firm_id: firmId
            })
          });
          
          if (response.ok) {
            console.log('✅ Railway session restored');
            return new Response(JSON.stringify({
              session_id: existingSession.session_id,
              status: 'connecting',
              firm_id: firmId,
              railway_status: 'restored',
              message: 'Existing session restored successfully'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          } catch (error) {
            console.log('⚠️ Failed to restore backend session, will create new one');
          }
      }
      
      // Clean up old/invalid sessions
      console.log(`🧹 Cleaning up old/invalid sessions for firm ${firmId}`);
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('firm_id', firmId);
    }

    const BACKEND_URL = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-fcx5.onrender.com';

    console.log('🔗 Using Backend URL:', BACKEND_URL);

    // Generate our own session ID for the database
    const sessionId = `firm_${firmId}_${Date.now()}`;
    console.log('🆕 Creating session:', sessionId);
    
    // Create new session in database first
    const { data: newSession, error: createError } = await supabase
      .from('whatsapp_sessions')
      .insert({
        firm_id: firmId,
        session_id: sessionId,
        status: 'connecting',
        last_ping: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create session:', createError);
      throw new Error(`Database error: ${createError.message}`);
    }

    console.log('✅ Database session created successfully');

    // Try to initialize on backend, but don't fail if it's down
    let backendStatus = 'backend_unavailable';
    try {
      console.log('🚀 Attempting backend initialization...');
      
      // First try health check
      const healthController = new AbortController();
      const healthTimeoutId = setTimeout(() => healthController.abort(), 5000);
      
      const healthResponse = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: healthController.signal
      });
      
      clearTimeout(healthTimeoutId);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Backend health check passed:', healthData);
        
        // Now try initialization
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${BACKEND_URL}/api/whatsapp/initialize`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: sessionId,
            firm_id: firmId
          })
        });
        
        console.log('📤 Sent to Backend:', { session_id: sessionId, firm_id: firmId });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const backendData = await response.json();
          console.log('✅ Backend session initialized:', backendData);
          backendStatus = 'initialized';
        } else {
          const errorText = await response.text();
          console.log('⚠️ Backend initialization failed:', response.status, response.statusText, errorText);
          backendStatus = 'init_failed';
        }
      } else {
        console.log('⚠️ Backend health check failed:', healthResponse.status, healthResponse.statusText);
        backendStatus = 'health_failed';
      }
    } catch (error) {
      console.log('⚠️ Backend error:', error.message);
      backendStatus = 'unreachable';
    }

    const responseData = {
      session_id: sessionId,
      status: 'connecting',
      firm_id: firmId,
      backend_status: backendStatus,
      message: 'Session initialized successfully'
    };

    console.log('📤 Session initialization response:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error initializing WhatsApp session:', error);
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