// Supabase Edge Function: prime-metabase-insights
// Fetches data from Metabase (card query) and asks Google Gemini to explain/interpret it.

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
    let hasMetabaseData = false;
    let dataConfidence = 0;
    let issuesFound: string[] = [];

    console.log("=== DEBUG INFO ===");
    console.log("cardId:", cardId || "none");
    console.log("dashboardType:", dashboardType || "none");
    console.log("params:", params ? JSON.stringify(params) : "none");

    // Try to fetch Metabase data
    if (cardId && METABASE_SITE_URL && (METABASE_TOKEN || METABASE_SESSION)) {
      console.log("Fetching Metabase data...");
      try {
        const url = `${METABASE_SITE_URL.replace(/\/$/, "")}/api/card/${cardId}/query`;
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        
        // ✅ CORRECT Metabase Authentication
        // Use ONLY X-Metabase-Session OR X-Metabase-Api-Key (never Authorization: Bearer)
        if (METABASE_SESSION) {
          headers["X-Metabase-Session"] = METABASE_SESSION;
          console.log("🔐 Using X-Metabase-Session authentication");
        } else if (METABASE_TOKEN) {
          headers["X-Metabase-Api-Key"] = METABASE_TOKEN;
          console.log("🔐 Using X-Metabase-Api-Key authentication");
        } else {
          console.warn("⚠️ No Metabase authentication configured");
        }

        console.log("🌐 Metabase URL:", url);
        console.log("📋 Request params:", JSON.stringify(params || {}));

        const mbRes = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ parameters: params || {} }),
        });
        
        console.log("Metabase response:", mbRes.status);
        
        if (!mbRes.ok) {
          const errorText = await mbRes.text();
          console.error("Metabase error:", mbRes.status, errorText);
          issuesFound.push(`Erro ao buscar dados do Metabase: ${mbRes.status}`);
        } else {
          const data: MetabaseResult = await mbRes.json();
          const d = data.data || (data as any);
          const cols = d?.cols || d?.columns || [];
          const rows = d?.rows || [];
          columns = cols?.map((c: any) => c.name).filter(Boolean) || [];
          sampleRows = Array.isArray(rows) ? rows.slice(0, 50) : [];
          
          console.log("Columns:", columns.length);
          console.log("Rows:", sampleRows.length);
          
          if (columns.length === 0) {
            issuesFound.push("Nenhuma coluna retornada");
          }
          
          if (sampleRows.length === 0) {
            issuesFound.push("Nenhuma linha de dados retornada");
          }
          
          if (columns.length > 0 && sampleRows.length > 0) {
            hasMetabaseData = true;
            dataConfidence = 100;
          } else if (columns.length > 0 || sampleRows.length > 0) {
            hasMetabaseData = true;
            dataConfidence = 50;
          }
        }
      } catch (e: any) {
        console.error("Error fetching Metabase:", e);
        issuesFound.push(`Erro ao consultar Metabase: ${e.message}`);
      }
    } else {
      if (!cardId) issuesFound.push("ID do card não fornecido");
      if (!METABASE_SITE_URL) issuesFound.push("URL do Metabase não configurada");
      if (!METABASE_TOKEN && !METABASE_SESSION) issuesFound.push("Token do Metabase não configurado");
    }
    
    console.log("Data Quality - Has Data:", hasMetabaseData, "Confidence:", dataConfidence);

    // Build context-specific prompts
    const getContextualPrompt = (type?: string) => {
      const basePrompt = `Você é um analista de dados especializado do Proesc Prime, com expertise em análise educacional e gestão escolar.
      
⚠️ **IMPORTANTE**: Analise SOMENTE os dados que estão sendo exibidos no dashboard atual com os filtros aplicados. NÃO faça análises gerais da escola.`;
      
      const contextPrompts: Record<string, string> = {
        'financeiro': `${basePrompt}\n\n🏦 **ANÁLISE FINANCEIRA DOS DADOS FILTRADOS**\nAnalise especificamente os dados financeiros apresentados no dashboard com os filtros atuais aplicados:`,
        'agenda': `${basePrompt}\n\n📅 **ANÁLISE DOS AGENDAMENTOS FILTRADOS**\nAnalise especificamente os dados de agenda apresentados no dashboard com os filtros atuais aplicados:`,
        'secretaria': `${basePrompt}\n\n📋 **ANÁLISE ADMINISTRATIVA DOS DADOS FILTRADOS**\nAnalise especificamente os dados administrativos apresentados no dashboard com os filtros atuais aplicados:`,
        'pedagogico': `${basePrompt}\n\n🎓 **ANÁLISE PEDAGÓGICA DOS DADOS FILTRADOS**\nAnalise especificamente os dados pedagógicos apresentados no dashboard com os filtros atuais aplicados:`
      };

      return contextPrompts[type || ''] || `${basePrompt}\n\n📊 **ANÁLISE DOS DADOS FILTRADOS**\nAnalise especificamente os dados apresentados no dashboard com os filtros atuais:`;
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

    // ✅ Using v1 API endpoint (NOT v1beta) with gemini-1.5-flash
    const geminiModel = "gemini-1.5-flash";
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log("🤖 Gemini model:", geminiModel);
    console.log("🌐 Gemini endpoint:", geminiEndpoint.replace(GEMINI_API_KEY, "***"));
    
    const aiRes = await fetch(geminiEndpoint, {
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
    
    console.log("🤖 Gemini response status:", aiRes.status);

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("Gemini API error:", errorText);
      return json({ error: "Erro na API do Gemini", details: errorText }, { status: 500 });
    }

    const aiJson = await aiRes.json();
    const answer: string = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta.";

    console.log("✅ Analysis completed");
    
    return json({
      answer,
      dataQuality: {
        hasMetabaseData,
        confidence: dataConfidence,
        metabaseStatus: hasMetabaseData ? 'success' : 'no_data',
        issues: issuesFound
      },
      metadata: {
        columnsCount: columns.length,
        rowsCount: sampleRows.length,
        cardId: cardId || null,
        dashboardUrl: dashboardUrl || null,
        dashboardType: dashboardType || null,
        timestamp: new Date().toISOString()
      },
    });
  } catch (e: any) {
    console.error("Function error:", e);
    return json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
});
