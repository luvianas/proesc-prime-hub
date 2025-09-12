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
}

interface MarketAnalysisRequest {
  address: string;
  radius?: number; // radius in meters, default 10000 (10km)
}

interface MarketAnalysisResponse {
  competitors: PlaceResult[];
  analysis: {
    total_competitors: number;
    average_rating: number;
    price_distribution: {
      budget: number;
      moderate: number;
      expensive: number;
      luxury: number;
    };
    insights: string[];
  };
  center_coordinates: {
    lat: number;
    lng: number;
  };
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('🚀 Starting market analysis request at:', new Date().toISOString());
  
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
    
    // First search - using keyword "escola particular" to focus on private schools
    let placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&keyword=escola%20particular&type=school&key=${apiKey}`;
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
    
    // Filter out public schools based on name patterns
    const filteredResults = placesData.results.filter((place: PlaceResult) => {
      const name = place.name.toLowerCase();
      // Filter out public schools keywords
      const publicSchoolKeywords = [
        'emef', 'emei', 'emeif', 'cemei', 'municipal', 'estadual', 'federal',
        'pública', 'publica', 'governo', 'prefeitura', 'sec.', 'secretaria',
        'colégio estadual', 'escola estadual', 'escola municipal', 'creche municipal'
      ];
      
      return !publicSchoolKeywords.some(keyword => name.includes(keyword));
    });
    
    allCompetitors = [...filteredResults];
    nextPageToken = placesData.next_page_token;
    console.log('🔄 First page results:', {
      total_found: placesData.results?.length || 0,
      filtered_count: filteredResults.length,
      has_next_page: !!nextPageToken
    });
    
    // Get additional pages if available (up to 60 results total)
    let pageCount = 1;
    while (nextPageToken && allCompetitors.length < 60) {
      console.log(`📄 Fetching page ${pageCount + 1}...`);
      
      // Wait 2 seconds before next request (Google requirement)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
      placesResponse = await fetch(placesUrl);
      placesData = await placesResponse.json();
      
      console.log(`📡 Page ${pageCount + 1} response:`, {
        status: placesData.status,
        results_count: placesData.results?.length || 0
      });
      
      if (placesData.status === 'OK' && placesData.results) {
        // Filter out public schools from additional pages too
        const filteredResults = placesData.results.filter((place: PlaceResult) => {
          const name = place.name.toLowerCase();
          const publicSchoolKeywords = [
            'emef', 'emei', 'emeif', 'cemei', 'municipal', 'estadual', 'federal',
            'pública', 'publica', 'governo', 'prefeitura', 'sec.', 'secretaria',
            'colégio estadual', 'escola estadual', 'escola municipal', 'creche municipal'
          ];
          
          return !publicSchoolKeywords.some(keyword => name.includes(keyword));
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

    // Analyze the data
    const totalCompetitors = competitors.length;
    const ratingsData = competitors.filter(p => p.rating).map(p => p.rating!);
    const averageRating = ratingsData.length > 0 
      ? ratingsData.reduce((a, b) => a + b, 0) / ratingsData.length 
      : 0;

    // Price distribution analysis (based on price_level 0-4)
    const priceDistribution = {
      budget: competitors.filter(p => p.price_level === 0 || p.price_level === 1).length,
      moderate: competitors.filter(p => p.price_level === 2).length,
      expensive: competitors.filter(p => p.price_level === 3).length,
      luxury: competitors.filter(p => p.price_level === 4).length,
    };
    
    console.log('Price distribution:', priceDistribution);
    console.log('Competitors with price levels:', competitors.filter(p => p.price_level !== undefined).length);

    // Generate insights
    const insights: string[] = [];
    
    if (totalCompetitors === 0) {
      insights.push('Nenhum concorrente direto encontrado na região - oportunidade de mercado único');
    } else if (totalCompetitors < 5) {
      insights.push('Baixa concorrência na região - mercado com potencial de crescimento');
    } else if (totalCompetitors > 20) {
      insights.push('Alta concorrência na região - necessário diferenciação forte');
    }

    if (averageRating > 4.0) {
      insights.push('Região com escolas bem avaliadas - padrão de qualidade elevado');
    } else if (averageRating < 3.5) {
      insights.push('Oportunidade de se destacar com melhor qualidade de ensino');
    }

    if (priceDistribution.budget > priceDistribution.expensive + priceDistribution.luxury) {
      insights.push('Mercado focado em preços acessíveis');
    } else if (priceDistribution.expensive + priceDistribution.luxury > priceDistribution.budget) {
      insights.push('Mercado premium - clientes dispostos a pagar por qualidade');
    }

    const analysis: MarketAnalysisResponse = {
      competitors,
      analysis: {
        total_competitors: totalCompetitors,
        average_rating: Math.round(averageRating * 100) / 100,
        price_distribution: priceDistribution,
        insights
      },
      center_coordinates: {
        lat: location.lat,
        lng: location.lng
      }
    };

    const executionTime = Date.now() - startTime;
    console.log('✅ Market analysis completed successfully:', {
      execution_time_ms: executionTime,
      total_competitors: totalCompetitors,
      average_rating: Math.round(averageRating * 100) / 100,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify(analysis),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
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
});