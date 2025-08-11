// Supabase Edge Function: reset-user-password
// Sets a user's password to the default and flags must_change_password=true
// Only accessible by authenticated admins

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://yzlbtfhjohjhnqjbtmjn.supabase.co";
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

    // Validate caller session/role
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

    const { user_id, new_password } = await req.json().catch(() => ({ user_id: undefined }));
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const passwordToSet = new_password || "proesc123";

    // Update auth password
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: passwordToSet,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Flag profile to force change on next login
    const { error: profErr } = await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("user_id", user_id);
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), {
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
