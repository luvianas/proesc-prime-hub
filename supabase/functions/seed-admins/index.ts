// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // Check caller auth and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await anon.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callerId = userData.user.id;
    const { data: callerProfile } = await service
      .from("profiles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admins = [
      { email: "lucasviana@proesc.com", password: "proesc123", name: "Lucas Viana" },
      { email: "marcos.souza@proesc.com", password: "proesc123", name: "Marcos Souza" },
    ];

    async function findUserByEmail(email: string) {
      let page = 1;
      const perPage = 200;
      while (page <= 10) {
        const { data, error } = await service.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const found = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return found;
        if (data.users.length < perPage) break;
        page++;
      }
      return null;
    }

    const results: any[] = [];

    for (const a of admins) {
      let user = await findUserByEmail(a.email);
      if (!user) {
        const { data, error } = await service.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
        });
        if (error) throw error;
        user = data.user;
      } else {
        await service.auth.admin.updateUserById(user.id, { password: a.password });
      }

      // Upsert profile with admin role
      await service.from("profiles").upsert({
        user_id: user.id,
        email: a.email,
        name: a.name,
        role: "admin",
        is_active: true,
      }, { onConflict: "user_id" as any });

      results.push({ email: a.email, id: user.id });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
