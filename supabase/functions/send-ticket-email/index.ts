import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ 
      error: "Função temporariamente desabilitada",
      message: "Por favor, use a integração Zendesk para tickets"
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
};

serve(handler);
