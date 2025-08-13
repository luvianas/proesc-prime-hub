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

    // Get user profile and school info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, name, email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User profile not found');
    }

    const { action, ...body } = await req.json();
    const schoolId = profile.school_id;
    const schoolTag = `school_${schoolId}`;

    // Zendesk API base URL
    const zendeskUrl = `https://proesc.zendesk.com/api/v2`;
    
    // Basic auth credentials
    const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
    const zendeskHeaders = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };

    let response;

    switch (action) {
      case 'list_tickets':
        // Get tickets filtered by school tag
        const listUrl = `${zendeskUrl}/search.json?query=type:ticket tags:${schoolTag}&sort_by=created_at&sort_order=desc`;
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
            tags: [schoolTag, 'proesc'],
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
        const searchUrl = `${zendeskUrl}/search.json?query=type:ticket tags:${schoolTag} ${query}&sort_by=updated_at&sort_order=desc`;
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
      console.error('Zendesk API error:', errorData);
      throw new Error(`Zendesk API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Zendesk data to our format
    if (action === 'list_tickets' || action === 'search_tickets') {
      const tickets = data.results || [];
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

      return new Response(JSON.stringify({ tickets: transformedTickets }), {
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