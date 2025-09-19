import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SchoolPricingRequest {
  schoolName: string;
  city: string;
  state: string;
  placeId?: string;
}

interface PricingData {
  monthly_fee?: number;
  annual_fee?: number;
  enrollment_fee?: number;
  price_range: 'budget' | 'moderate' | 'expensive' | 'luxury';
  confidence_score: number;
  data_source: string;
  raw_data: Record<string, any>;
}

async function scrapeSchoolPricing(schoolName: string, city: string, state: string): Promise<PricingData | null> {
  console.log(`🔍 Searching for pricing data: ${schoolName} in ${city}, ${state}`);
  
  try {
    // Construct search URL for melhorescola.com.br
    const searchTerm = `${schoolName} ${city} ${state}`;
    const searchUrl = `https://www.melhorescola.com.br/busca?q=${encodeURIComponent(searchTerm)}`;
    
    console.log(`📡 Making request to: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5,en-US;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.log(`❌ Failed to fetch from melhorescola.com.br: ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log(`✅ Received HTML response (${html.length} characters)`);

    // Parse the HTML to extract pricing information
    // This is a simplified approach - in production you'd want more robust parsing
    const pricingData = extractPricingFromHTML(html, schoolName);
    
    if (pricingData) {
      console.log(`💰 Found pricing data:`, pricingData);
      return pricingData;
    }

    // Fallback: Try to estimate based on similar schools
    const estimatedData = await estimatePricing(city, state);
    if (estimatedData) {
      console.log(`📊 Using estimated pricing data:`, estimatedData);
      return estimatedData;
    }

    console.log(`❌ No pricing data found for ${schoolName}`);
    return null;

  } catch (error) {
    console.error(`❌ Error scraping pricing data:`, error);
    return null;
  }
}

function extractPricingFromHTML(html: string, schoolName: string): PricingData | null {
  try {
    // Look for common pricing patterns in Brazilian school websites
    const monthlyFeePatterns = [
      /mensalidade[^R$]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
      /valor[^R$]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
      /preço[^R$]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    ];

    let monthlyFee: number | undefined;
    let confidence = 30; // Low confidence for scraped data

    for (const pattern of monthlyFeePatterns) {
      const match = pattern.exec(html);
      if (match) {
        const priceStr = match[1].replace(/\./g, '').replace(',', '.');
        const price = parseFloat(priceStr);
        if (price > 0 && price < 10000) { // Reasonable range for monthly fees
          monthlyFee = price;
          confidence = 70;
          console.log(`💰 Extracted monthly fee: R$ ${price}`);
          break;
        }
      }
    }

    if (monthlyFee) {
      const priceRange = getPriceRange(monthlyFee);
      return {
        monthly_fee: monthlyFee,
        annual_fee: monthlyFee * 12,
        price_range: priceRange,
        confidence_score: confidence,
        data_source: 'melhorescola',
        raw_data: { extracted_price: monthlyFee, source_url: 'melhorescola.com.br' }
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting pricing from HTML:', error);
    return null;
  }
}

function getPriceRange(monthlyFee: number): 'budget' | 'moderate' | 'expensive' | 'luxury' {
  if (monthlyFee <= 500) return 'budget';
  if (monthlyFee <= 1200) return 'moderate';
  if (monthlyFee <= 2500) return 'expensive';
  return 'luxury';
}

async function estimatePricing(city: string, state: string): Promise<PricingData | null> {
  try {
    console.log(`📊 Estimating pricing for ${city}, ${state}`);
    
    // Get existing pricing data for the same city/state
    const { data: existingData, error } = await supabase
      .from('school_pricing_data')
      .select('monthly_fee, price_range')
      .eq('city', city)
      .eq('state', state)
      .not('monthly_fee', 'is', null)
      .limit(10);

    if (error) {
      console.error('Error fetching existing pricing data:', error);
      return null;
    }

    if (existingData && existingData.length > 0) {
      const fees = existingData.filter(d => d.monthly_fee).map(d => d.monthly_fee!);
      const averageFee = fees.reduce((sum, fee) => sum + fee, 0) / fees.length;
      
      console.log(`📊 Estimated monthly fee based on ${fees.length} local schools: R$ ${averageFee}`);
      
      return {
        monthly_fee: Math.round(averageFee),
        annual_fee: Math.round(averageFee * 12),
        price_range: getPriceRange(averageFee),
        confidence_score: 40,
        data_source: 'estimated',
        raw_data: { 
          estimation_method: 'local_average', 
          sample_size: fees.length,
          city,
          state 
        }
      };
    }

    // Fallback to general Brazilian private school estimates by region
    const regionalEstimates = {
      'SP': 1500, 'RJ': 1400, 'MG': 800, 'RS': 900, 'PR': 800,
      'SC': 850, 'GO': 700, 'DF': 1200, 'BA': 600, 'PE': 550,
      'CE': 500, 'PA': 450, 'MA': 400, 'PB': 400, 'AL': 380,
      'SE': 380, 'RN': 420, 'PI': 350, 'AC': 500, 'AM': 500,
      'AP': 450, 'RO': 450, 'RR': 500, 'TO': 450, 'ES': 750,
      'MT': 650, 'MS': 700
    };

    const estimatedFee = regionalEstimates[state as keyof typeof regionalEstimates] || 600;
    
    console.log(`📊 Using regional estimate for ${state}: R$ ${estimatedFee}`);
    
    return {
      monthly_fee: estimatedFee,
      annual_fee: estimatedFee * 12,
      price_range: getPriceRange(estimatedFee),
      confidence_score: 25,
      data_source: 'estimated',
      raw_data: { 
        estimation_method: 'regional_average',
        state,
        city 
      }
    };
  } catch (error) {
    console.error('Error estimating pricing:', error);
    return null;
  }
}

async function savePricingData(
  schoolName: string, 
  city: string, 
  state: string, 
  pricingData: PricingData,
  placeId?: string
) {
  try {
    console.log(`💾 Saving pricing data for ${schoolName}`);
    
    const { data, error } = await supabase
      .from('school_pricing_data')
      .upsert({
        school_name: schoolName,
        city,
        state,
        place_id: placeId,
        monthly_fee: pricingData.monthly_fee,
        annual_fee: pricingData.annual_fee,
        enrollment_fee: pricingData.enrollment_fee,
        price_range: pricingData.price_range,
        data_source: pricingData.data_source,
        confidence_score: pricingData.confidence_score,
        raw_data: pricingData.raw_data,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'school_name,city,state'
      })
      .select();

    if (error) {
      console.error('Error saving pricing data:', error);
      return false;
    }

    console.log(`✅ Successfully saved pricing data:`, data);
    return true;
  } catch (error) {
    console.error('Error in savePricingData:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 Starting school pricing enrichment request at: ${new Date().toISOString()}`);

    const { schoolName, city, state, placeId }: SchoolPricingRequest = await req.json();

    if (!schoolName || !city || !state) {
      console.log('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: schoolName, city, state' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📍 Processing school: ${schoolName} in ${city}, ${state}`);

    // Check if we already have recent pricing data
    const { data: existingData } = await supabase
      .from('school_pricing_data')
      .select('*')
      .eq('school_name', schoolName)
      .eq('city', city)
      .eq('state', state)
      .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .single();

    if (existingData) {
      console.log(`✅ Using existing pricing data from cache`);
      return new Response(
        JSON.stringify({
          success: true,
          data: existingData,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape new pricing data
    const pricingData = await scrapeSchoolPricing(schoolName, city, state);
    
    if (pricingData) {
      await savePricingData(schoolName, city, state, pricingData, placeId);
      
      console.log(`✅ School pricing enrichment completed successfully`);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            school_name: schoolName,
            city,
            state,
            place_id: placeId,
            ...pricingData
          },
          cached: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`❌ No pricing data found for ${schoolName}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No pricing data found',
          schoolName,
          city,
          state
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error in school pricing enrichment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);