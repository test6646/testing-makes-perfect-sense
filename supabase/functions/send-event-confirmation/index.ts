import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const formatPhoneNumber = (phone: string): string => {
  let cleanNumber = phone.replace(/\D/g, '');
  
  if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
    return `+${cleanNumber}`;
  }
  
  if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  if (cleanNumber.length === 10) {
    return `+91${cleanNumber}`;
  }
  
  if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
    return `+${cleanNumber}`;
  }
  
  if (cleanNumber.length > 10) {
    const lastTenDigits = cleanNumber.slice(-10);
    return `+91${lastTenDigits}`;
  }
  
  return `+91${cleanNumber}`;
};

interface EventConfirmationData {
  clientName: string;
  clientPhone: string;
  eventName: string;
  eventDate: string;
  venue: string;
  totalAmount: number;
  firmId: string;
  totalDays?: number;
  eventEndDate?: string;
  isUpdate?: boolean;
  updatedFields?: string[];
}

const formatEventDateRange = (eventDate: string, totalDays: number = 1, eventEndDate?: string | null): string => {
  const startDate = new Date(eventDate);
  
  if (totalDays > 1) {
    const endDate = eventEndDate ? 
      new Date(eventEndDate) : 
      new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);
    return `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`;
  }
  
  return startDate.toLocaleDateString('en-GB');
};

const formatEventConfirmationMessage = async (data: EventConfirmationData): Promise<string> => {
  const dateFormatted = formatEventDateRange(data.eventDate, data.totalDays, data.eventEndDate);

  // Get notification template settings from database
  const { data: sessionData } = await supabase
    .from('wa_sessions')
    .select('firm_name, firm_tagline, contact_info, footer_signature, notification_templates')
    .eq('firm_id', data.firmId)
    .single();

  const firmName = sessionData?.firm_name || 'Studio';
  const firmTagline = sessionData?.firm_tagline || 'Professional Services';
  const contactInfo = sessionData?.contact_info || 'Thank you for choosing us';
  
  // Use different template based on whether it's an update or confirmation
  const templateKey = data.isUpdate ? 'event_update' : 'event_confirmation';
  const defaultTemplate = data.isUpdate 
    ? {
        title: 'EVENT UPDATED',
        greeting: 'Dear *{clientName}*,',
        content: 'Your event details have been updated:'
      }
    : {
        title: 'EVENT CONFIRMED',
        greeting: 'Dear *{clientName}*,',
        content: 'Your event has been successfully confirmed:'
      };
  
  const template = sessionData?.notification_templates?.[templateKey] || defaultTemplate;

  let messageContent = `*${template.title}*

${template.greeting.replace('{clientName}', data.clientName)}

${template.content}

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue || '~'}`;

  // Only show amount for confirmations, not updates
  if (!data.isUpdate) {
    messageContent += `\n*Amount:* ₹${data.totalAmount.toLocaleString()}`;
  }

  // Add updated fields info for updates
  if (data.isUpdate && data.updatedFields && data.updatedFields.length > 0) {
    messageContent += `\n*Updated:* ${data.updatedFields.join(', ')}`;
  }

  messageContent += `

Thank you for choosing *${firmName}*
_${firmTagline}_
${contactInfo}`;

  return messageContent;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EventConfirmationData = await req.json();
    console.log('🔍 Event confirmation request:', { 
      clientName: requestData.clientName, 
      firmId: requestData.firmId,
      hasPhone: !!requestData.clientPhone
    });

    const backendUrl = Deno.env.get('BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    console.log('🔍 Backend URL:', backendUrl);
    
    // Validate backend URL is configured
    if (!backendUrl) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    const whatsappMessage = await formatEventConfirmationMessage(requestData);
    console.log('📝 Message formatted, length:', whatsappMessage.length);

    const formattedPhone = formatPhoneNumber(requestData.clientPhone);
    console.log('📞 Formatted phone:', formattedPhone);

    console.log('🚀 Sending to WhatsApp API...');
    const whatsappResponse = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firmId: requestData.firmId,
        number: formattedPhone,
        message: whatsappMessage,
      }),
    });

    console.log('📡 WhatsApp response status:', whatsappResponse.status);
    const whatsappResult = await whatsappResponse.json();
    console.log('📡 WhatsApp result:', whatsappResult);

    if (!whatsappResponse.ok || !whatsappResult.success) {
      const errorMsg = whatsappResult.message || `HTTP ${whatsappResponse.status}: Failed to send WhatsApp message`;
      console.error('❌ WhatsApp error:', errorMsg);
      throw new Error(errorMsg);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event confirmation sent successfully',
        whatsappResult: whatsappResult.message
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Event confirmation error:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
