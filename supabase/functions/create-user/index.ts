// Supabase Edge Function: create-user
// Creates an auth user and corresponding profile, restricted to admins
// CORS enabled. Uses service role for privileged operations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Missing Supabase environment" }, { status: 500 });
  }

  let payload: {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "gestor";
    school_id?: string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password, role, school_id } = payload;

  if (!name || !email || !password || !role) {
    return jsonResponse({ error: "Missing required fields" }, { status: 400 });
  }
  if (role !== "admin" && role !== "gestor") {
    return jsonResponse({ error: "Invalid role" }, { status: 400 });
  }
  if (role === "gestor" && !school_id) {
    return jsonResponse({ error: "Gestor must be linked to a school" }, { status: 400 });
  }

  // Client with requester JWT to check admin
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: adminCheck, error: adminErr } = await supabaseUser.rpc("is_admin");
  if (adminErr) {
    console.error("Admin check error", adminErr);
    return jsonResponse({ error: "Unable to verify permissions" }, { status: 500 });
  }
  if (!adminCheck) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  // Service role client for privileged ops
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // Create auth user
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (createErr) {
    console.error("Create user error", createErr);
    return jsonResponse({ error: createErr.message }, { status: 400 });
  }

  const user = created.user;
  if (!user) {
    return jsonResponse({ error: "User creation failed" }, { status: 500 });
  }

  // Upsert profile with role and optional school
  const profile = {
    user_id: user.id,
    email,
    name,
    role,
    school_id: role === "gestor" ? school_id : null,
    is_active: true,
  } as const;

  const { error: upsertErr } = await supabaseAdmin
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select("user_id")
    .single();

  if (upsertErr) {
    console.error("Upsert profile error", upsertErr);
    return jsonResponse({ error: "Profile upsert failed" }, { status: 500 });
  }

  return jsonResponse({ success: true, user_id: user.id });
});
