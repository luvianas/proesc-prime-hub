import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZENDESK_API_TOKEN = Deno.env.get('ZENDESK_API_TOKEN');
    const ZENDESK_SUBDOMAIN = Deno.env.get('ZENDESK_SUBDOMAIN');
    const ZENDESK_EMAIL = Deno.env.get('ZENDESK_EMAIL');

    if (!ZENDESK_API_TOKEN || !ZENDESK_SUBDOMAIN || !ZENDESK_EMAIL) {
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
        school_customizations!profiles_school_id_fkey(zendesk_integration_url)
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User profile not found');
    }

    console.log('🏫 User profile loaded:', {
      user_id: user.id,
      school_id: profile.school_id,
      role: profile.role,
      email: profile.email
    });

    const { action, ...body } = await req.json();
    const schoolId = profile.school_id;
    const organizationId = profile.school_customizations?.[0]?.zendesk_integration_url;
    
    console.log('🏫 School integration info:', {
      school_id: schoolId,
      organization_id: organizationId,
      user_role: profile.role
    });
    
    // Handle users without school association
    if (!schoolId && profile.role !== 'admin') {
      console.warn('⚠️ User without school_id trying to access tickets:', {
        user_id: user.id,
        email: profile.email,
        role: profile.role
      });
      
      return new Response(JSON.stringify({ 
        error: 'user_without_school',
        message: 'Usuário não está associado a uma escola',
        tickets: [],
        user_info: {
          email: profile.email,
          role: profile.role
        }
      }), {
        status: 200, // Not an error, just no school association
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if organization ID is configured for the school
    if (schoolId && !organizationId) {
      console.warn('⚠️ School without Zendesk organization ID:', {
        school_id: schoolId,
        user_id: user.id
      });
      
      return new Response(JSON.stringify({ 
        error: 'organization_not_configured',
        message: 'ID da organização do Zendesk não configurado para esta escola',
        tickets: [],
        user_info: {
          email: profile.email,
          role: profile.role,
          school_id: schoolId
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Zendesk API base URL
    const zendeskUrl = `https://proesc.zendesk.com/api/v2`;
    
    // Basic auth credentials
    const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
    const zendeskHeaders = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };

    let response;

    console.log('🎯 Zendesk operation:', {
      action,
      organization_id: organizationId,
      user_role: profile.role,
      school_id: schoolId
    });

    switch (action) {
      case 'list_tickets':
        // Get tickets filtered by organization
        let listUrl = '';
        
        if (profile.role === 'admin' && !schoolId) {
          // Admins without school_id can see all tickets
          listUrl = `${zendeskUrl}/tickets.json?sort_by=created_at&sort_order=desc`;
          console.log('🔑 Admin access: listing all tickets');
        } else if (organizationId) {
          // Get tickets for specific organization
          listUrl = `${zendeskUrl}/organizations/${organizationId}/tickets.json?sort_by=created_at&sort_order=desc`;
          console.log('🏢 Organization tickets URL:', listUrl);
        } else {
          // Fallback to empty results
          return new Response(JSON.stringify({ 
            tickets: [],
            search_info: {
              organization_id: organizationId,
              total_results: 0,
              user_role: profile.role,
              school_id: schoolId
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        response = await fetch(listUrl, {
          method: 'GET',
          headers: zendeskHeaders,
        });
        break;

      case 'create_ticket':
        const { subject, description, priority = 'normal' } = body;
        
        const ticketData = {
          ticket: {
            subject,
            comment: {
              body: description
            },
            priority,
            organization_id: organizationId ? parseInt(organizationId) : null,
            tags: ['proesc'],
            requester: {
              name: profile.name,
              email: profile.email
            }
          }
        };

        response = await fetch(`${zendeskUrl}/tickets.json`, {
          method: 'POST',
          headers: zendeskHeaders,
          body: JSON.stringify(ticketData),
        });
        break;

      case 'get_ticket':
        const { ticketId } = body;
        response = await fetch(`${zendeskUrl}/tickets/${ticketId}.json`, {
          method: 'GET',
          headers: zendeskHeaders,
        });
        break;

      case 'search_tickets':
        const { query } = body;
        let searchUrl = '';
        
        if (profile.role === 'admin' && !schoolId) {
          // Admin search across all tickets
          searchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket ${query}`)}&sort_by=updated_at&sort_order=desc`;
          console.log('🔍 Admin search query:', query);
        } else if (organizationId) {
          // Search within organization tickets
          searchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket organization:${organizationId} ${query}`)}&sort_by=updated_at&sort_order=desc`;
          console.log('🔍 Organization search query:', query, 'org:', organizationId);
        } else {
          // No organization configured, return empty
          return new Response(JSON.stringify({ 
            tickets: [],
            search_info: {
              organization_id: organizationId,
              total_results: 0,
              user_role: profile.role,
              school_id: schoolId
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        response = await fetch(searchUrl, {
          method: 'GET',
          headers: zendeskHeaders,
        });
        break;

      default:
        throw new Error('Invalid action');
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Zendesk API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        action,
        organization_id: organizationId
      });
      throw new Error(`Zendesk API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Zendesk response:', {
      action,
      results_count: data.results?.length || data.tickets?.length || 0,
      next_page: data.next_page,
      organization_id: organizationId
    });
    
    // Transform Zendesk data to our format
    if (action === 'list_tickets' || action === 'search_tickets') {
      const tickets = data.results || data.tickets || [];
      const transformedTickets = tickets.map((ticket: any) => ({
        id: `ZD-${ticket.id}`,
        title: ticket.subject,
        description: ticket.description || 'Sem descrição',
        status: mapZendeskStatus(ticket.status),
        priority: mapZendeskPriority(ticket.priority),
        created: ticket.created_at,
        category: ticket.tags?.includes('bug') ? 'Bug' : 
                 ticket.tags?.includes('feature') ? 'Solicitação' : 'Técnico',
        zendesk_id: ticket.id,
        zendesk_url: `https://${ZENDESK_SUBDOMAIN}.zendesk.com/agent/tickets/${ticket.id}`
      }));

      return new Response(JSON.stringify({ 
        tickets: transformedTickets,
        search_info: {
          organization_id: organizationId,
          total_results: data.count || transformedTickets.length,
          user_role: profile.role,
          school_id: schoolId
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in zendesk-integration:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      tickets: [] // Fallback empty array for list operations
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapZendeskStatus(status: string): string {
  switch (status) {
    case 'new':
    case 'open':
      return 'Pendente';
    case 'pending':
      return 'Em Andamento';
    case 'solved':
    case 'closed':
      return 'Resolvido';
    default:
      return 'Pendente';
  }
}

function mapZendeskPriority(priority: string): string {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'Alta';
    case 'normal':
      return 'Média';
    case 'low':
      return 'Baixa';
    default:
      return 'Média';
  }
}