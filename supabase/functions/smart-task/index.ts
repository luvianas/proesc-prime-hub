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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZENDESK_OAUTH_TOKEN = Deno.env.get('ZENDESK_OAUTH_TOKEN');
    const ZENDESK_API_TOKEN = Deno.env.get('ZENDESK_API_TOKEN');
    const ZENDESK_SUBDOMAIN = Deno.env.get('ZENDESK_SUBDOMAIN');
    const ZENDESK_EMAIL = Deno.env.get('ZENDESK_EMAIL');

    // Check for Zendesk credentials
    if ((!ZENDESK_API_TOKEN && !ZENDESK_OAUTH_TOKEN) || !ZENDESK_SUBDOMAIN) {
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

    // Get user profile and school info with organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        school_id, name, email, role,
        school_customizations!profiles_school_id_fkey(zendesk_integration_url, school_name)
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User profile not found');
    }

    console.log('🏫 Smart-task: User profile loaded:', {
      user_id: user.id,
      school_id: profile.school_id,
      role: profile.role,
      email: profile.email
    });

    const { action = 'list_tickets', ...body } = await req.json();
    const schoolId = profile.school_id;
    
    // Get organization_id directly from zendesk_integration_url (no mapping needed)
    const organizationId = profile.school_customizations?.[0]?.zendesk_integration_url;
    
    console.log('🏢 Smart-task: Organization details:', {
      zendesk_integration_url: organizationId,
      organization_will_be_used: organizationId || 'none',
      school_customizations: profile.school_customizations?.[0] || 'none'
    });
    
    const schoolName = profile.school_customizations?.[0]?.school_name;
    
    console.log('🎯 Smart-task: Processing request:', {
      action,
      school_id: schoolId,
      organization_id: organizationId,
      user_role: profile.role,
      school_name: schoolName
    });

    // Handle users without school association (except admins)
    if (!schoolId && profile.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'user_without_school',
        message: 'Usuário não está associado a uma escola',
        tickets: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if organization ID is configured for the school
    if (schoolId && !organizationId) {
      return new Response(JSON.stringify({ 
        error: 'organization_not_configured',
        message: 'ID da organização do Zendesk não configurado para esta escola',
        tickets: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Zendesk API base URL
    const zendeskUrl = `https://proesc.zendesk.com/api/v2`;
    
    // Set up authentication headers
    let zendeskHeaders: { [key: string]: string };
    
    if (ZENDESK_OAUTH_TOKEN) {
      console.log('🔑 Smart-task: Using OAuth token');
      zendeskHeaders = {
        'Authorization': `Bearer ${ZENDESK_OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      };
    } else {
      console.log('🔑 Smart-task: Using API token');
      const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
      zendeskHeaders = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      };
    }

    let tickets: any[] = [];

    switch (action) {
      case 'list_tickets':
        console.log(`🎯 Smart-task: Fetching tickets for organization ${organizationId}`);
        
        // Try multiple strategies to get tickets
        let fetchUrl = '';
        let fetchResponse;
        let fetchData;

        // Strategy 1: Organization-based listing (preferred)
        if (organizationId) {
          fetchUrl = `${zendeskUrl}/organizations/${organizationId}/tickets.json?sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Trying organization-based listing');
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            if (fetchResponse.ok && fetchData.tickets?.length > 0) {
              tickets = fetchData.tickets;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via organization`);
            } else {
              console.log(`⚠️ Smart-task: Organization listing failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: Organization listing error:', error);
          }
        }

        // Strategy 2: Search by school name if organization method failed
        if (tickets.length === 0 && schoolName) {
          fetchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "${schoolName}"`)}&sort_by=created_at&sort_order=desc`;
          console.log('📋 Smart-task: Trying school name search');
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            if (fetchResponse.ok && fetchData.results?.length > 0) {
              tickets = fetchData.results;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via school name search`);
            } else {
              console.log(`⚠️ Smart-task: School name search failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: School name search error:', error);
          }
        }

        // Strategy 3: Admin gets all tickets (if user is admin and no school specific results)
        if (tickets.length === 0 && profile.role === 'admin') {
          fetchUrl = `${zendeskUrl}/tickets.json?sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Admin fallback - getting all tickets');
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            if (fetchResponse.ok && fetchData.tickets?.length > 0) {
              tickets = fetchData.tickets;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via admin listing`);
            } else {
              console.log(`⚠️ Smart-task: Admin listing failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: Admin listing error:', error);
          }
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
          organization_id: ticket.organization_id,
          requester_id: ticket.requester_id,
          assignee_id: ticket.assignee_id,
          tags: ticket.tags
        }));

        console.log(`🎯 Smart-task: Returning ${transformedTickets.length} tickets`);

        return new Response(JSON.stringify({ 
          tickets: transformedTickets,
          total_count: transformedTickets.length,
          organization_id: organizationId,
          school_name: schoolName,
          user_role: profile.role,
          debug_info: {
            strategies_used: tickets.length > 0 ? 'success' : 'all_failed',
            final_url: fetchUrl,
            auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token'
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

      case 'search_tickets':
        const query = body.query;
        if (!query) {
          return new Response(JSON.stringify({ 
            error: 'search query is required' 
          }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        // Build search query with organization filter if available
        let searchQuery = `type:ticket ${query}`;
        if (organizationId) {
          searchQuery += ` organization:${organizationId}`;
        }

        const searchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(searchQuery)}&sort_by=created_at&sort_order=desc`;
        console.log(`🔍 Smart-task: Searching tickets with query: ${searchQuery}`);
        
        try {
          const searchResponse = await fetch(searchUrl, { headers: zendeskHeaders });
          const searchData = await searchResponse.json();
          
          if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status}`);
          }

          const searchResults: Ticket[] = (searchData.results || []).map((ticket: any) => ({
            id: ticket.id.toString(),
            title: ticket.subject || 'Sem título',
            description: ticket.description || '',
            status: mapZendeskStatus(ticket.status),
            priority: mapZendeskPriority(ticket.priority),
            created: ticket.created_at,
            category: ticket.type || 'question',
            zendesk_id: ticket.id,
            zendesk_url: ticket.url,
            organization_id: ticket.organization_id,
            requester_id: ticket.requester_id,
            assignee_id: ticket.assignee_id,
            tags: ticket.tags
          }));

          console.log(`🔍 Smart-task: Search found ${searchResults.length} tickets`);

          return new Response(JSON.stringify({ 
            tickets: searchResults,
            total_count: searchResults.length,
            search_query: searchQuery,
            organization_id: organizationId
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        } catch (error) {
          console.error('❌ Smart-task: Search error:', error);
          return new Response(JSON.stringify({ 
            error: 'Search failed',
            details: error.message 
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Supported actions: list_tickets, search_tickets' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

  } catch (error) {
    console.error('💥 Smart-task: Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});