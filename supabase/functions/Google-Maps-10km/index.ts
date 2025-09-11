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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, radius = 10000 }: MarketAnalysisRequest = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('Maps Platform API Key');
    if (!apiKey) {
      console.error('Google Maps API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Using Google Maps API key:', apiKey.substring(0, 10) + '...');

    // First, geocode the address to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results.length) {
      return new Response(
        JSON.stringify({ error: 'Could not geocode the provided address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = geocodeData.results[0].geometry.location;
    console.log(`Geocoded address: ${address} to coordinates: ${location.lat}, ${location.lng}`);

    // Search for schools within the specified radius
    // Use multiple searches to get more results
    let allCompetitors: PlaceResult[] = [];
    let nextPageToken = null;
    
    // First search
    let placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=school&key=${apiKey}`;
    let placesResponse = await fetch(placesUrl);
    let placesData = await placesResponse.json();
    
    if (placesData.status !== 'OK') {
      console.error('Places API error:', placesData.status, placesData.error_message);
      return new Response(
        JSON.stringify({ error: `Places API error: ${placesData.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    allCompetitors = [...placesData.results];
    nextPageToken = placesData.next_page_token;
    
    // Get additional pages if available (up to 60 results total)
    while (nextPageToken && allCompetitors.length < 60) {
      // Wait 2 seconds before next request (Google requirement)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
      placesResponse = await fetch(placesUrl);
      placesData = await placesResponse.json();
      
      if (placesData.status === 'OK' && placesData.results) {
        allCompetitors = [...allCompetitors, ...placesData.results];
        nextPageToken = placesData.next_page_token;
      } else {
        break;
      }
    }

    const competitors = allCompetitors as PlaceResult[];
    console.log(`Found ${competitors.length} schools within ${radius/1000}km`);

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

    console.log('Market analysis completed successfully');
    
    return new Response(
      JSON.stringify(analysis),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in market analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});