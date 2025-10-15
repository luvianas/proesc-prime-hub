import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  price_level?: number;
  validation_score?: number;
  confidence_level?: 'high' | 'medium' | 'low';
}

interface EnrichedPlaceResult extends PlaceResult {
  pricing_data?: {
    monthly_fee?: number;
    annual_fee?: number;
    price_range?: 'budget' | 'moderate' | 'expensive' | 'luxury';
    confidence_score?: number;
    data_source?: string;
  };
}

interface MarketAnalysisRequest {
  address: string;
  radius?: number; // radius in meters, default 10000 (10km)
}

interface MarketAnalysisResponse {
  competitors: EnrichedPlaceResult[];
  analysis: {
    total_competitors: number;
    average_rating: number;
    high_rated_count: number;
    price_distribution: {
      budget: number;
      moderate: number;
      expensive: number;
      luxury: number;
    };
    pricing_insights: {
      schools_with_pricing: number;
      average_monthly_fee?: number;
      price_range_distribution: {
        budget: number;
        moderate: number;
        expensive: number;
        luxury: number;
      };
    };
    insights: string;
  };
  center_coordinates: {
    lat: number;
    lng: number;
  };
  metadata: {
    search_location: {
      address: string;
      coordinates: { lat: number; lng: number };
    };
    filtering_stats: {
      total_schools_found: number;
      private_schools_kept: number;
      confidence_level: 'high' | 'medium' | 'low';
      filters_applied: string[];
      phases_implemented: string[];
      validation_layers: {
        keyword_filter: number;
        score_validation: number;
        network_whitelist: number;
      };
      ambiguous_schools_found: number;
      confidence_breakdown: {
        high: number;
        medium: number;
        low: number;
      };
    };
  };
}

// ============= CAMADA 3: Lista Branca de Redes Privadas Conhecidas =============
function isKnownPrivateNetwork(name: string): boolean {
  const normalizedName = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  const knownNetworks = [
    // Grandes Redes Nacionais
    'objetivo', 'anglo', 'etapa', 'pensi', 'bandeirantes', 'santo américo',
    'dante alighieri', 'porto seguro', 'nossa senhora', 'santa maria',
    'mackenzie', 'adventista', 'marista', 'franciscano', 'dominicano',
    'salesiano', 'santa cruz', 'são luís', 'são francisco', 'são bento',
    
    // Redes Religiosas
    'santa teresinha', 'santo antonio', 'imaculada conceicao', 'sagrado coracao',
    'metodista', 'batista', 'presbiteriana', 'luterano', 'anglicana',
    
    // Metodologias Específicas (sempre particulares)
    'waldorf', 'montessori', 'steiner', 'maple bear', 'red balloon',
    'pueri domus', 'stance dual', 'concept', 'vértice',
    
    // Sistemas de Ensino (franchising)
    'ph', 'poliedro', 'bernoulli', 'farias brito', 'ari de sá',
    'elite rede', 'cognitivo', 'darwin', 'kumon'
  ];
  
  return knownNetworks.some(network => normalizedName.includes(network));
}

