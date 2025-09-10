import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dashboard IDs mapping
const METABASE_DASHBOARDS = {
  financeiro: 52,
  pedagogico: 131,
  agenda: 12278,
  secretaria: 43
} as const;

type DashboardType = keyof typeof METABASE_DASHBOARDS;

const METABASE_SITE_URL = "https://graficos.proesc.com";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dashboardType, proescId } = await req.json();

    if (!dashboardType || !proescId) {
      return new Response(
        JSON.stringify({ error: 'dashboardType and proescId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!(dashboardType in METABASE_DASHBOARDS)) {
      return new Response(
        JSON.stringify({ error: 'Invalid dashboard type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metabaseSecretKey = Deno.env.get('METABASE_TOKEN');
    if (!metabaseSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Metabase token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dashboardId = METABASE_DASHBOARDS[dashboardType as DashboardType];
    
    // Create JWT payload
    const payload = {
      resource: { dashboard: dashboardId },
      params: {
        "entidade_id": [proescId]
      },
      exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 minute expiration
    };

    // Generate JWT token
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(metabaseSecretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      payload,
      cryptoKey
    );

    // Generate iframe URL
    const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;

    console.log(`Generated Metabase embed URL for ${dashboardType} (ID: ${dashboardId}) with proesc_id: ${proescId}`);

    return new Response(
      JSON.stringify({ 
        iframeUrl,
        dashboardId,
        expiresIn: 600 // 10 minutes
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in metabase-embed-token function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});