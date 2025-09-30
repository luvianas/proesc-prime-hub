// Supabase Edge Function: prime-metabase-insights
// Fetches data from Metabase (card query) and asks OpenAI GPT-5 Mini to explain/interpret it.

interface RequestPayload {
  question: string;
  screenshot?: string; // Base64 encoded image
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
    const { question, screenshot, cardId, params, dashboardUrl, locale, dashboardType }: RequestPayload = await req.json();
    if (!question || typeof question !== "string") {
      return json({ error: "Missing 'question'" }, { status: 400 });
    }
    
    if (!screenshot || typeof screenshot !== "string") {
      return json({ error: "Missing 'screenshot' - dashboard image required" }, { status: 400 });
    }

    const METABASE_SITE_URL = Deno.env.get("METABASE_SITE_URL");
    const METABASE_TOKEN = Deno.env.get("METABASE_TOKEN");
    const METABASE_SESSION = Deno.env.get("METABASE_SESSION");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    let columns: string[] = [];
    let sampleRows: any[] = [];
    let hasMetabaseData = false;
    let dataConfidence = 0;
    let issuesFound: string[] = [];

    console.log("=== DEBUG INFO ===");
    console.log("dashboardType:", dashboardType || "none");
    console.log("params:", params ? JSON.stringify(params) : "none");
    console.log("screenshot size:", screenshot ? `${Math.round(screenshot.length / 1024)}KB` : "none");
    
    // Using screenshot-based analysis (no Metabase required)
    hasMetabaseData = true; // We have visual data
    dataConfidence = 85; // High confidence with visual analysis
    console.log("Using screenshot-based analysis with GPT-5 Vision");

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
    
    contextParts.push(`📸 **ANÁLISE VISUAL**: Você está analisando uma captura de tela do dashboard em tempo real.`);
    
    if (params && Object.keys(params).length > 0) {
      contextParts.push(`🔧 **FILTROS APLICADOS**: ${JSON.stringify(params, null, 2)}`);
    }
    
    if (dashboardType) {
      contextParts.push(`📊 **TIPO DE DASHBOARD**: ${dashboardType}`);
    }

    const fullPrompt = [
      systemPrompt,
      `\n🔍 **Pergunta**: ${question}`,
      `\n📋 **Contexto**:\n${contextParts.join("\n")}`,
      `\n🎯 **INSTRUÇÕES IMPORTANTES**:`,
      `• Analise TODOS os gráficos, tabelas e números visíveis na imagem`,
      `• Identifique padrões, tendências e anomalias nos dados visualizados`,
      `• Cite valores específicos que você consegue ler nos gráficos`,
      `• Se houver legendas, títulos ou rótulos, use-os na análise`,
      locale ? `\n🌍 Idioma: ${locale}` : '',
    ].filter(Boolean).join("\n");

    // ✅ Using OpenAI GPT-5 with Vision
    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";
    
    console.log("🤖 Using OpenAI GPT-5 with Vision");
    console.log("🌐 OpenAI endpoint:", openaiEndpoint);
    
    const aiRes = await fetch(openaiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07", // GPT-5 supports vision
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em análise de dados educacionais e dashboards do Proesc Prime com capacidade de análise visual de gráficos e tabelas."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: screenshot, // Base64 data URL
                  detail: "high" // High detail for better analysis
                }
              }
            ]
          }
        ],
        max_completion_tokens: 2048, // More tokens for detailed visual analysis
        // Note: GPT-5 does not support temperature parameter (always 1.0)
      }),
    });
    
    console.log("🤖 OpenAI response status:", aiRes.status);

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("❌ OpenAI API error:", aiRes.status, errorText);
      return json({ 
        error: "Erro na API do OpenAI", 
        details: errorText,
        suggestion: "Verifique se a chave OPENAI_API_KEY está correta e ativa"
      }, { status: 500 });
    }

    const aiJson = await aiRes.json();
    
    // OpenAI returns response in choices[0].message.content format
    let answer = "";
    if (aiJson.choices && aiJson.choices.length > 0) {
      answer = aiJson.choices[0].message.content || "Não foi possível gerar uma resposta.";
    } else {
      console.error("Unexpected OpenAI response structure:", JSON.stringify(aiJson));
      answer = "Erro ao processar resposta da IA.";
    }

    console.log("✅ Analysis completed");
    
    return json({
      answer,
      dataQuality: {
        hasMetabaseData: true, // Visual analysis
        confidence: dataConfidence,
        metabaseStatus: 'visual_analysis',
        issues: issuesFound
      },
      metadata: {
        analysisType: 'screenshot',
        screenshotSize: Math.round(screenshot.length / 1024) + 'KB',
        dashboardType: dashboardType || null,
        timestamp: new Date().toISOString()
      },
    });
  } catch (e: any) {
    console.error("Function error:", e);
    return json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
});
