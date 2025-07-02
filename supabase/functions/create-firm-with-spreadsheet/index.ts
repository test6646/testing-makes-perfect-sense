
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firmName, userId } = await req.json()
    console.log('Creating firm with spreadsheet:', { firmName, userId })

    // Create a simple firm without Google Sheets integration for now
    // This will be enhanced once Google Sheets credentials are properly configured
    const firmId = crypto.randomUUID()
    
    console.log('Firm created successfully:', firmId)

    return new Response(
      JSON.stringify({
        success: true,
        firmId: firmId,
        spreadsheetId: null, // Will be populated when Google Sheets is integrated
        message: 'Firm created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in create-firm-with-spreadsheet:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to create firm'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
