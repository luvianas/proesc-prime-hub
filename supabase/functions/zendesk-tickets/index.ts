import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created: string;
  category: string;
  zendesk_id?: number;
  zendesk_url?: string;
  organization_id?: string;
  requester_id?: string;
  assignee_id?: string;
  tags?: string[];
}

const mapZendeskStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'new': 'Pendente',
    'open': 'Em Andamento',
    'pending': 'Pendente',
    'hold': 'Em Espera',
    'solved': 'Resolvido',
    'closed': 'Fechado'
  };
  return statusMap[status] || status;
};

const mapZendeskPriority = (priority: string): string => {
  const priorityMap: { [key: string]: string } = {
    'low': 'Baixa',
    'normal': 'Normal',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  return priorityMap[priority] || priority;
};

serve(async (req) => {
  console.log('🚀 Zendesk-tickets: Function started at', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZENDESK_API_TOKEN = Deno.env.get('ZENDESK_API_TOKEN');
    const ZENDESK_SUBDOMAIN = Deno.env.get('ZENDESK_SUBDOMAIN');
    const ZENDESK_EMAIL = Deno.env.get('ZENDESK_EMAIL');

    console.log('🔍 Zendesk-tickets: Checking credentials:', {
      has_api_token: !!ZENDESK_API_TOKEN,
      has_subdomain: !!ZENDESK_SUBDOMAIN,
      subdomain: ZENDESK_SUBDOMAIN,
      has_email: !!ZENDESK_EMAIL,
      email: ZENDESK_EMAIL
    });

    // Check for required Zendesk credentials
    if (!ZENDESK_API_TOKEN || !ZENDESK_SUBDOMAIN || !ZENDESK_EMAIL) {
      console.error('❌ Missing Zendesk credentials');
      throw new Error('Zendesk credentials not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user info from Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, name, email, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User profile not found');
    }

    // Get school customizations to find organization_id
    let schoolCustomizations = null;
    if (profile?.school_id) {
      const { data: schoolData } = await supabase
        .from('school_customizations')
        .select('organization_id, school_name')
        .eq('school_id', profile.school_id)
        .single();
      schoolCustomizations = schoolData;
    }

    console.log('🏫 Zendesk-tickets: User profile loaded:', {
      user_id: user.id,
      school_id: profile.school_id,
      role: profile.role,
      organization_id: schoolCustomizations?.organization_id
    });

    // Handle users without school association (except admins)
    if (!profile.school_id && profile.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'user_without_school',
        message: 'Usuário não está associado a uma escola',
        tickets: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if organization_id is configured for the school
    if (profile.school_id && (!schoolCustomizations?.organization_id || schoolCustomizations.organization_id === null)) {
      return new Response(JSON.stringify({ 
        error: 'organization_id_not_configured',
        message: 'Organization ID do Zendesk não configurado para esta escola',
        tickets: [],
        debug_info: {
          school_id: profile.school_id,
          school_customizations: schoolCustomizations
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const organizationId = schoolCustomizations?.organization_id;
    
    console.log('🎯 Zendesk-tickets: Using organization_id:', organizationId);
    
    // Zendesk API base URL
    const zendeskUrl = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`;
    
    // Set up authentication headers with API token
    const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
    const zendeskHeaders = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };

    console.log('🎯 Zendesk-tickets: Fetching tickets for organization_id:', organizationId);
    
    // Use the specific endpoint for organization tickets
    const fetchUrl = `${zendeskUrl}/organizations/${organizationId}/tickets.json`;
    
    try {
      const fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
      const fetchData = await fetchResponse.json();
      
      console.log(`📊 Organization tickets result:`, {
        status: fetchResponse.status,
        success: fetchResponse.ok,
        tickets_count: fetchData.tickets?.length || 0,
        error: fetchData.error || null
      });

      let tickets: any[] = [];
      
      if (fetchResponse.ok && fetchData.tickets?.length > 0) {
        tickets = fetchData.tickets;
        console.log(`✅ Zendesk-tickets: Found ${tickets.length} tickets via organization endpoint`);
      } else if (!fetchResponse.ok) {
        console.error(`❌ Zendesk-tickets: API error:`, fetchData);
        return new Response(JSON.stringify({ 
          error: 'zendesk_api_error',
          message: fetchData.error?.message || 'Erro ao consultar API do Zendesk',
          tickets: [],
          debug_info: {
            status: fetchResponse.status,
            response: fetchData
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log(`⚠️ Zendesk-tickets: No tickets found for organization ${organizationId}`);
      }

      // Transform tickets to our format
      const transformedTickets: Ticket[] = tickets.map((ticket: any) => ({
        id: ticket.id.toString(),
        title: ticket.subject || 'Sem título',
        description: ticket.description || '',
        status: mapZendeskStatus(ticket.status),
        priority: mapZendeskPriority(ticket.priority),
        created: ticket.created_at,
        category: ticket.type || 'question',
        zendesk_id: ticket.id,
        zendesk_url: ticket.url,
        organization_id: ticket.organization_id?.toString(),
        requester_id: ticket.requester_id?.toString(),
        assignee_id: ticket.assignee_id?.toString(),
        tags: ticket.tags
      }));

      console.log(`🎯 Zendesk-tickets: Returning ${transformedTickets.length} tickets`);

      return new Response(JSON.stringify({ 
        tickets: transformedTickets,
        total_count: transformedTickets.length,
        organization_id: organizationId,
        school_name: schoolCustomizations?.school_name,
        user_role: profile.role
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      console.error('❌ Zendesk-tickets: Fetch error:', error);
      return new Response(JSON.stringify({ 
        error: 'fetch_failed',
        message: 'Erro ao conectar com o Zendesk',
        details: error.message,
        tickets: []
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

  } catch (error) {
    console.error('💥 Zendesk-tickets: Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});