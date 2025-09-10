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
  dashboardType?: 'financeiro' | 'agenda' | 'secretaria' | 'pedagogico';
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
    const { question, cardId, params, dashboardUrl, locale, dashboardType }: RequestPayload = await req.json();
    if (!question || typeof question !== "string") {
      return json({ error: "Missing 'question'" }, { status: 400 });
    }

    const METABASE_SITE_URL = Deno.env.get("METABASE_SITE_URL");
    const METABASE_TOKEN = Deno.env.get("METABASE_TOKEN");
    const METABASE_SESSION = Deno.env.get("METABASE_SESSION");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API");

    if (!GEMINI_API_KEY) {
      return json({ error: "GEMINI_API key not configured" }, { status: 500 });
    }

    let columns: string[] = [];
    let sampleRows: any[] = [];

    // Log Metabase configuration status for debugging
    console.log("=== METABASE DEBUG INFO ===");
    console.log("METABASE_SITE_URL:", METABASE_SITE_URL ? "configured" : "not configured");
    console.log("METABASE_TOKEN:", METABASE_TOKEN ? "configured" : "not configured");  
    console.log("METABASE_SESSION:", METABASE_SESSION ? "configured" : "not configured");
    console.log("cardId provided:", cardId || "none");
    console.log("dashboardUrl:", dashboardUrl || "none");
    console.log("=============================");

    // Try to fetch Metabase data when cardId provided and Metabase is configured
    if (cardId && METABASE_SITE_URL && (METABASE_TOKEN || METABASE_SESSION)) {
      console.log("Attempting to fetch Metabase data...");
      try {
        const url = `${METABASE_SITE_URL.replace(/\/$/, "")}/api/card/${cardId}/query`;
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (METABASE_TOKEN) headers["X-Metabase-Api-Key"] = METABASE_TOKEN;
        if (METABASE_SESSION) headers["X-Metabase-Session"] = METABASE_SESSION;

        console.log("Metabase request URL:", url);
        console.log("Metabase request headers:", Object.keys(headers));

        const mbRes = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ parameters: params || {} }),
        });
        
        console.log("Metabase response status:", mbRes.status);
        
        if (!mbRes.ok) {
          const errorText = await mbRes.text();
          console.warn("Metabase query failed with status:", mbRes.status);
          console.warn("Metabase error details:", errorText);
        } else {
          const data: MetabaseResult = await mbRes.json();
          const d = data.data || (data as any);
          const cols = d?.cols || d?.columns || [];
          const rows = d?.rows || [];
          columns = cols?.map((c: any) => c.name).filter(Boolean) || [];
          sampleRows = Array.isArray(rows) ? rows.slice(0, 50) : [];
          
          console.log("Metabase data fetched successfully:");
          console.log("- Columns count:", columns.length);
          console.log("- Rows count:", sampleRows.length);
          console.log("- Column names:", columns);
        }
      } catch (e) {
        console.error("Error querying Metabase:", e);
      }
    } else {
      console.warn("Skipping Metabase data fetch - Missing requirements:");
      if (!cardId) console.warn("- cardId is missing");
      if (!METABASE_SITE_URL) console.warn("- METABASE_SITE_URL secret is not configured");
      if (!METABASE_TOKEN && !METABASE_SESSION) console.warn("- Neither METABASE_TOKEN nor METABASE_SESSION secrets are configured");
    }

    // Build context-specific prompts
    const getContextualPrompt = (type?: string) => {
      const basePrompt = `Você é um analista de dados especializado do Proesc Prime, com expertise em análise educacional e gestão escolar.`;
      
      const contextPrompts = {
        'financeiro': `${basePrompt}\n\n🏦 **ANÁLISE FINANCEIRA EDUCACIONAL**\nAnalise os dados financeiros apresentados e forneça insights específicos para gestão financeira escolar:`,
        'agenda': `${basePrompt}\n\n📅 **ANÁLISE DE AGENDA E AGENDAMENTOS**\nAnalise os dados de agenda apresentados e forneça insights sobre otimização de horários e recursos:`,
        'secretaria': `${basePrompt}\n\n📋 **ANÁLISE ADMINISTRATIVA**\nAnalise os dados administrativos apresentados e forneça insights para otimização de processos secretariais:`,
        'pedagogico': `${basePrompt}\n\n🎓 **ANÁLISE PEDAGÓGICA**\nAnalise os dados pedagógicos apresentados e forneça insights sobre desempenho acadêmico e ensino:`
      };

      return contextPrompts[type as keyof typeof contextPrompts] || `${basePrompt}\n\n📊 **ANÁLISE GERAL**\nAnalise os dados apresentados:`;
    };

    const systemPrompt = [
      getContextualPrompt(dashboardType),
      `\n📋 **ESTRUTURA DA ANÁLISE:**`,
      `\n🎯 **RESUMO EXECUTIVO**`,
      `• Principal conclusão em 2-3 frases objetivas`,
      `• Destaque o indicador mais crítico`,
      `\n📈 **TENDÊNCIAS E PADRÕES**`,
      `• Identifique 2-3 tendências principais`,
      `• Compare períodos quando aplicável`,
      `• Aponte variações sazonais ou cíclicas`,
      `\n⚠️ **ALERTAS E PONTOS DE ATENÇÃO**`,
      `• Liste anomalias ou desvios significativos`,
      `• Identifique riscos potenciais`,
      `• Destaque metas não atingidas`,
      `\n💡 **RECOMENDAÇÕES PRÁTICAS**`,
      `• 3-5 ações específicas e implementáveis`,
      `• Priorize por impacto e urgência`,
      `• Inclua prazos sugeridos quando possível`,
      `\n🔢 **Use números, percentuais e seja quantitativo sempre que possível.**`,
      `📝 **Mantenha um tom profissional e educativo.**`
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

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