// ============= CAMADA 2: Score Composto de Validação =============
function getPrivateSchoolConfidence(place: PlaceResult): {
  total: number;
  confidence: 'high' | 'medium' | 'low';
  breakdown: {
    ratings_score: number;
    name_score: number;
    methodology_score: number;
    location_score: number;
  };
} {
  let score = 0;
  const breakdown = {
    ratings_score: 0,
    name_score: 0,
    methodology_score: 0,
    location_score: 0
  };
  
  // 1. Análise de Padrões de Rating (0-25 pontos)
  if (place.user_ratings_total) {
    if (place.user_ratings_total >= 100) {
      breakdown.ratings_score = 25; // Muitas avaliações = escola grande = provavelmente particular
    } else if (place.user_ratings_total >= 50) {
      breakdown.ratings_score = 15;
    } else if (place.user_ratings_total >= 20) {
      breakdown.ratings_score = 10;
    } else if (place.user_ratings_total < 10) {
      breakdown.ratings_score = -10; // Muito poucas avaliações pode ser escola pública pequena
    }
  }
  
  // 2. Análise de Nome (0-30 pontos)
  const name = place.name.toLowerCase();
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Nome longo com palavras formais = mais provável ser particular
  const wordCount = name.split(' ').filter(w => w.length > 2).length;
  if (wordCount >= 4) {
    breakdown.name_score += 15;
  } else if (wordCount >= 3) {
    breakdown.name_score += 10;
  }
  
  // Presença de "colégio" aumenta chance
  if (normalizedName.includes('colegio')) {
    breakdown.name_score += 15;
  }
  
  // 3. Metodologias/Sistemas Pedagógicos (0-30 pontos)
  const methodologyKeywords = [
    'bilingue', 'bilingual', 'internacional', 'montessori', 'waldorf',
    'integral', 'periodo integral', 'sistema', 'rede',
    'educacao infantil', 'ensino fundamental', 'ensino medio'
  ];
  
  const hasMethodology = methodologyKeywords.some(keyword => 
    normalizedName.includes(keyword.toLowerCase())
  );
  
  if (hasMethodology) {
    breakdown.methodology_score = 30;
  }
  
  // 4. Análise de Endereço/Localização (0-15 pontos)
  const vicinity = (place.vicinity || '').toLowerCase();
  const affluent Keywords = [
    'jardim', 'jardins', 'alphaville', 'granja viana', 'morumbi',
    'higienopolis', 'vila', 'alto', 'leblon', 'ipanema', 'lagoa'
  ];
  
  const isAffluentArea = affluentKeywords.some(keyword => vicinity.includes(keyword));
  if (isAffluentArea) {
    breakdown.location_score = 15;
  }
  
  // Calcular score total
  score = breakdown.ratings_score + breakdown.name_score + 
          breakdown.methodology_score + breakdown.location_score;
  
  // Determinar nível de confiança
  let confidence: 'high' | 'medium' | 'low';
  if (score >= 60) {
    confidence = 'high';
  } else if (score >= 40) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return { total: score, confidence, breakdown };
}

