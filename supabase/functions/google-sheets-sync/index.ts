import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleSheetsCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

async function getAccessToken(credentials: GoogleSheetsCredentials) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/[+/=]/g, (match) => {
    return { '+': '-', '/': '_', '=': '' }[match] || match;
  });
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (match) => {
    return { '+': '-', '/': '_', '=': '' }[match] || match;
  });

  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    encoder.encode(credentials.private_key.replace(/\\n/g, '\n')),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[+/=]/g, (match) => {
      return { '+': '-', '/': '_', '=': '' }[match] || match;
    });

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      'assertion': jwt
    })
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function createSpreadsheet(accessToken: string, firmName: string) {
  const spreadsheetData = {
    properties: {
      title: `${firmName} - Photography Management`,
      locale: 'en_US',
      timeZone: 'Asia/Kolkata'
    },
    sheets: [
      {
        properties: {
          title: 'Events',
          gridProperties: { rowCount: 1000, columnCount: 15 }
        }
      },
      {
        properties: {
          title: 'Clients',
          gridProperties: { rowCount: 1000, columnCount: 8 }
        }
      },
      {
        properties: {
          title: 'Payments',
          gridProperties: { rowCount: 1000, columnCount: 10 }
        }
      },
      {
        properties: {
          title: 'Tasks',
          gridProperties: { rowCount: 1000, columnCount: 12 }
        }
      },
      {
        properties: {
          title: 'Expenses',
          gridProperties: { rowCount: 1000, columnCount: 10 }
        }
      }
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

  const spreadsheet = await response.json();
  
  // Add headers to each sheet
  const sheets = [
    {
      name: 'Events',
      headers: ['Sr.', 'Client Name', 'Event Title', 'Event Type', 'Event Date', 'Venue', 'Total Amount', 'Advance', 'Balance', 'Status', 'Photographer', 'Videographer', 'Created Date']
    },
    {
      name: 'Clients',
      headers: ['Sr.', 'Name', 'Phone', 'Email', 'Address', 'Notes', 'Created Date', 'Events Count']
    },
    {
      name: 'Payments',
      headers: ['Sr.', 'Event', 'Client', 'Amount', 'Payment Method', 'Payment Date', 'Reference', 'Notes', 'Created Date']
    },
    {
      name: 'Tasks',
      headers: ['Sr.', 'Event', 'Title', 'Type', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Created Date', 'Completed Date']
    },
    {
      name: 'Expenses',
      headers: ['Sr.', 'Category', 'Amount', 'Description', 'Expense Date', 'Event', 'Receipt', 'Created Date']
    }
  ];

  for (const sheet of sheets) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}/values/${sheet.name}!A1:${String.fromCharCode(64 + sheet.headers.length)}1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [sheet.headers]
      })
    });
  }

  return spreadsheet;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { firmName, action = 'create', data } = await req.json()
    
    // Get Google credentials from secrets
    const googleCredentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT') ?? '{}') as GoogleSheetsCredentials;
    
    if (!googleCredentials.client_email) {
      throw new Error('Google service account credentials not configured')
    }

    const accessToken = await getAccessToken(googleCredentials);

    if (action === 'create') {
      // Create spreadsheet
      const spreadsheet = await createSpreadsheet(accessToken, firmName);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          spreadsheetId: spreadsheet.spreadsheetId,
          spreadsheetUrl: spreadsheet.spreadsheetUrl
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else if (action === 'sync') {
      // Sync data to existing spreadsheet
      const { spreadsheetId, sheetName, values } = data;
      
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:Z?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})