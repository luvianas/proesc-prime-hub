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

    console.log('🔍 Smart-task: Zendesk credentials check:', {
      has_oauth_token: !!ZENDESK_OAUTH_TOKEN,
      oauth_token_length: ZENDESK_OAUTH_TOKEN?.length || 0,
      has_api_token: !!ZENDESK_API_TOKEN,
      has_subdomain: !!ZENDESK_SUBDOMAIN,
      subdomain_value: ZENDESK_SUBDOMAIN,
      has_email: !!ZENDESK_EMAIL,
      email_value: ZENDESK_EMAIL
    });

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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, name, email, role')
      .eq('user_id', user.id)
      .single();
    
    // Get school customizations separately if user has school_id
    let schoolCustomizations = null;
    if (profile?.school_id) {
      const { data: schoolData } = await supabase
        .from('school_customizations')
        .select('zendesk_external_id, school_name, zendesk_integration_url')
        .eq('school_id', profile.school_id)
        .single();
      schoolCustomizations = schoolData;
    }

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
    
    // Get external_id from zendesk_external_id
    const externalId = schoolCustomizations?.zendesk_external_id;
    
    console.log('🏢 Smart-task: School customization details:', {
      zendesk_external_id: externalId,
      zendesk_integration_url: schoolCustomizations?.zendesk_integration_url,
      school_name: schoolCustomizations?.school_name,
      school_customizations_object: schoolCustomizations
    });
    
    const schoolName = schoolCustomizations?.school_name;
    
    console.log('🎯 Smart-task: Processing request:', {
      action,
      school_id: schoolId,
      external_id: externalId,
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

    // Check if external ID is configured for the school
    if (schoolId && !externalId) {
      return new Response(JSON.stringify({ 
        error: 'external_id_not_configured',
        message: 'External ID do Zendesk não configurado para esta escola',
        tickets: [],
        debug_info: {
          school_id: schoolId,
          school_customizations: schoolCustomizations,
          zendesk_external_id: externalId
        }
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
        console.log(`🎯 Smart-task: Fetching tickets for external_id ${externalId}`);
        
        // Try multiple strategies to get tickets
        let fetchUrl = '';
        let fetchResponse;
        let fetchData;
        let searchAttempts = [];

        // Strategy 1: Test API connectivity first
        console.log('📋 Smart-task: Testing Zendesk API connectivity...');
        try {
          const testUrl = `${zendeskUrl}/tickets.json?per_page=1`;
          const testResponse = await fetch(testUrl, { headers: zendeskHeaders });
          const testResult = await testResponse.json();
          
          searchAttempts.push({
            strategy: 'api_test',
            url: testUrl,
            status: testResponse.status,
            success: testResponse.ok,
            error: !testResponse.ok ? testResult : null
          });

          console.log(`🔍 API Test Result: ${testResponse.status}`, {
            success: testResponse.ok,
            has_data: testResult.tickets?.length > 0,
            sample_ticket: testResult.tickets?.[0]?.id
          });

          if (!testResponse.ok) {
            console.error('❌ API connectivity failed:', testResult);
          }
        } catch (error) {
          console.error('💥 API test failed:', error);
          searchAttempts.push({
            strategy: 'api_test',
            error: error.message
          });
        }

        // Strategy 2: Organization External ID search (Sensedata pattern)
        if (tickets.length === 0 && externalId) {
          fetchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket organization_external_id:${externalId}`)}&sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Strategy 2 - Organization external_id search');
          console.log(`🔗 URL: ${fetchUrl}`);
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            searchAttempts.push({
              strategy: 'organization_external_id',
              url: fetchUrl,
              status: fetchResponse.status,
              ticket_count: fetchData.results?.length || 0,
              success: fetchResponse.ok && (fetchData.results?.length > 0)
            });
            
            console.log(`📊 Organization external_id search result:`, {
              status: fetchResponse.status,
              success: fetchResponse.ok,
              results_count: fetchData.results?.length || 0,
              error: fetchData.error || null
            });

            if (fetchResponse.ok && fetchData.results?.length > 0) {
              tickets = fetchData.results;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via organization_external_id`);
            } else {
              console.log(`⚠️ Smart-task: Organization_external_id search failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: Organization_external_id search error:', error);
            searchAttempts.push({
              strategy: 'organization_external_id',
              url: fetchUrl,
              error: error.message
            });
          }
        }

        // Strategy 3: Direct organization ID search (try zendesk_integration_url as org ID)
        if (tickets.length === 0 && schoolCustomizations?.zendesk_integration_url) {
          const organizationId = schoolCustomizations.zendesk_integration_url;
          fetchUrl = `${zendeskUrl}/organizations/${organizationId}/tickets.json?sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Strategy 3 - Direct organization ID search');
          console.log(`🔗 URL: ${fetchUrl}`);
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            searchAttempts.push({
              strategy: 'organization_id_direct',
              url: fetchUrl,
              status: fetchResponse.status,
              ticket_count: fetchData.tickets?.length || 0,
              success: fetchResponse.ok && (fetchData.tickets?.length > 0)
            });
            
            console.log(`📊 Organization ID direct search result:`, {
              status: fetchResponse.status,
              success: fetchResponse.ok,
              tickets_count: fetchData.tickets?.length || 0,
              error: fetchData.error || null
            });

            if (fetchResponse.ok && fetchData.tickets?.length > 0) {
              tickets = fetchData.tickets;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via organization ID`);
            } else {
              console.log(`⚠️ Smart-task: Organization ID search failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: Organization ID search error:', error);
            searchAttempts.push({
              strategy: 'organization_id_direct',
              url: fetchUrl,
              error: error.message
            });
          }
        }

        // Strategy 4: Search by external_id in ticket fields
        if (tickets.length === 0 && externalId) {
          fetchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "${externalId}"`)}&sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Strategy 4 - External ID in ticket content search');
          console.log(`🔗 URL: ${fetchUrl}`);
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            searchAttempts.push({
              strategy: 'external_id_content',
              url: fetchUrl,
              status: fetchResponse.status,
              ticket_count: fetchData.results?.length || 0,
              success: fetchResponse.ok && (fetchData.results?.length > 0)
            });
            
            console.log(`📊 External ID content search result:`, {
              status: fetchResponse.status,
              success: fetchResponse.ok,
              results_count: fetchData.results?.length || 0
            });

            if (fetchResponse.ok && fetchData.results?.length > 0) {
              tickets = fetchData.results;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via external_id content search`);
            }
          } catch (error) {
            console.error('❌ Smart-task: External ID content search error:', error);
            searchAttempts.push({
              strategy: 'external_id_content',
              url: fetchUrl,
              error: error.message
            });
          }
        }

        // Strategy 5: Search by school name
        if (tickets.length === 0 && schoolName) {
          fetchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "${schoolName}"`)}&sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Strategy 5 - School name search');
          console.log(`🔗 URL: ${fetchUrl}`);
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            searchAttempts.push({
              strategy: 'school_name',
              url: fetchUrl,
              status: fetchResponse.status,
              ticket_count: fetchData.results?.length || 0,
              success: fetchResponse.ok && (fetchData.results?.length > 0)
            });
            
            console.log(`📊 School name search result:`, {
              status: fetchResponse.status,
              success: fetchResponse.ok,
              results_count: fetchData.results?.length || 0
            });

            if (fetchResponse.ok && fetchData.results?.length > 0) {
              tickets = fetchData.results;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via school name search`);
            } else {
              console.log(`⚠️ Smart-task: School name search failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: School name search error:', error);
            searchAttempts.push({
              strategy: 'school_name',
              url: fetchUrl,
              error: error.message
            });
          }
        }

        // Strategy 6: Admin gets all tickets (if user is admin and no school specific results)
        if (tickets.length === 0 && profile.role === 'admin') {
          fetchUrl = `${zendeskUrl}/tickets.json?sort_by=created_at&sort_order=desc&per_page=100`;
          console.log('📋 Smart-task: Strategy 6 - Admin fallback - getting all tickets');
          
          try {
            fetchResponse = await fetch(fetchUrl, { headers: zendeskHeaders });
            fetchData = await fetchResponse.json();
            
            searchAttempts.push({
              strategy: 'admin_all_tickets',
              url: fetchUrl,
              status: fetchResponse.status,
              ticket_count: fetchData.tickets?.length || 0,
              success: fetchResponse.ok && (fetchData.tickets?.length > 0)
            });
            
            if (fetchResponse.ok && fetchData.tickets?.length > 0) {
              tickets = fetchData.tickets;
              console.log(`✅ Smart-task: Found ${tickets.length} tickets via admin listing`);
            } else {
              console.log(`⚠️ Smart-task: Admin listing failed or returned no tickets`);
            }
          } catch (error) {
            console.error('❌ Smart-task: Admin listing error:', error);
            searchAttempts.push({
              strategy: 'admin_all_tickets',
              url: fetchUrl,
              error: error.message
            });
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

        console.log(`🎯 Smart-task: Final result - returning ${transformedTickets.length} tickets`);
        console.log(`📈 Search attempts summary:`, searchAttempts);

        return new Response(JSON.stringify({ 
          tickets: transformedTickets,
          total_count: transformedTickets.length,
          external_id: externalId,
          school_name: schoolName,
          user_role: profile.role,
          debug_info: {
            strategies_used: tickets.length > 0 ? 'success' : 'all_failed',
            final_url: fetchUrl,
            auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token',
            search_attempts: searchAttempts,
            zendesk_credentials: {
              has_oauth: !!ZENDESK_OAUTH_TOKEN,
              has_api_token: !!ZENDESK_API_TOKEN,
              subdomain: ZENDESK_SUBDOMAIN,
              email: ZENDESK_EMAIL
            }
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

        // Build search query with organization_external_id filter if available
        let searchQuery = `type:ticket ${query}`;
        if (externalId) {
          searchQuery += ` organization_external_id:${externalId}`;
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
            external_id: externalId
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