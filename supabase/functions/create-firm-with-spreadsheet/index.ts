
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firmName } = await req.json()
    console.log('Creating firm with spreadsheet:', { firmName })

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log('User authenticated:', user.id)

    // Create firm in database
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .insert({
        name: firmName,
        created_by: user.id,
        spreadsheet_id: null // Will be populated when Google Sheets is integrated
      })
      .select()
      .single()

    if (firmError) {
      console.error('Error creating firm:', firmError)
      throw firmError
    }

    console.log('Firm created:', firm)

    // Add user as admin member of the firm
    const { error: memberError } = await supabase
      .from('firm_members')
      .insert({
        firm_id: firm.id,
        user_id: user.id,
        role: 'Admin'
      })

    if (memberError) {
      console.error('Error adding user to firm:', memberError)
      throw memberError
    }

    // Update user profile with firm_id and current_firm_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        firm_id: firm.id,
        current_firm_id: firm.id
      })
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw profileError
    }

    console.log('Firm created successfully:', firm.id)

    return new Response(
      JSON.stringify({
        success: true,
        firm: firm,
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
