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
  requester_name?: string;
  requester_email?: string;
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

// Convert scientific notation to integer for organization_id
const normalizeOrganizationId = (orgId: any): string | null => {
  if (!orgId) return null;
  
  // If it's already a string and looks like an integer, return as-is
  if (typeof orgId === 'string' && /^\d+$/.test(orgId)) {
    return orgId;
  }
  
  // If it's a number (including scientific notation), convert to integer string
  if (typeof orgId === 'number') {
    return Math.round(orgId).toString();
  }
  
  // Try to parse as float and convert to integer
  const parsed = parseFloat(orgId.toString());
  if (!isNaN(parsed)) {
    return Math.round(parsed).toString();
  }
  
  return null;
};

// Test Zendesk connectivity and credentials
const testZendeskConnection = async (subdomain: string, email: string, token: string) => {
  // Remove .zendesk.com if already present to avoid duplication
  const cleanSubdomain = subdomain.replace(/\.zendesk\.com$/, '');
  const testUrl = `https://${cleanSubdomain}.zendesk.com/api/v2/users/me.json`;
  const credentials = btoa(`${email}/token:${token}`);
  
  try {
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      user: response.ok ? data.user : null,
      error: !response.ok ? data.error || data.description : null
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      user: null,
      error: `Connection failed: ${error.message}`
    };
  }
};

