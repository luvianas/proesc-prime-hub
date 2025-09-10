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
    console.log("dashboardType:", dashboardType || "none");
    console.log("params provided:", params ? JSON.stringify(params) : "none");
    console.log("=============================");

    // Try to fetch Metabase data when cardId provided and Metabase is configured
    if (cardId && METABASE_SITE_URL && (METABASE_TOKEN || METABASE_SESSION)) {
      console.log("Attempting to fetch Metabase data...");
      try {
        const url = `${METABASE_SITE_URL.replace(/\/$/, "")}/api/card/${cardId}/query`;
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        
        // Use Bearer token authentication (preferred) with fallback to API key header
        if (METABASE_TOKEN) {
          headers["Authorization"] = `Bearer ${METABASE_TOKEN}`;
          // Keep API key header as fallback for compatibility
          headers["X-Metabase-Api-Key"] = METABASE_TOKEN;
        }
        if (METABASE_SESSION) headers["X-Metabase-Session"] = METABASE_SESSION;

        console.log("Metabase request URL:", url);
        console.log("Authentication method:", METABASE_TOKEN ? "Bearer Token + API Key fallback" : "Session only");
        console.log("Request headers:", Object.keys(headers));
        console.log("Request parameters:", JSON.stringify(params || {}));

        const mbRes = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ parameters: params || {} }),
        });
        
        console.log("Metabase response status:", mbRes.status);
        console.log("Metabase response headers:", Object.keys(mbRes.headers));
        
        if (!mbRes.ok) {
          const errorText = await mbRes.text();
          console.warn("Metabase query failed with status:", mbRes.status);
          console.warn("Metabase error details:", errorText);
          
          // More specific error logging based on status code
          switch (mbRes.status) {
            case 401:
              console.error("❌ Metabase Authentication Failed (401): Token may be invalid or expired");
              break;
            case 403:
              console.error("❌ Metabase Access Forbidden (403): Token may lack permissions for this card or authentication format is incorrect");
              break;
            case 404:
              console.error("❌ Metabase Card Not Found (404): Card ID", cardId, "may not exist");
              break;
            default:
              console.error("❌ Metabase Error:", mbRes.status, mbRes.statusText);
          }
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
      const basePrompt = `Você é um analista de dados especializado do Proesc Prime, com expertise em análise educacional e gestão escolar.
      
⚠️ **IMPORTANTE**: Analise SOMENTE os dados que estão sendo exibidos no dashboard atual com os filtros aplicados. NÃO faça análises gerais da escola.`;
      
      const contextPrompts = {
        'financeiro': `${basePrompt}\n\n🏦 **ANÁLISE FINANCEIRA DOS DADOS FILTRADOS**\nAnalise especificamente os dados financeiros apresentados no dashboard com os filtros atuais aplicados:`,
        'agenda': `${basePrompt}\n\n📅 **ANÁLISE DOS AGENDAMENTOS FILTRADOS**\nAnalise especificamente os dados de agenda apresentados no dashboard com os filtros atuais aplicados:`,
        'secretaria': `${basePrompt}\n\n📋 **ANÁLISE ADMINISTRATIVA DOS DADOS FILTRADOS**\nAnalise especificamente os dados administrativos apresentados no dashboard com os filtros atuais aplicados:`,
        'pedagogico': `${basePrompt}\n\n🎓 **ANÁLISE PEDAGÓGICA DOS DADOS FILTRADOS**\nAnalise especificamente os dados pedagógicos apresentados no dashboard com os filtros atuais aplicados:`
      };

      return contextPrompts[type as keyof typeof contextPrompts] || `${basePrompt}\n\n📊 **ANÁLISE DOS DADOS FILTRADOS**\nAnalise especificamente os dados apresentados no dashboard com os filtros atuais:`;
    };

    const systemPrompt = [
      getContextualPrompt(dashboardType),
      `\n📋 **ESTRUTURA DA ANÁLISE (FOCO NOS DADOS FILTRADOS):**`,
      `\n🎯 **RESUMO DOS DADOS ATUAIS**`,
      `• Identifique claramente o período/escopo dos dados (ex: "mês de X", "turma Y", etc.)`,
      `• Mencione os filtros ativos que definem este conjunto de dados`,
      `• Principal conclusão específica dos dados em tela`,
      `\n📈 **ANÁLISE DOS DADOS APRESENTADOS**`,
      `• Interprete APENAS as métricas visíveis no dashboard atual`,
      `• Identifique padrões dentro do conjunto de dados filtrado`,
      `• Compare valores apenas dentro do escopo atual (se aplicável)`,
      `\n⚠️ **INSIGHTS DOS DADOS ESPECÍFICOS**`,
      `• Destaque pontos importantes dos dados filtrados`,
      `• Identifique oportunidades baseadas no conjunto atual`,
      `• Sinalize alertas específicos do período/segmento analisado`,
      `\n💡 **AÇÕES PARA ESTE CONTEXTO ESPECÍFICO**`,
      `• 3-4 ações práticas baseadas nos dados atuais em tela`,
      `• Recomendações específicas para o período/filtro aplicado`,
      `• Sugestões de filtros adicionais para aprofundar esta análise`,
      `\n🎯 **SEJA ESPECÍFICO**: Sempre referencie que está analisando os dados com filtros atuais, não a escola inteira.`,
      `📊 **Use os números exatos dos dados apresentados no dashboard.**`
    ].join("\n");

    const contextParts: string[] = [];
    
    // Add filter context first to emphasize scope
    if (params && Object.keys(params).length > 0) {
      contextParts.push(`🔧 **FILTROS APLICADOS**: ${JSON.stringify(params, null, 2)}`);
    }
    
    if (dashboardType) {
      contextParts.push(`📊 **TIPO DE DASHBOARD**: ${dashboardType}`);
    }
    
    if (columns.length) contextParts.push(`📋 **Colunas dos dados filtrados**: ${columns.join(", ")}`);
    if (sampleRows.length) contextParts.push(`📈 **Dados específicos do dashboard**: ${JSON.stringify(sampleRows)}`);
    if (dashboardUrl) contextParts.push(`🔗 **Dashboard ativo**: ${dashboardUrl}`);

    const fullPrompt = [
      systemPrompt,
      `\n🔍 **Pergunta**: ${question}`,
      contextParts.length 
        ? `\n📋 **Dados Disponíveis**:\n${contextParts.join("\n")}`
        : `\n⚠️ **IMPORTANTE**: Dados do Metabase não estão disponíveis no momento. Esta análise será baseada em conhecimento geral sobre gestão educacional. Para insights baseados em dados reais específicos da sua escola, verifique a conectividade com o sistema Metabase.`,
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
