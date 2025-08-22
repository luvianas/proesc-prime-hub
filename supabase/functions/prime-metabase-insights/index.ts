// Supabase Edge Function: prime-metabase-insights
// Fetches data from Metabase (card query) and asks Google Gemini to explain/interpret it.
// Configure the following secrets in your Supabase project:
// - METABASE_SITE_URL (e.g., https://metabase.yourdomain.com)
// - METABASE_API_KEY (Metabase API Key) or METABASE_SESSION (session token)
// - GEMINI_API (Google Gemini API key)

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API");

    if (!GEMINI_API_KEY) {
      return json({ error: "GEMINI_API key not configured" }, { status: 500 });
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

    // Build prompt for Google Gemini
    const systemPrompt = [
      `Você é um analista de dados especializado do Proesc Prime, com expertise em análise educacional e gestão escolar.`,
      `Analise os dados apresentados e forneça insights valiosos estruturados em:`,
      `📊 **Resumo Executivo**: Principal conclusão em 1-2 frases`,
      `📈 **Tendências Identificadas**: Padrões e movimentos observados`,
      `⚠️ **Alertas e Anomalias**: Pontos de atenção e riscos`,
      `💡 **Recomendações Práticas**: 3-4 ações específicas e implementáveis`,
      `Use números, percentuais e seja objetivo. Responda sempre em português.`,
    ].join("\n");

    const contextParts: string[] = [];
    if (columns.length) contextParts.push(`📋 Colunas disponíveis: ${columns.join(", ")}`);
    if (sampleRows.length) contextParts.push(`📊 Dados (amostra): ${JSON.stringify(sampleRows)}`);
    if (dashboardUrl) contextParts.push(`🔗 Dashboard: ${dashboardUrl}`);

    const fullPrompt = [
      systemPrompt,
      `\n🔍 **Pergunta**: ${question}`,
      contextParts.length ? `\n📋 **Dados Disponíveis**:\n${contextParts.join("\n")}` : `\n⚠️ Sem dados do Metabase disponíveis para esta análise.`,
      locale ? `\n🌍 Idioma: ${locale}` : '',
    ].filter(Boolean).join("\n");

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("Gemini API error:", errorText);
      return json({ error: "Erro na API do Gemini", details: errorText }, { status: 500 });
    }

    const aiJson = await aiRes.json();
    const answer: string = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta.";

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
