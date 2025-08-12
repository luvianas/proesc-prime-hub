// Supabase Edge Function: prime-metabase-insights
// Fetches data from Metabase (card query) and asks OpenAI to explain/interpret it.
// Configure the following secrets in your Supabase project:
// - METABASE_SITE_URL (e.g., https://metabase.yourdomain.com)
// - METABASE_API_KEY (Metabase API Key) or METABASE_SESSION (session token)
// - OPENAI_API_KEY (OpenAI key)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface RequestPayload {
  question: string;
  cardId?: number;
  params?: Record<string, unknown>;
  dashboardUrl?: string;
  locale?: string;
}

interface MetabaseResult {
  rows?: any[];
  cols?: { name: string }[];
  data?: {
    rows?: any[];
    cols?: { name: string }[];
    columns?: { name: string }[];
  };
}

const json = (body: any, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    },
    ...init,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { question, cardId, params, dashboardUrl, locale }: RequestPayload = await req.json();
    if (!question || typeof question !== "string") {
      return json({ error: "Missing 'question'" }, { status: 400 });
    }

    const METABASE_SITE_URL = Deno.env.get("METABASE_SITE_URL");
    const METABASE_API_KEY = Deno.env.get("METABASE_API_KEY");
    const METABASE_SESSION = Deno.env.get("METABASE_SESSION");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    let columns: string[] = [];
    let sampleRows: any[] = [];

    // Try to fetch Metabase data when cardId provided and Metabase is configured
    if (cardId && METABASE_SITE_URL && (METABASE_API_KEY || METABASE_SESSION)) {
      try {
        const url = `${METABASE_SITE_URL.replace(/\/$/, "")}/api/card/${cardId}/query`;
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (METABASE_API_KEY) headers["X-Metabase-Api-Key"] = METABASE_API_KEY;
        if (METABASE_SESSION) headers["X-Metabase-Session"] = METABASE_SESSION;

        const mbRes = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ parameters: params || {} }),
        });
        if (!mbRes.ok) {
          console.warn("Metabase query failed", await mbRes.text());
        } else {
          const data: MetabaseResult = await mbRes.json();
          const d = data.data || (data as any);
          const cols = d?.cols || d?.columns || [];
          const rows = d?.rows || [];
          columns = cols?.map((c: any) => c.name).filter(Boolean) || [];
          sampleRows = Array.isArray(rows) ? rows.slice(0, 50) : [];
        }
      } catch (e) {
        console.warn("Error querying Metabase:", e);
      }
    }

    // Build prompt for OpenAI
    const sys = [
      `Você é um analista de dados do Proesc Prime. Explique de forma clara, objetiva e em português.`,
      `Estruture a resposta com: Resumo executivo, Tendências, Anomalias/Riscos, Recomendações acionáveis.`,
      `Quando possível inclua números e percentuais. Seja conciso.`,
    ].join("\n");

    const contextParts: string[] = [];
    if (columns.length) contextParts.push(`Colunas: ${columns.join(", ")}`);
    if (sampleRows.length) contextParts.push(`Amostra de linhas (até 50): ${JSON.stringify(sampleRows)}`);
    if (dashboardUrl) contextParts.push(`URL do dashboard: ${dashboardUrl}`);

    const userMsg = [
      `Pergunta: ${question}`,
      contextParts.length ? `Contexto de dados:\n${contextParts.join("\n")}` : `Sem dados do Metabase disponíveis nesta requisição.`,
      locale ? `Locale: ${locale}` : '',
    ].filter(Boolean).join("\n\n");

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: "OpenAI error", details: t }, { status: 500 });
    }

    const aiJson = await aiRes.json();
    const answer: string = aiJson?.choices?.[0]?.message?.content || "";

    return json({
      answer,
      used: {
        columnsCount: columns.length,
        rowsCount: sampleRows.length,
        cardId: cardId || null,
        dashboardUrl: dashboardUrl || null,
      },
    });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
});