async function enrichWithPricingData(competitors: PlaceResult[]): Promise<EnrichedPlaceResult[]> {
  console.log(`💰 Starting pricing enrichment for ${competitors.length} competitors`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const enrichedCompetitors: EnrichedPlaceResult[] = [];
  
  for (const competitor of competitors) {
    try {
      // Try to get city and state from vicinity
      const locationParts = competitor.vicinity?.split(',').map(s => s.trim()) || [];
      const city = locationParts[locationParts.length - 2] || 'Unknown';
      const state = locationParts[locationParts.length - 1] || 'Unknown';
      
      console.log(`🔍 Enriching ${competitor.name} in ${city}, ${state}`);
      
      // Call our pricing enrichment function
      const pricingResponse = await fetch(`${supabaseUrl}/functions/v1/school-pricing-enrichment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolName: competitor.name,
          city: city,
          state: state,
          placeId: competitor.place_id
        })
      });
      
      let pricingData = null;
      if (pricingResponse.ok) {
        const pricingResult = await pricingResponse.json();
        if (pricingResult.success) {
          pricingData = {
            monthly_fee: pricingResult.data.monthly_fee,
            annual_fee: pricingResult.data.annual_fee,
            price_range: pricingResult.data.price_range,
            confidence_score: pricingResult.data.confidence_score,
            data_source: pricingResult.data.data_source
          };
          console.log(`✅ Got pricing data for ${competitor.name}: R$ ${pricingData.monthly_fee}/month`);
        }
      } else {
        console.log(`❌ Failed to get pricing data for ${competitor.name}`);
      }
      
      enrichedCompetitors.push({
        ...competitor,
        pricing_data: pricingData || undefined
      });
      
    } catch (error) {
      console.error(`❌ Error enriching ${competitor.name}:`, error);
      enrichedCompetitors.push(competitor);
    }
  }
  
  console.log(`💰 Pricing enrichment completed: ${enrichedCompetitors.filter(c => c.pricing_data).length}/${competitors.length} schools with pricing data`);
  return enrichedCompetitors;
}

function performMarketAnalysis(competitors: EnrichedPlaceResult[]) {
  // Basic analysis
  const totalCompetitors = competitors.length;
  const ratingsData = competitors.filter(p => p.rating).map(p => p.rating!);
  const averageRating = ratingsData.length > 0 
    ? ratingsData.reduce((a, b) => a + b, 0) / ratingsData.length 
    : 0;
  const highRatedCount = competitors.filter(c => c.rating && c.rating >= 4.5).length;

  // Enhanced price analysis using both Google Places price_level and our enriched pricing data
  const priceDistribution = {
    budget: 0,    // price_level 1 or monthly_fee <= 500
    moderate: 0,  // price_level 2 or monthly_fee 501-1200  
    expensive: 0, // price_level 3 or monthly_fee 1201-2500
    luxury: 0     // price_level 4 or monthly_fee > 2500
  };

  const pricingInsights = {
    schools_with_pricing: 0,
    average_monthly_fee: undefined as number | undefined,
    price_range_distribution: {
      budget: 0,
      moderate: 0,
      expensive: 0,
      luxury: 0
    }
  };

  // Analyze pricing data from our enrichment
  const competitorsWithPricing = competitors.filter(c => c.pricing_data?.monthly_fee);
  pricingInsights.schools_with_pricing = competitorsWithPricing.length;

  if (competitorsWithPricing.length > 0) {
    const totalFees = competitorsWithPricing.reduce((sum, c) => sum + (c.pricing_data!.monthly_fee!), 0);
    pricingInsights.average_monthly_fee = Math.round(totalFees / competitorsWithPricing.length);

    competitorsWithPricing.forEach(competitor => {
      const priceRange = competitor.pricing_data!.price_range!;
      pricingInsights.price_range_distribution[priceRange]++;
      priceDistribution[priceRange]++;
    });
  }

  // Fallback to Google Places price_level for remaining schools
  const competitorsWithPriceLevel = competitors.filter(c => 
    !c.pricing_data?.monthly_fee && c.price_level !== undefined
  );
  
  console.log(`Competitors with pricing data: ${competitorsWithPricing.length}`);
  console.log(`Competitors with Google price levels: ${competitorsWithPriceLevel.length}`);

  competitorsWithPriceLevel.forEach(competitor => {
    switch (competitor.price_level) {
      case 1:
        priceDistribution.budget++;
        break;
      case 2:
        priceDistribution.moderate++;
        break;
      case 3:
        priceDistribution.expensive++;
        break;
      case 4:
        priceDistribution.luxury++;
        break;
    }
  });

  console.log(`Enhanced price distribution:`, priceDistribution);
  console.log(`Pricing insights:`, pricingInsights);

  return {
    total_competitors: competitors.length,
    average_rating: averageRating,
    high_rated_count: highRatedCount,
    price_distribution: priceDistribution,
    pricing_insights: pricingInsights,
    insights: generateEnhancedInsights(
      competitors.length, 
      averageRating, 
      highRatedCount, 
      priceDistribution, 
      pricingInsights
    )
  };
}

function generateEnhancedInsights(
  totalCompetitors: number,
  averageRating: number,
  highRatedCount: number,
  priceDistribution: { budget: number; moderate: number; expensive: number; luxury: number },
  pricingInsights: {
    schools_with_pricing: number;
    average_monthly_fee?: number;
    price_range_distribution: { budget: number; moderate: number; expensive: number; luxury: number };
  }
): string {
  const insights = [];
  
  // Competition level
  if (totalCompetitors < 5) {
    insights.push("Mercado com baixa concorrência - boa oportunidade para destacar-se.");
  } else if (totalCompetitors < 15) {
    insights.push("Concorrência moderada - importante focar na diferenciação.");
  } else {
    insights.push("Mercado altamente competitivo - necessário estratégia robusta de posicionamento.");
  }
  
  // Rating insights
  if (averageRating > 4.5) {
    insights.push("Concorrentes têm avaliações muito altas - foque na excelência do serviço.");
  } else if (averageRating > 4.0) {
    insights.push("Avaliações dos concorrentes são boas - há espaço para superar expectativas.");
  } else {
    insights.push("Oportunidade de diferenciação através da qualidade - concorrentes têm avaliações medianas.");
  }
  
  // Enhanced pricing insights
  if (pricingInsights.schools_with_pricing > 0) {
    const pricingPercentage = Math.round((pricingInsights.schools_with_pricing / totalCompetitors) * 100);
    insights.push(`Dados de preços obtidos para ${pricingPercentage}% dos concorrentes.`);
    
    if (pricingInsights.average_monthly_fee) {
      insights.push(`Mensalidade média na região: R$ ${pricingInsights.average_monthly_fee}.`);
    }
    
    // Price positioning analysis
    const dominantPriceRange = Object.entries(pricingInsights.price_range_distribution).reduce((a, b) => 
      pricingInsights.price_range_distribution[a[0] as keyof typeof pricingInsights.price_range_distribution] > 
      pricingInsights.price_range_distribution[b[0] as keyof typeof pricingInsights.price_range_distribution] ? a : b
    )[0];
    
    const categoryNames = {
      budget: 'econômico (até R$ 500)',
      moderate: 'moderado (R$ 501-1.200)',
      expensive: 'premium (R$ 1.201-2.500)',
      luxury: 'luxo (acima de R$ 2.500)'
    };
    
    if (pricingInsights.price_range_distribution[dominantPriceRange as keyof typeof pricingInsights.price_range_distribution] > 0) {
      insights.push(`Mercado predominantemente ${categoryNames[dominantPriceRange as keyof typeof categoryNames]}.`);
    }
  } else {
    // Fallback to Google Places price levels
    const totalWithPricing = Object.values(priceDistribution).reduce((sum, count) => sum + count, 0);
    if (totalWithPricing > 0) {
      const dominantCategory = Object.entries(priceDistribution).reduce((a, b) => 
        priceDistribution[a[0] as keyof typeof priceDistribution] > priceDistribution[b[0] as keyof typeof priceDistribution] ? a : b
      )[0];
      
      const categoryNames = {
        budget: 'econômico',
        moderate: 'moderado',
        expensive: 'premium',
        luxury: 'luxo'
      };
      
      insights.push(`Posicionamento de preço: mercado ${categoryNames[dominantCategory as keyof typeof categoryNames]} (baseado em dados limitados).`);
    }
  }
  
  return insights.join(' ');
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('🚀 Starting market analysis request at:', new Date().toISOString());

  // Set timeout for the entire request
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 25000); // 25 second timeout
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, radius = 10000 }: MarketAnalysisRequest = await req.json();
    console.log('📍 Request parameters:', { address, radius });
    
    if (!address) {
      console.error('❌ No address provided in request');
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('Maps Platform API Key');
    console.log('🔑 API Key status:', {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      preview: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'
    });
    
    if (!apiKey) {
      console.error('❌ Google Maps API key not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key not configured',
          details: 'The Maps Platform API Key secret needs to be configured in Supabase Edge Functions settings'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate API key format (basic validation)
    if (apiKey.length < 30 || !apiKey.startsWith('AIza')) {
      console.error('❌ Invalid API key format detected');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Google Maps API key format',
          details: 'The API key should start with "AIza" and be at least 30 characters long'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, geocode the address to get coordinates
    console.log('🌍 Starting geocoding for address:', address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    console.log('📡 Geocoding response status:', geocodeResponse.status);
    
    const geocodeData = await geocodeResponse.json();
    console.log('🔍 Geocoding result:', { 
      status: geocodeData.status, 
      results_count: geocodeData.results?.length || 0,
      error_message: geocodeData.error_message || 'None'
    });

    if (geocodeData.status !== 'OK' || !geocodeData.results.length) {
      const errorDetails = geocodeData.error_message || 'Address not found or invalid';
      console.error('❌ Geocoding failed:', errorDetails);
      return new Response(
        JSON.stringify({ 
          error: 'Could not geocode the provided address',
          details: errorDetails,
          status: geocodeData.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = geocodeData.results[0].geometry.location;
    console.log('✅ Geocoded successfully:', {
      address,
      coordinates: { lat: location.lat, lng: location.lng },
      formatted_address: geocodeData.results[0].formatted_address
    });

    // Search for private schools within the specified radius
    console.log('🏫 Starting Places API search for schools...');
    let allCompetitors: PlaceResult[] = [];
    let nextPageToken = null;
    
    // First search - using optimized keywords to focus on private schools (FASE 3)
    let placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&keyword=colégio+particular+privado&type=school&key=${apiKey}`;
    console.log('📡 Making Places API request with radius:', radius / 1000, 'km');
    
    let placesResponse = await fetch(placesUrl);
    console.log('📡 Places API response status:', placesResponse.status);
    
    let placesData = await placesResponse.json();
    console.log('🔍 Places API result:', { 
      status: placesData.status, 
      results_count: placesData.results?.length || 0,
      next_page_token: !!placesData.next_page_token,
      error_message: placesData.error_message || 'None'
    });
    
    if (placesData.status !== 'OK') {
      const errorDetails = placesData.error_message || 'Unknown Places API error';
      console.error('❌ Places API error:', placesData.status, errorDetails);
      return new Response(
        JSON.stringify({ 
          error: `Places API error: ${placesData.status}`,
          details: errorDetails
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // FASE 1+2: Enhanced filtering for private schools only
    const publicSchoolKeywords = [
      // Já existentes
      'emef', 'emei', 'emeif', 'cemei', 'municipal', 'estadual', 'federal',
      'pública', 'publica', 'governo', 'prefeitura', 'sec.', 'secretaria',
      'colégio estadual', 'escola estadual', 'escola municipal', 'creche municipal',
      
      // FASE 1: Abreviações comuns
      'e.m.', 'e.e.', 'e.m.e.f', 'e.m.e.i', 'e.e.e.i', 'e.e.e.f',
      'c.e.', 'c.e.m.', // Centro Educacional Municipal
      
      // FASE 1: Modelos específicos de escolas públicas
      'ciep', 'caic', 'ceu', // CIEP (RJ), CAIC, CEU (SP)
      'cem ', 'cme ', // Centro Municipal de Educação
      
      // FASE 1: Sistema S
      'sesi', 'senai', 'senac', 'sesc',
      
      // FASE 1: Escolas técnicas estaduais
      'etec', 'fatec', 'e.t.e.c', 'f.a.t.e.c',
      
      // FASE 1: Institutos Federais
      'ifsp', 'if-', 'instituto federal', 'i.f.', 'cefet',
      
      // FASE 1: Educação infantil pública
      'creche conveniada', 'pré-escola municipal', 'berçário municipal',
      
      // FASE 1: Outras nomenclaturas públicas
      'centro de educação', 'núcleo de ensino', 'polo educacional',
      'casa da criança', 'lar infantil',
      'unidade escolar', 'ue ', 'u.e.',
      'delegacia de ensino', 'diretoria de ensino'
    ];
    
    // FASE 2: Indicadores de escolas particulares
    const privateSchoolIndicators = [
      'colégio', 'colegio',
      'instituto educacional', 'centro educacional particular',
      'escola particular', 'escola privada',
      'liceu', 'ginásio', 'internato',
      'berçário particular', 'creche particular',
      'anglo', 'objetivo', 'etapa', 'pensi', 'bandeirantes',
      'adventista', 'luterano', 'metodista', 'batista',
      'waldorf', 'montessori', 'steiner'
    ];
    
    const filteredResults = placesData.results.filter((place: PlaceResult) => {
      const name = place.name.toLowerCase();
      
      // FASE 1: Normalizar texto (remover acentos e pontos)
      const normalizedName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\./g, ' ')
        .toLowerCase();
      
      // FASE 2: Se tiver indicador de escola particular, mantém (exceto se tiver palavra pública óbvia)
      const hasPrivateIndicator = privateSchoolIndicators.some(indicator => 
        normalizedName.includes(indicator)
      );
      
      const hasPublicKeyword = publicSchoolKeywords.some(keyword => 
        normalizedName.includes(keyword.toLowerCase())
      );
      
      // Mantém se for claramente particular, remove se for pública
      if (hasPrivateIndicator && !hasPublicKeyword) {
        return true;
      }
      
      return !hasPublicKeyword;
    });
    
    // FASE 5: Logging de filtragem
    const filteredOut = placesData.results.filter((place: PlaceResult) => {
      const name = place.name.toLowerCase();
      const normalizedName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\./g, ' ')
        .toLowerCase();
      return publicSchoolKeywords.some(keyword => normalizedName.includes(keyword.toLowerCase()));
    });
    
    console.log('🔍 Filtragem de escolas públicas:', {
      total_encontradas: placesData.results.length,
      publicas_removidas: filteredOut.length,
      particulares_mantidas: filteredResults.length,
      exemplos_removidos: filteredOut.slice(0, 3).map((p: PlaceResult) => p.name)
    });
    
    // ============= CAMADA 2+3: Processar Escolas Ambíguas com Score + Whitelist =============
    const ambiguousSchools = filteredResults.filter(place => {
      const name = place.name.toLowerCase();
      const normalizedName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      
      const hasPrivateIndicator = privateSchoolIndicators.some(k => normalizedName.includes(k));
      const hasPublicKeyword = publicSchoolKeywords.some(k => normalizedName.includes(k.toLowerCase()));
      
      return !hasPrivateIndicator && !hasPublicKeyword;
    });
    
    console.log('🎯 Escolas ambíguas encontradas:', {
      total: ambiguousSchools.length,
      exemplos: ambiguousSchools.slice(0, 3).map(p => p.name)
    });
    
    // Aplicar score composto para escolas ambíguas
    const validatedAmbiguousSchools = ambiguousSchools.map(place => {
      const validation = getPrivateSchoolConfidence(place);
      return {
        ...place,
        validation_score: validation.total,
        confidence_level: validation.confidence
      };
    }).filter(school => school.validation_score >= 40); // Score mínimo de 40
    
    console.log('✅ Escolas ambíguas validadas por score:', {
      validadas: validatedAmbiguousSchools.length,
      high_confidence: validatedAmbiguousSchools.filter(s => s.confidence_level === 'high').length,
      medium_confidence: validatedAmbiguousSchools.filter(s => s.confidence_level === 'medium').length
    });
    
    // Aplicar whitelist de redes conhecidas
    const networkSchools = placesData.results.filter(place => 
      isKnownPrivateNetwork(place.name)
    ).map(place => ({
      ...place,
      validation_score: 100,
      confidence_level: 'high' as const
    }));
    
    console.log('🏫 Escolas de redes conhecidas:', {
      total: networkSchools.length,
      exemplos: networkSchools.slice(0, 3).map(p => p.name)
    });
    
    // Combinar: filtradas + validadas por score + redes conhecidas
    const clearlyPrivate = filteredResults.filter(place => {
      const name = place.name.toLowerCase();
      const normalizedName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      
      const hasPrivateIndicator = privateSchoolIndicators.some(k => normalizedName.includes(k));
      return hasPrivateIndicator;
    }).map(place => ({
      ...place,
      validation_score: 80,
      confidence_level: 'high' as const
    }));
    
    // Remover duplicatas usando place_id
    const allValidated = [
      ...clearlyPrivate,
      ...validatedAmbiguousSchools,
      ...networkSchools
    ];
    
    const uniqueSchools = Array.from(
      new Map(allValidated.map(school => [school.place_id, school])).values()
    );
    
    allCompetitors = uniqueSchools;
    nextPageToken = placesData.next_page_token;
    
    // Estatísticas de validação multi-camadas
    const validationStats = {
      keyword_filter: clearlyPrivate.length,
      score_validation: validatedAmbiguousSchools.length,
      network_whitelist: networkSchools.length,
      ambiguous_found: ambiguousSchools.length,
      confidence_breakdown: {
        high: uniqueSchools.filter(s => s.confidence_level === 'high').length,
        medium: uniqueSchools.filter(s => s.confidence_level === 'medium').length,
        low: uniqueSchools.filter(s => s.confidence_level === 'low').length
      }
    };
    
    console.log('📊 Validação Multi-Camadas completa:', validationStats);
    console.log('🔄 First page results:', {
      total_found: placesData.results?.length || 0,
      filtered_count: filteredResults.length,
      has_next_page: !!nextPageToken
    });
    
    // Get additional pages if available (up to 20 results total for faster response)
    let pageCount = 1;
    while (nextPageToken && allCompetitors.length < 20 && pageCount < 2) {
      console.log(`📄 Fetching page ${pageCount + 1}...`);
      
      // Wait 1.5 seconds before next request (reduced for speed)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
      placesResponse = await fetch(placesUrl);
      placesData = await placesResponse.json();
      
      console.log(`📡 Page ${pageCount + 1} response:`, {
        status: placesData.status,
        results_count: placesData.results?.length || 0
      });
      
      if (placesData.status === 'OK' && placesData.results) {
        // Apply same enhanced filtering logic to additional pages
        const filteredResults = placesData.results.filter((place: PlaceResult) => {
          const name = place.name.toLowerCase();
          
          // Use same keywords as first page
          const publicSchoolKeywords = [
            'emef', 'emei', 'emeif', 'cemei', 'municipal', 'estadual', 'federal',
            'pública', 'publica', 'governo', 'prefeitura', 'sec.', 'secretaria',
            'colégio estadual', 'escola estadual', 'escola municipal', 'creche municipal',
            'e.m.', 'e.e.', 'e.m.e.f', 'e.m.e.i', 'e.e.e.i', 'e.e.e.f',
            'c.e.', 'c.e.m.', 'ciep', 'caic', 'ceu', 'cem ', 'cme ',
            'sesi', 'senai', 'senac', 'sesc',
            'etec', 'fatec', 'e.t.e.c', 'f.a.t.e.c',
            'ifsp', 'if-', 'instituto federal', 'i.f.', 'cefet',
            'creche conveniada', 'pré-escola municipal', 'berçário municipal',
            'centro de educação', 'núcleo de ensino', 'polo educacional',
            'casa da criança', 'lar infantil',
            'unidade escolar', 'ue ', 'u.e.',
            'delegacia de ensino', 'diretoria de ensino'
          ];
          
          const privateSchoolIndicators = [
            'colégio', 'colegio',
            'instituto educacional', 'centro educacional particular',
            'escola particular', 'escola privada',
            'liceu', 'ginásio', 'internato',
            'berçário particular', 'creche particular',
            'anglo', 'objetivo', 'etapa', 'pensi', 'bandeirantes',
            'adventista', 'luterano', 'metodista', 'batista',
            'waldorf', 'montessori', 'steiner'
          ];
          
          const normalizedName = name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\./g, ' ')
            .toLowerCase();
          
          const hasPrivateIndicator = privateSchoolIndicators.some(indicator => 
            normalizedName.includes(indicator)
          );
          
          const hasPublicKeyword = publicSchoolKeywords.some(keyword => 
            normalizedName.includes(keyword.toLowerCase())
          );
          
          if (hasPrivateIndicator && !hasPublicKeyword) {
            return true;
          }
          
          return !hasPublicKeyword;
        });
        
        allCompetitors = [...allCompetitors, ...filteredResults];
        nextPageToken = placesData.next_page_token;
        pageCount++;
        
        console.log(`✅ Page ${pageCount} processed:`, {
          page_results: filteredResults.length,
          total_competitors: allCompetitors.length,
          has_next_page: !!nextPageToken
        });
      } else {
        console.log('❌ Stopping pagination due to API error or no results');
        break;
      }
    }

    const competitors = allCompetitors as PlaceResult[];
    console.log('🏫 Final school search results:', {
      total_found: competitors.length,
      radius_km: radius / 1000,
      pages_processed: pageCount
    });

    // Enrich competitors with pricing data
    const enrichedCompetitors = await enrichWithPricingData(competitors);
    
    // Perform market analysis with enriched data
    const analysis = performMarketAnalysis(enrichedCompetitors);

    console.log(`✅ Market analysis completed successfully: {
  execution_time_ms: ${Date.now() - startTime},
  total_competitors: ${analysis.total_competitors},
  average_rating: ${analysis.average_rating},
  schools_with_pricing: ${analysis.pricing_insights.schools_with_pricing},
  timestamp: "${new Date().toISOString()}"
}`);

    clearTimeout(timeoutId);
    return new Response(
      JSON.stringify({
        competitors: enrichedCompetitors,
        analysis,
        center_coordinates: {
          lat: location.lat,
          lng: location.lng
        },
        metadata: {
          search_location: {
            address: geocodeData.results[0].formatted_address,
            coordinates: { lat: location.lat, lng: location.lng }
          },
          filtering_stats: {
            total_schools_found: placesData.results.length,
            private_schools_kept: allCompetitors.length,
            confidence_level: allCompetitors.length > 10 ? 'high' : 'medium',
            filters_applied: [
              'enhanced_keyword_matching',
              'name_normalization',
              'private_school_heuristics',
              'composite_score_validation',
              'known_network_whitelist'
            ],
            phases_implemented: [
              'phase_1_expanded_keywords',
              'phase_2_private_indicators',
              'phase_3_optimized_api_keywords',
              'phase_4_composite_score',
              'phase_5_network_whitelist'
            ],
            validation_layers: validationStats,
            ambiguous_schools_found: validationStats.ambiguous_found,
            confidence_breakdown: validationStats.confidence_breakdown
          }
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const executionTime = Date.now() - startTime;
    const error = e as Error;
    
    // Handle timeout error specifically
    if (error.name === 'AbortError') {
      console.error('⏰ Request timeout after 25 seconds');
      return new Response(
        JSON.stringify({ 
          error: 'Request timeout',
          details: 'A análise demorou muito para completar. Tente novamente.',
          execution_time_ms: executionTime
        }),
        { 
          status: 408, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.error('❌ Error in market analysis:', {
      error: error.message || 'Unknown error',
      execution_time_ms: executionTime,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        execution_time_ms: executionTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})