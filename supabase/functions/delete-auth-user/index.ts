// Supabase Edge Function: delete-auth-user
// Deletes a user from Supabase Auth using the service role key.
// Only allows requests from authenticated admins.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://yzlbtfhjohjhnqjbtmjn.supabase.co";
// Public anon key is safe to embed; used only to validate caller's session
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bGJ0Zmhqb2hqaG5xamJ0bWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjI4MzgsImV4cCI6MjA2OTk5ODgzOH0.wfdPLyebymkk34wW6GVm-fzq9zLO9-4xJQDSf3zEnTY";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service role key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization") || "";

    // Validate caller session and role using anon client with the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdminData, error: isAdminError } = await supabase.rpc("is_admin");
    if (isAdminError) {
      return new Response(JSON.stringify({ error: isAdminError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "User not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user_id } = await req.json().catch(() => ({ user_id: undefined }));
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
