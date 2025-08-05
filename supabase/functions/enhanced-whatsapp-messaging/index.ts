import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { WhatsAppErrorHandler } from '../_shared/whatsapp-error-handler.ts';

const RAILWAY_WHATSAPP_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WhatsAppMessageRequest {
  firmId: string;
  recipient: string;
  message: string;
  messageType?: 'task' | 'notification' | 'reminder' | 'alert';
  metadata?: Record<string, any>;
}

interface WhatsAppSession {
  session_id: string;
  status: string;
  firm_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced WhatsApp Messaging - Processing request');

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { firmId, recipient, message, messageType = 'notification', metadata }: WhatsAppMessageRequest = await req.json();

    // Validate required fields
    if (!firmId || !recipient || !message) {
      throw new Error('Missing required fields: firmId, recipient, message');
    }

    // Clean phone number
    const cleanPhone = recipient.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Invalid phone number format');
    }

    console.log(`📱 Sending ${messageType} to ${cleanPhone} for firm ${firmId}`);

    // Get active WhatsApp session for the firm
    const { data: sessions, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('session_id, status, firm_id')
      .eq('firm_id', firmId)
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1);

    if (sessionError) {
      console.error('❌ Session query error:', sessionError);
      throw WhatsAppErrorHandler.handleDatabaseError(sessionError, 'session_lookup').body;
    }

    if (!sessions || sessions.length === 0) {
      console.log('⚠️ No active WhatsApp session found for firm:', firmId);
      
      // Log the failed attempt
      await logMessageAttempt(firmId, recipient, message, 'no_session', 'No active WhatsApp session');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active WhatsApp session found',
          suggestion: 'Please connect WhatsApp first'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = sessions[0];
    console.log(`📡 Using session: ${session.session_id}`);

    // ✅ CRITICAL: Validate session with backend before sending message
    console.log('🔍 Validating session with backend...');
    try {
      const statusResponse = await fetch(`${RAILWAY_WHATSAPP_URL}/api/whatsapp/status/${session.session_id}`, {
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

    // Prepare message with enhanced formatting
    const formattedMessage = formatMessage(message, messageType, metadata);

    // Send message via Railway backend
    const response = await fetch(`${RAILWAY_WHATSAPP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: session.session_id,
        phone: cleanPhone,
        message: formattedMessage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WhatsApp send failed:', errorText);
      
      // Log the failed attempt
      await logMessageAttempt(firmId, recipient, message, 'send_failed', errorText);
      
      throw new Error(`WhatsApp backend error: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Message sent successfully:', result);

    // Log successful message
    await logMessageAttempt(firmId, recipient, message, 'sent', 'Message sent successfully');

    // Update session last activity
    await supabase
      .from('whatsapp_sessions')
      .update({ 
        last_ping: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', session.session_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        session_id: session.session_id,
        recipient: cleanPhone,
        messageType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Enhanced WhatsApp messaging error:', error);
    
    const errorResponse = WhatsAppErrorHandler.createErrorResponse(error, 'enhanced_whatsapp_messaging');
    return new Response(
      JSON.stringify(errorResponse.body),
      { 
        status: errorResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Format message based on type and metadata
 */
function formatMessage(message: string, messageType: string, metadata?: Record<string, any>): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  let formattedMessage = '';
  
  switch (messageType) {
    case 'task':
      formattedMessage = `🔔 *Task Notification*\n\n${message}\n\n📅 ${timestamp}`;
      if (metadata?.dueDate) {
        formattedMessage += `\n⏰ Due: ${metadata.dueDate}`;
      }
      if (metadata?.priority) {
        formattedMessage += `\n🔥 Priority: ${metadata.priority}`;
      }
      break;
      
    case 'reminder':
      formattedMessage = `⏰ *Reminder*\n\n${message}\n\n📅 ${timestamp}`;
      break;
      
    case 'alert':
      formattedMessage = `🚨 *Alert*\n\n${message}\n\n📅 ${timestamp}`;
      break;
      
    default:
      formattedMessage = `📢 *Notification*\n\n${message}\n\n📅 ${timestamp}`;
  }
  
  // Add firm branding if available
  if (metadata?.firmName) {
    formattedMessage += `\n\n---\n${metadata.firmName}`;
  }
  
  return formattedMessage;
}

/**
 * Log message attempt for tracking and debugging
 */
async function logMessageAttempt(
  firmId: string, 
  recipient: string, 
  message: string, 
  status: string, 
  details?: string
): Promise<void> {
  try {
    const logEntry = {
      firm_id: firmId,
      recipient: recipient.replace(/\D/g, ''),
      message: message.substring(0, 500), // Truncate long messages
      status,
      details: details || '',
      timestamp: new Date().toISOString()
    };

    // In production, you might want to store this in a dedicated logs table
    console.log('📝 WhatsApp Message Log:', logEntry);
    
  } catch (logError) {
    console.error('❌ Failed to log message attempt:', logError);
  }
}