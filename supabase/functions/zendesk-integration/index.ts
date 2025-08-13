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
    const ZENDESK_OAUTH_TOKEN = Deno.env.get('ZENDESK_OAUTH_TOKEN');
    const ZENDESK_SUBDOMAIN = Deno.env.get('ZENDESK_SUBDOMAIN');
    const ZENDESK_EMAIL = Deno.env.get('ZENDESK_EMAIL');

    // Check for either API token or OAuth token
    if ((!ZENDESK_API_TOKEN && !ZENDESK_OAUTH_TOKEN) || !ZENDESK_SUBDOMAIN) {
      console.error('❌ Missing Zendesk credentials:', {
        has_api_token: !!ZENDESK_API_TOKEN,
        has_oauth_token: !!ZENDESK_OAUTH_TOKEN,
        has_subdomain: !!ZENDESK_SUBDOMAIN,
        has_email: !!ZENDESK_EMAIL
      });
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

    console.log('🏫 User profile loaded:', {
      user_id: user.id,
      school_id: profile.school_id,
      role: profile.role,
      email: profile.email
    });

    const { action, test_organization_id, test_domain, test_entity, ...body } = await req.json();
    const schoolId = profile.school_id;
    const organizationId = test_organization_id || profile.school_customizations?.[0]?.zendesk_integration_url;
    const schoolName = profile.school_customizations?.[0]?.school_name;
    
    console.log('🏫 School integration info:', {
      school_id: schoolId,
      school_name: schoolName,
      organization_id: organizationId,
      user_role: profile.role,
      zendesk_integration_configured: !!organizationId,
      profile_data: profile,
      test_data: { test_organization_id, test_domain, test_entity }
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

    // Log organization ID details for debugging
    console.log('🔍 Organization ID Debug:', {
      organizationId,
      organizationIdType: typeof organizationId,
      organizationIdExists: !!organizationId,
      schoolCustomizations: profile.school_customizations,
      zendeskIntegrationUrl: profile.school_customizations?.[0]?.zendesk_integration_url,
      testData: { test_organization_id, test_domain, test_entity }
    });

    // Check if organization ID is configured for the school - but allow continuation for testing
    if (schoolId && !organizationId) {
      console.warn('⚠️ School without Zendesk organization ID (will try alternative strategies):', {
        school_id: schoolId,
        user_id: user.id,
        school_customizations: profile.school_customizations
      });
      
      // Don't return early - continue with alternative strategies
      // return new Response(JSON.stringify({ 
      //   error: 'organization_not_configured',
      //   message: 'ID da organização do Zendesk não configurado para esta escola',
      //   tickets: [],
      //   user_info: {
      //     email: profile.email,
      //     role: profile.role,
      //     school_id: schoolId
      //   }
      // }), {
      //   status: 200,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    }

    // Zendesk API base URL
    const zendeskUrl = `https://proesc.zendesk.com/api/v2`;
    
    // Set up authentication headers - prefer OAuth over API token
    let zendeskHeaders: { [key: string]: string };
    
    if (ZENDESK_OAUTH_TOKEN) {
      console.log('🔑 Using OAuth token for authentication');
      zendeskHeaders = {
        'Authorization': `Bearer ${ZENDESK_OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      };
    } else {
      console.log('🔑 Using API token for authentication');
      const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
      zendeskHeaders = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      };
    }

    let response;

    console.log('🎯 Zendesk operation:', {
      action,
      organization_id: organizationId,
      user_role: profile.role,
      school_id: schoolId,
      auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token'
    });

    switch (action) {
      case 'get_ticket':
        const ticketId = body.ticket_id;
        if (!ticketId) {
          return new Response(JSON.stringify({ 
            error: 'ticket_id is required for get_ticket action' 
          }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        
        const ticketUrl = `${zendeskUrl}/tickets/${ticketId}.json`;
        console.log(`🎫 Fetching specific ticket ${ticketId} from URL:`, ticketUrl);
        
        try {
          const ticketResponse = await fetch(ticketUrl, {
            headers: zendeskHeaders
          });

          console.log(`🎫 Ticket ${ticketId} response status:`, ticketResponse.status);
          console.log(`🎫 Response headers:`, Object.fromEntries(ticketResponse.headers.entries()));
          
          const ticketData = await ticketResponse.json();
          
          if (!ticketResponse.ok) {
            console.error(`❌ Error fetching ticket ${ticketId}:`, {
              status: ticketResponse.status,
              statusText: ticketResponse.statusText,
              error_data: ticketData,
              url: ticketUrl,
              auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token'
            });
            return new Response(JSON.stringify({ 
              error: 'Failed to fetch ticket from Zendesk',
              details: ticketData,
              status: ticketResponse.status
            }), { 
              status: ticketResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
          }

          console.log(`✅ Successfully fetched ticket ${ticketId}:`, {
            ticket_id: ticketData.ticket?.id,
            subject: ticketData.ticket?.subject,
            status: ticketData.ticket?.status,
            priority: ticketData.ticket?.priority,
            organization_id: ticketData.ticket?.organization_id,
            requester_id: ticketData.ticket?.requester_id,
            assignee_id: ticketData.ticket?.assignee_id,
            created_at: ticketData.ticket?.created_at,
            tags: ticketData.ticket?.tags,
            url: ticketData.ticket?.url
          });
          
          const transformedTicket = {
            id: ticketData.ticket.id.toString(),
            title: ticketData.ticket.subject || 'Sem título',
            description: ticketData.ticket.description || '',
            status: mapZendeskStatus(ticketData.ticket.status),
            priority: mapZendeskPriority(ticketData.ticket.priority),
            created: ticketData.ticket.created_at,
            category: ticketData.ticket.type || 'question',
            zendesk_id: ticketData.ticket.id,
            zendesk_url: ticketData.ticket.url,
            organization_id: ticketData.ticket.organization_id,
            requester_id: ticketData.ticket.requester_id,
            assignee_id: ticketData.ticket.assignee_id,
            tags: ticketData.ticket.tags,
            raw_ticket: ticketData.ticket
          };

          return new Response(JSON.stringify({ 
            ticket: transformedTicket,
            debug_info: {
              zendesk_url: ticketUrl,
              auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token',
              organization_id: organizationId,
              user_role: profile.role,
              school_name: schoolName
            }
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        } catch (error) {
          console.error(`💥 Exception fetching ticket ${ticketId}:`, error);
          return new Response(JSON.stringify({ 
            error: 'Exception occurred while fetching ticket',
            details: error.message 
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

      case 'list_tickets':
        console.log(`🎯 Starting enhanced ticket listing with multiple strategies...`);
        
        // Initialize variables for multiple strategy attempts
        let tickets = [];
        let successfulStrategy = null;
        let allAttempts = [];
        const entityNumber = getEntityNumber(schoolName);
        const schoolDomain = getSchoolDomain(schoolName);

        // Strategy 1: Admin without school - get all tickets
        if (profile.role === 'admin' && !schoolId) {
          const adminUrl = `${zendeskUrl}/tickets.json?sort_by=created_at&sort_order=desc`;
          console.log(`📋 Strategy 1: Admin general listing`);
          
          try {
            const adminResponse = await fetch(adminUrl, { headers: zendeskHeaders });
            const adminData = await adminResponse.json();
            
            allAttempts.push({
              strategy: 'admin_general',
              url: adminUrl,
              status: adminResponse.status,
              ticket_count: adminData.tickets?.length || 0,
              success: adminResponse.ok && (adminData.tickets?.length > 0)
            });
            
            if (adminResponse.ok && adminData.tickets?.length > 0) {
              tickets = adminData.tickets;
              successfulStrategy = 'admin_general';
              console.log(`✅ Strategy 1 SUCCESS: Found ${tickets.length} tickets via admin listing`);
            }
          } catch (error) {
            console.log(`❌ Strategy 1 ERROR:`, error.message);
            allAttempts.push({
              strategy: 'admin_general',
              url: adminUrl,
              status: 'error',
              error: error.message
            });
          }
        }

        // Strategy 2: Organization-based listing
        if (tickets.length === 0 && organizationId) {
          const orgUrl = `${zendeskUrl}/organizations/${organizationId}/tickets.json?sort_by=created_at&sort_order=desc`;
          console.log(`📋 Strategy 2: Organization-based listing for ID: ${organizationId}`);
          
          try {
            const orgResponse = await fetch(orgUrl, { headers: zendeskHeaders });
            const orgData = await orgResponse.json();
            
            allAttempts.push({
              strategy: 'organization',
              url: orgUrl,
              status: orgResponse.status,
              ticket_count: orgData.tickets?.length || 0,
              success: orgResponse.ok && (orgData.tickets?.length > 0)
            });
            
            if (orgResponse.ok && orgData.tickets?.length > 0) {
              tickets = orgData.tickets;
              successfulStrategy = 'organization';
              console.log(`✅ Strategy 2 SUCCESS: Found ${tickets.length} tickets via organization`);
            } else {
              console.log(`⚠️ Strategy 2 FAILED: ${orgResponse.status} - ${orgData.tickets?.length || 0} tickets`);
            }
          } catch (error) {
            console.log(`❌ Strategy 2 ERROR:`, error.message);
            allAttempts.push({
              strategy: 'organization',
              url: orgUrl,
              status: 'error',
              error: error.message
            });
          }
        }

        // Strategy 3: Entity-based search
        if (tickets.length === 0 && entityNumber) {
          const entityUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "Entidade N ${entityNumber}"`)}&sort_by=created_at&sort_order=desc`;
          console.log(`📋 Strategy 3: Entity-based search for entity ${entityNumber}`);
          
          try {
            const entityResponse = await fetch(entityUrl, { headers: zendeskHeaders });
            const entityData = await entityResponse.json();
            
            allAttempts.push({
              strategy: 'entity',
              url: entityUrl,
              status: entityResponse.status,
              ticket_count: entityData.results?.length || 0,
              success: entityResponse.ok && (entityData.results?.length > 0)
            });
            
            if (entityResponse.ok && entityData.results?.length > 0) {
              tickets = entityData.results;
              successfulStrategy = 'entity';
              console.log(`✅ Strategy 3 SUCCESS: Found ${tickets.length} tickets via entity search`);
            } else {
              console.log(`⚠️ Strategy 3 FAILED: ${entityResponse.status} - ${entityData.results?.length || 0} tickets`);
            }
          } catch (error) {
            console.log(`❌ Strategy 3 ERROR:`, error.message);
            allAttempts.push({
              strategy: 'entity',
              url: entityUrl,
              status: 'error',
              error: error.message
            });
          }
        }

        // Strategy 4: Domain-based search
        if (tickets.length === 0 && schoolDomain) {
          const domainUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "${schoolDomain}"`)}&sort_by=created_at&sort_order=desc`;
          console.log(`📋 Strategy 4: Domain search for "${schoolDomain}"`);
          
          try {
            const domainResponse = await fetch(domainUrl, { headers: zendeskHeaders });
            const domainData = await domainResponse.json();
            
            allAttempts.push({
              strategy: 'domain',
              url: domainUrl,
              status: domainResponse.status,
              ticket_count: domainData.results?.length || 0,
              success: domainResponse.ok && (domainData.results?.length > 0)
            });
            
            if (domainResponse.ok && domainData.results?.length > 0) {
              tickets = domainData.results;
              successfulStrategy = 'domain';
              console.log(`✅ Strategy 4 SUCCESS: Found ${tickets.length} tickets via domain search`);
            } else {
              console.log(`⚠️ Strategy 4 FAILED: ${domainResponse.status} - ${domainData.results?.length || 0} tickets`);
            }
          } catch (error) {
            console.log(`❌ Strategy 4 ERROR:`, error.message);
            allAttempts.push({
              strategy: 'domain',
              url: domainUrl,
              status: 'error',
              error: error.message
            });
          }
        }

        // Strategy 5: School name search
        if (tickets.length === 0 && schoolName) {
          const schoolUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "${schoolName}"`)}&sort_by=created_at&sort_order=desc`;
          console.log(`📋 Strategy 5: School name search for "${schoolName}"`);
          
          try {
            const schoolResponse = await fetch(schoolUrl, { headers: zendeskHeaders });
            const schoolData = await schoolResponse.json();
            
            allAttempts.push({
              strategy: 'school_name',
              url: schoolUrl,
              status: schoolResponse.status,
              ticket_count: schoolData.results?.length || 0,
              success: schoolResponse.ok && (schoolData.results?.length > 0)
            });
            
            if (schoolResponse.ok && schoolData.results?.length > 0) {
              tickets = schoolData.results;
              successfulStrategy = 'school_name';
              console.log(`✅ Strategy 5 SUCCESS: Found ${tickets.length} tickets via school name search`);
            } else {
              console.log(`⚠️ Strategy 5 FAILED: ${schoolResponse.status} - ${schoolData.results?.length || 0} tickets`);
            }
          } catch (error) {
            console.log(`❌ Strategy 5 ERROR:`, error.message);
            allAttempts.push({
              strategy: 'school_name',
              url: schoolUrl,
              status: 'error',
              error: error.message
            });
          }
        }

        // Strategy 6: Broad search for specific organization (last resort)
        if (tickets.length === 0 && organizationId) {
          const broadUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket organization_id:${organizationId}`)}&sort_by=created_at&sort_order=desc`;
          console.log(`📋 Strategy 6: Broad organization search`);
          
          try {
            const broadResponse = await fetch(broadUrl, { headers: zendeskHeaders });
            const broadData = await broadResponse.json();
            
            allAttempts.push({
              strategy: 'broad_org',
              url: broadUrl,
              status: broadResponse.status,
              ticket_count: broadData.results?.length || 0,
              success: broadResponse.ok && (broadData.results?.length > 0)
            });
            
            if (broadResponse.ok && broadData.results?.length > 0) {
              tickets = broadData.results;
              successfulStrategy = 'broad_org';
              console.log(`✅ Strategy 6 SUCCESS: Found ${tickets.length} tickets via broad org search`);
            } else {
              console.log(`⚠️ Strategy 6 FAILED: ${broadResponse.status} - ${broadData.results?.length || 0} tickets`);
            }
          } catch (error) {
            console.log(`❌ Strategy 6 ERROR:`, error.message);
            allAttempts.push({
              strategy: 'broad_org',
              url: broadUrl,
              status: 'error',
              error: error.message
            });
          }
        }

        console.log(`🎯 Final result: ${tickets.length} tickets found using strategy: ${successfulStrategy || 'none'}`);
        console.log(`📊 All attempts summary:`, allAttempts);

        // Transform tickets for consistent response format
        const transformedTickets = tickets.map((ticket: any) => ({
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
          tags: ticket.tags || []
        }));

        // Log sample tickets for debugging
        if (transformedTickets.length > 0) {
          console.log(`🔍 Sample tickets found (first 3):`, transformedTickets.slice(0, 3).map(t => ({
            id: t.id,
            title: t.title.substring(0, 50),
            status: t.status,
            created: t.created
          })));
        }

        return new Response(JSON.stringify({ 
          tickets: transformedTickets,
          total: tickets.length,
          successful_strategy: successfulStrategy,
          debug_info: {
            all_attempts: allAttempts,
            organization_id: organizationId,
            school_name: schoolName,
            entity_number: entityNumber,
            school_domain: schoolDomain,
            user_role: profile.role,
            school_id: schoolId,
            zendesk_configured: !!ZENDESK_OAUTH_TOKEN,
            auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token'
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

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


      case 'test_ticket_access':
        console.log(`🧪 Testing ticket access for specific ticket ID...`);
        const testTicketId = body.test_ticket_id || '134449';
        
        // Test multiple endpoints to see which ones work
        const testResults = [];
        
        // Test 1: Direct ticket access
        try {
          const directUrl = `${zendeskUrl}/tickets/${testTicketId}.json`;
          const directResponse = await fetch(directUrl, { headers: zendeskHeaders });
          const directData = await directResponse.json();
          
          testResults.push({
            test: 'direct_ticket_access',
            url: directUrl,
            status: directResponse.status,
            success: directResponse.ok,
            has_ticket: !!directData.ticket,
            ticket_id: directData.ticket?.id,
            organization_id: directData.ticket?.organization_id,
            tags: directData.ticket?.tags
          });
        } catch (error) {
          testResults.push({
            test: 'direct_ticket_access',
            url: `${zendeskUrl}/tickets/${testTicketId}.json`,
            status: 'error',
            error: error.message
          });
        }
        
        // Test 2: Search for specific ticket
        try {
          const searchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket ${testTicketId}`)}`;
          const searchResponse = await fetch(searchUrl, { headers: zendeskHeaders });
          const searchData = await searchResponse.json();
          
          testResults.push({
            test: 'search_by_id',
            url: searchUrl,
            status: searchResponse.status,
            success: searchResponse.ok,
            results_count: searchData.results?.length || 0,
            found_ticket: searchData.results?.find((t: any) => t.id.toString() === testTicketId)
          });
        } catch (error) {
          testResults.push({
            test: 'search_by_id',
            status: 'error',
            error: error.message
          });
        }
        
        // Test 3: Organization tickets (if org ID available)
        if (organizationId) {
          try {
            const orgUrl = `${zendeskUrl}/organizations/${organizationId}/tickets.json`;
            const orgResponse = await fetch(orgUrl, { headers: zendeskHeaders });
            const orgData = await orgResponse.json();
            
            testResults.push({
              test: 'organization_tickets',
              url: orgUrl,
              status: orgResponse.status,
              success: orgResponse.ok,
              tickets_count: orgData.tickets?.length || 0,
              has_test_ticket: orgData.tickets?.some((t: any) => t.id.toString() === testTicketId)
            });
          } catch (error) {
            testResults.push({
              test: 'organization_tickets',
              status: 'error',
              error: error.message
            });
          }
        }
        
        return new Response(JSON.stringify({
          test_ticket_id: testTicketId,
          test_results: testResults,
          debug_info: {
            organization_id: organizationId,
            school_name: schoolName,
            user_role: profile.role,
            auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

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
        } else if (schoolName) {
          // Fallback to entity-based search
          const entityNumber = getEntityNumber(schoolName);
          if (entityNumber) {
            searchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "Entidade N ${entityNumber}" ${query}`)}&sort_by=updated_at&sort_order=desc`;
            console.log(`🔍 Entity-based search for ${schoolName} (Entity ${entityNumber}) with query:`, query);
          } else {
            searchUrl = `${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket "${schoolName}" ${query}`)}&sort_by=updated_at&sort_order=desc`;
            console.log(`🔍 School name search for ${schoolName} with query:`, query);
          }
        } else {
          // No search criteria, return empty
          return new Response(JSON.stringify({ 
            tickets: [],
            search_info: {
              organization_id: organizationId,
              total_results: 0,
              user_role: profile.role,
              school_id: schoolId,
              school_name: schoolName,
              error: 'no_search_criteria'
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
        organization_id: organizationId,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Zendesk API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Zendesk response:', {
      action,
      results_count: data.results?.length || data.tickets?.length || 0,
      next_page: data.next_page,
      organization_id: organizationId,
      school_name: schoolName,
      raw_data_preview: {
        has_results: !!data.results,
        has_tickets: !!data.tickets,
        first_ticket_subject: data.results?.[0]?.subject || data.tickets?.[0]?.subject,
        api_response_keys: Object.keys(data)
      }
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
          school_id: schoolId,
          school_name: schoolName,
          search_method: organizationId ? 'organization' : 'entity_search'
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      error_type: error.name,
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

function getEntityNumber(schoolName: string): string | null {
  // Map known schools to their entity numbers
  const schoolEntityMap: { [key: string]: string } = {
    'Colégio Arcádia': '4626',
    'Escola Celus': '1234', // Add other schools as needed
  };
  
  return schoolEntityMap[schoolName] || null;
}

function getSchoolDomain(schoolName: string): string | null {
  // Map known schools to their domains
  const schoolDomainMap: { [key: string]: string } = {
    'Colégio Arcádia': 'colegioarcadia.com.br',
    'Escola Celus': 'escolacelus.com.br', // Add other schools as needed
  };
  
  return schoolDomainMap[schoolName] || null;
}