import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firmName } = await req.json();
    
    if (!firmName || !firmName.trim()) {
      return new Response(
        JSON.stringify({ error: 'Firm name is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Create supabase client with service role for server operations
    const supabaseServiceUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseService = createClient(supabaseServiceUrl, supabaseServiceKey);
    
    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    console.log(`Creating firm "${firmName}" for user ${user.id}`);

    // Create Google Spreadsheet
    const spreadsheetData = await createGoogleSpreadsheet(firmName);
    
    // Create firm in database
    const { data: firm, error: firmError } = await supabaseService
      .from('firms')
      .insert({
        name: firmName.trim(),
        spreadsheet_id: spreadsheetData.spreadsheetId,
        created_by: user.id
      })
      .select()
      .single();

    if (firmError) {
      console.error('Error creating firm:', firmError);
      throw new Error(`Failed to create firm: ${firmError.message}`);
    }

    console.log(`Firm created successfully:`, firm);

    return new Response(
      JSON.stringify({ 
        success: true, 
        firm,
        spreadsheet: spreadsheetData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-firm-with-spreadsheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function createGoogleSpreadsheet(firmName: string) {
  console.log(`Creating Google Spreadsheet for firm: ${firmName}`);
  
  try {
    // Get Google service account credentials from environment
    const googleCredentialsEnv = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!googleCredentialsEnv) {
      console.log('Google credentials not found, using mock spreadsheet');
      return createMockSpreadsheet();
    }

    const credentials = JSON.parse(googleCredentialsEnv);
    const accessToken = await getGoogleAccessToken(credentials);
    
    // Create spreadsheet using Google Sheets API
    const spreadsheetData = {
      properties: {
        title: `${firmName} - Photography Management`,
        locale: 'en_US',
        timeZone: 'Asia/Kolkata'
      },
      sheets: [
        { properties: { title: 'Events', gridProperties: { rowCount: 1000, columnCount: 15 } } },
        { properties: { title: 'Clients', gridProperties: { rowCount: 1000, columnCount: 8 } } },
        { properties: { title: 'Payments', gridProperties: { rowCount: 1000, columnCount: 10 } } },
        { properties: { title: 'Tasks', gridProperties: { rowCount: 1000, columnCount: 12 } } },
        { properties: { title: 'Expenses', gridProperties: { rowCount: 1000, columnCount: 10 } } }
      ]
    };

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spreadsheetData)
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    const spreadsheet = await response.json();
    
    // Add headers to each sheet
    const sheets = [
      { name: 'Events', headers: ['Sr.', 'Client Name', 'Event Title', 'Event Type', 'Event Date', 'Venue', 'Total Amount', 'Advance', 'Balance', 'Status', 'Photographer', 'Videographer', 'Created Date'] },
      { name: 'Clients', headers: ['Sr.', 'Name', 'Phone', 'Email', 'Address', 'Notes', 'Created Date', 'Events Count'] },
      { name: 'Payments', headers: ['Sr.', 'Event', 'Client', 'Amount', 'Payment Method', 'Payment Date', 'Reference', 'Notes', 'Created Date'] },
      { name: 'Tasks', headers: ['Sr.', 'Event', 'Title', 'Type', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Created Date', 'Completed Date'] },
      { name: 'Expenses', headers: ['Sr.', 'Category', 'Amount', 'Description', 'Expense Date', 'Event', 'Receipt', 'Created Date'] }
    ];

    for (const sheet of sheets) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}/values/${sheet.name}!A1:${String.fromCharCode(64 + sheet.headers.length)}1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [sheet.headers] })
      });
    }

    console.log(`Real Google Spreadsheet created with ID: ${spreadsheet.spreadsheetId}`);
    
    return {
      spreadsheetId: spreadsheet.spreadsheetId,
      url: spreadsheet.spreadsheetUrl,
      sheets: sheets.map(s => s.name)
    };
    
  } catch (error) {
    console.error('Error creating Google Spreadsheet, falling back to mock:', error);
    return createMockSpreadsheet();
  }
}

function createMockSpreadsheet() {
  const mockSpreadsheetId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`Mock spreadsheet created with ID: ${mockSpreadsheetId}`);
  
  return {
    spreadsheetId: mockSpreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${mockSpreadsheetId}`,
    sheets: ['Events', 'Clients', 'Payments', 'Tasks', 'Expenses']
  };
}

async function getGoogleAccessToken(credentials: any) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/[+/=]/g, (match) => ({ '+': '-', '/': '_', '=': '' }[match] || match));
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (match) => ({ '+': '-', '/': '_', '=': '' }[match] || match));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    encoder.encode(credentials.private_key.replace(/\\n/g, '\n')),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/[+/=]/g, (match) => ({ '+': '-', '/': '_', '=': '' }[match] || match));
  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': jwt })
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}