serve(async (req) => {
  console.log('🚀 Zendesk-tickets: Function started at', new Date().toISOString());
  console.log('🔄 Zendesk-tickets: Secrets refreshed - checking environment...');
  console.log('🔍 Environment check - Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.startsWith('ZENDESK')));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body to check for ticket details request
  const url = new URL(req.url);
  const ticketId = url.searchParams.get('ticketId');
  const action = url.searchParams.get('action');

  try {
    // Force environment refresh and fetch credentials from Supabase secrets
    const allEnvVars = Deno.env.toObject();
    console.log('🔍 Full environment variables containing ZENDESK:', Object.entries(allEnvVars).filter(([key]) => key.includes('ZENDESK')));
    
    const ZENDESK_API_TOKEN = Deno.env.get('ZENDESK_API_TOKEN');
    const ZENDESK_SUBDOMAIN = Deno.env.get('ZENDESK_SUBDOMAIN'); 
    const ZENDESK_EMAIL = Deno.env.get('ZENDESK_EMAIL');

    console.log('🔍 Zendesk-tickets: Credentials check:', {
      has_api_token: !!ZENDESK_API_TOKEN,
      token_length: ZENDESK_API_TOKEN?.length || 0,
      has_subdomain: !!ZENDESK_SUBDOMAIN,
      subdomain: ZENDESK_SUBDOMAIN,
      has_email: !!ZENDESK_EMAIL,
      email: ZENDESK_EMAIL
    });

    // Check for required Zendesk credentials with more specific error messages
    if (!ZENDESK_API_TOKEN) {
      console.error('❌ ZENDESK_API_TOKEN not found in environment');
      return new Response(JSON.stringify({ 
        error: 'missing_api_token',
        message: 'ZENDESK_API_TOKEN não está configurado nas secrets do Supabase',
        debug: 'Secret ZENDESK_API_TOKEN não encontrada no ambiente',
        tickets: []
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!ZENDESK_SUBDOMAIN) {
      console.error('❌ ZENDESK_SUBDOMAIN not found in environment');
      return new Response(JSON.stringify({ 
        error: 'missing_subdomain',
        message: 'ZENDESK_SUBDOMAIN não está configurado nas secrets do Supabase',
        debug: 'Secret ZENDESK_SUBDOMAIN não encontrada no ambiente',
        tickets: []
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!ZENDESK_EMAIL) {
      console.error('❌ ZENDESK_EMAIL not found in environment');
      return new Response(JSON.stringify({ 
        error: 'missing_email',
        message: 'ZENDESK_EMAIL não está configurado nas secrets do Supabase',
        debug: 'Secret ZENDESK_EMAIL não encontrada no ambiente',
        tickets: []
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Test Zendesk connection before proceeding
    console.log('🔍 Testing Zendesk connectivity...');
    const connectionTest = await testZendeskConnection(ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN);
    
    if (!connectionTest.success) {
      console.error('❌ Zendesk connection failed:', connectionTest);
      return new Response(JSON.stringify({ 
        error: 'zendesk_connection_failed',
        message: 'Falha na conexão com Zendesk - verifique as credenciais',
        debug: connectionTest.error,
        test_details: connectionTest,
        tickets: []
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log('✅ Zendesk connection successful:', {
      user_id: connectionTest.user?.id,
      user_email: connectionTest.user?.email,
      user_role: connectionTest.user?.role
    });

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
      
      // Normalize organization_id from scientific notation
      if (schoolCustomizations && schoolCustomizations.organization_id) {
        const normalizedOrgId = normalizeOrganizationId(schoolCustomizations.organization_id);
        console.log('🔄 Organization ID conversion:', {
          original: schoolCustomizations.organization_id,
          normalized: normalizedOrgId,
          type_original: typeof schoolCustomizations.organization_id
        });
        schoolCustomizations.organization_id = normalizedOrgId;
      }
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
    
    // Validate organization_id format
    if (organizationId && !/^\d+$/.test(organizationId)) {
      console.error('❌ Invalid organization_id format:', organizationId);
      return new Response(JSON.stringify({ 
        error: 'invalid_organization_id',
        message: 'Organization ID deve ser um número válido',
        debug: `Organization ID inválido: ${organizationId}`,
        tickets: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Dynamic Zendesk API base URL using subdomain
    // Remove .zendesk.com if already present to avoid duplication
    const cleanSubdomain = ZENDESK_SUBDOMAIN.replace(/\.zendesk\.com$/, '');
    const zendeskUrl = `https://${cleanSubdomain}.zendesk.com/api/v2`;
    console.log('🌐 Using Zendesk URL:', zendeskUrl);
    
    // Set up authentication headers with API token
    const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
    const zendeskHeaders = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };

    // Handle ticket details request
    if (action === 'get-ticket-details' && ticketId) {
      console.log('🔍 Fetching detailed information for ticket:', ticketId);
      
      try {
        // Fetch ticket details, comments, and audits in parallel
        const [ticketResponse, commentsResponse, auditsResponse] = await Promise.all([
          fetch(`${zendeskUrl}/tickets/${ticketId}.json`, { headers: zendeskHeaders }),
          fetch(`${zendeskUrl}/tickets/${ticketId}/comments.json`, { headers: zendeskHeaders }),
          fetch(`${zendeskUrl}/tickets/${ticketId}/audits.json`, { headers: zendeskHeaders })
        ]);

        if (!ticketResponse.ok) {
          throw new Error(`Ticket not found: ${ticketResponse.status}`);
        }

        const [ticketData, commentsData, auditsData] = await Promise.all([
          ticketResponse.json(),
          commentsResponse.ok ? commentsResponse.json() : { comments: [] },
          auditsResponse.ok ? auditsResponse.json() : { audits: [] }
        ]);

        // Get unique user IDs for batch fetching user data
        const userIds = new Set<string>();
        
        // Add users from comments
        commentsData.comments?.forEach((comment: any) => {
          if (comment.author_id) userIds.add(comment.author_id.toString());
        });
        
        // Add users from audits
        auditsData.audits?.forEach((audit: any) => {
          if (audit.author_id) userIds.add(audit.author_id.toString());
        });

        // Fetch user data in batch
        let usersData: { [key: string]: any } = {};
        if (userIds.size > 0) {
          const usersResponse = await fetch(
            `${zendeskUrl}/users/show_many.json?ids=${Array.from(userIds).join(',')}`, 
            { headers: zendeskHeaders }
          );
          if (usersResponse.ok) {
            const users = await usersResponse.json();
            usersData = users.users.reduce((acc: any, user: any) => {
              acc[user.id.toString()] = user;
              return acc;
            }, {});
          }
        }

        // Process comments with user data
        const processedComments = commentsData.comments?.map((comment: any) => {
          const author = usersData[comment.author_id?.toString()];
          return {
            id: comment.id,
            body: comment.body,
            html_body: comment.html_body,
            plain_body: comment.plain_body,
            public: comment.public,
            author_id: comment.author_id,
            author_name: author?.name || 'Usuário',
            author_email: author?.email || '',
            author_role: author?.role || 'end-user',
            created_at: comment.created_at,
            attachments: comment.attachments || []
          };
        }) || [];

        // Process audits with user data
        const processedAudits = auditsData.audits?.map((audit: any) => {
          const author = usersData[audit.author_id?.toString()];
          return {
            id: audit.id,
            author_id: audit.author_id,
            author_name: author?.name || 'Sistema',
            author_email: author?.email || '',
            author_role: author?.role || 'system',
            created_at: audit.created_at,
            events: audit.events || []
          };
        }) || [];

        // Transform ticket data
        const transformedTicket = {
          id: ticketData.ticket.id.toString(),
          title: ticketData.ticket.subject || 'Sem título',
          description: ticketData.ticket.description || '',
          status: mapZendeskStatus(ticketData.ticket.status),
          priority: mapZendeskPriority(ticketData.ticket.priority),
          created: ticketData.ticket.created_at,
          updated: ticketData.ticket.updated_at,
          category: ticketData.ticket.type || 'question',
          zendesk_id: ticketData.ticket.id,
          zendesk_url: ticketData.ticket.url,
          organization_id: ticketData.ticket.organization_id?.toString(),
          requester_id: ticketData.ticket.requester_id?.toString(),
          assignee_id: ticketData.ticket.assignee_id?.toString(),
          tags: ticketData.ticket.tags,
          comments: processedComments,
          audits: processedAudits
        };

        return new Response(JSON.stringify({ 
          ticket: transformedTicket,
          success: true
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

      } catch (error) {
        console.error('❌ Error fetching ticket details:', error);
        return new Response(JSON.stringify({ 
          error: 'ticket_details_failed',
          message: 'Erro ao carregar detalhes do ticket',
          details: error.message
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    console.log('🎯 Zendesk-tickets: Fetching tickets for organization_id:', organizationId);
    
    // Test if organization exists in Zendesk before fetching tickets
    const orgTestUrl = `${zendeskUrl}/organizations/${organizationId}.json`;
    console.log('🔍 Testing organization existence:', orgTestUrl);
    
    try {
      const orgTestResponse = await fetch(orgTestUrl, { headers: zendeskHeaders });
      const orgTestData = await orgTestResponse.json();
      
      if (!orgTestResponse.ok) {
        console.error('❌ Organization not found in Zendesk:', orgTestData);
        return new Response(JSON.stringify({ 
          error: 'organization_not_found',
          message: `Organização ${organizationId} não encontrada no Zendesk`,
          debug: orgTestData.error || 'Organization does not exist',
          tickets: []
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('✅ Organization validated:', {
        id: orgTestData.organization?.id,
        name: orgTestData.organization?.name
      });
    } catch (orgError) {
      console.error('❌ Error validating organization:', orgError);
      return new Response(JSON.stringify({ 
        error: 'organization_validation_failed',
        message: 'Erro ao validar organização no Zendesk',
        debug: orgError.message,
        tickets: []
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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

      // Get unique requester IDs to fetch user data in batch
      const requesterIds = [...new Set(tickets
        .map((ticket: any) => ticket.requester_id)
        .filter(Boolean)
      )];

      // Fetch requester data in batch if we have any requester IDs
      let requestersData: { [key: string]: { name: string; email: string } } = {};
      
      if (requesterIds.length > 0) {
        try {
          const requestersUrl = `${zendeskUrl}/users/show_many.json?ids=${requesterIds.join(',')}`;
          const requestersResponse = await fetch(requestersUrl, { headers: zendeskHeaders });
          
          if (requestersResponse.ok) {
            const requestersJson = await requestersResponse.json();
            requestersData = requestersJson.users.reduce((acc: any, user: any) => {
              acc[user.id.toString()] = {
                name: user.name || 'Usuário',
                email: user.email || ''
              };
              return acc;
            }, {});
            console.log(`👥 Zendesk-tickets: Fetched data for ${Object.keys(requestersData).length} requesters`);
          } else {
            console.warn('⚠️ Zendesk-tickets: Failed to fetch requesters data:', requestersResponse.status);
          }
        } catch (error) {
          console.warn('⚠️ Zendesk-tickets: Error fetching requesters data:', error);
        }
      }

      // Transform tickets to our format
      const transformedTickets: Ticket[] = tickets.map((ticket: any) => {
        const requesterId = ticket.requester_id?.toString();
        const requesterInfo = requesterId ? requestersData[requesterId] : null;
        
        return {
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
          requester_id: requesterId,
          assignee_id: ticket.assignee_id?.toString(),
          tags: ticket.tags,
          requester_name: requesterInfo?.name,
          requester_email: requesterInfo?.email
        };
      });

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
      console.error('❌ Fetch error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        url: fetchUrl,
        headers: zendeskHeaders
      });
      
      return new Response(JSON.stringify({ 
        error: 'fetch_failed',
        message: 'Erro ao conectar com o Zendesk',
        details: error.message,
        error_id: crypto.randomUUID(),
        tickets: []
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

  } catch (error) {
    console.error('💥 Zendesk-tickets: Unexpected error:', error);
    console.error('💥 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      error: 'internal_server_error',
      message: 'Erro interno no servidor',
      details: error.message,
      error_id: crypto.randomUUID(),
      tickets: []
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});