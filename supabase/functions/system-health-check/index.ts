import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RAILWAY_WHATSAPP_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 System Health Check - Starting comprehensive check');
    
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    // Check database connectivity
    const dbResult = await checkDatabase();
    results.push(dbResult);

    // Check WhatsApp backend
    const whatsappResult = await checkWhatsAppBackend();
    results.push(whatsappResult);

    // Check Google Sheets integration (sample check)
    const sheetsResult = await checkGoogleSheets();
    results.push(sheetsResult);

    // Check Edge Functions
    const edgeFunctionsResult = await checkEdgeFunctions();
    results.push(edgeFunctionsResult);

    // Determine overall system health
    const overallStatus = determineOverallHealth(results);
    const totalTime = Date.now() - startTime;

    const healthReport = {
      overall: overallStatus,
      totalCheckTime: totalTime,
      timestamp: new Date().toISOString(),
      services: results,
      summary: {
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length,
        total: results.length
      }
    };

    console.log('✅ Health check completed:', healthReport.summary);

    return new Response(
      JSON.stringify(healthReport, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return new Response(
      JSON.stringify({
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Test basic database connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      };
    }

    // Check if response time is acceptable (< 1000ms)
    const status = responseTime < 1000 ? 'healthy' : 'degraded';

    return {
      service: 'database',
      status,
      responseTime,
      details: { 
        connectionTest: 'passed',
        performanceThreshold: responseTime < 1000 ? 'good' : 'slow'
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
}

async function checkWhatsAppBackend(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    if (!RAILWAY_WHATSAPP_URL) {
      return {
        service: 'whatsapp_backend',
        status: 'unhealthy',
        responseTime: 0,
        details: { error: 'WhatsApp backend URL not configured' },
        timestamp: new Date().toISOString()
      };
    }

    const response = await fetch(`${RAILWAY_WHATSAPP_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        service: 'whatsapp_backend',
        status: 'unhealthy',
        responseTime,
        details: { 
          error: `HTTP ${response.status}`,
          statusText: response.statusText 
        },
        timestamp: new Date().toISOString()
      };
    }

    const data = await response.json();
    const status = responseTime < 2000 ? 'healthy' : 'degraded';

    return {
      service: 'whatsapp_backend',
      status,
      responseTime,
      details: { 
        backendResponse: data,
        performanceThreshold: responseTime < 2000 ? 'good' : 'slow'
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      service: 'whatsapp_backend',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
}

async function checkGoogleSheets(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if Google Sheets credentials are configured
    const googleCredentials = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    
    if (!googleCredentials) {
      return {
        service: 'google_sheets',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        details: { warning: 'Google Sheets credentials not configured' },
        timestamp: new Date().toISOString()
      };
    }

    // Test if credentials are valid JSON
    try {
      JSON.parse(googleCredentials);
    } catch {
      return {
        service: 'google_sheets',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: 'Invalid Google Sheets credentials format' },
        timestamp: new Date().toISOString()
      };
    }

    return {
      service: 'google_sheets',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: { credentialsConfigured: true },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      service: 'google_sheets',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
}

async function checkEdgeFunctions(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // This is a self-check since we're running as an edge function
    return {
      service: 'edge_functions',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: { 
        selfCheck: 'passed',
        runtime: 'deno',
        region: Deno.env.get('DENO_REGION') || 'unknown'
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      service: 'edge_functions',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
}

function determineOverallHealth(results: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
  const degradedCount = results.filter(r => r.status === 'degraded').length;

  if (unhealthyCount > 0) {
    return 'unhealthy';
  }
  
  if (degradedCount > 0) {
    return 'degraded';
  }
  
  return 'healthy';
}