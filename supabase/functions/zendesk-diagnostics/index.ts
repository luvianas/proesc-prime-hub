import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const diagnostics: DiagnosticResult[] = [];
    
    // Check Zendesk credentials
    const ZENDESK_OAUTH_TOKEN = Deno.env.get('ZENDESK_OAUTH_TOKEN');
    const ZENDESK_API_TOKEN = Deno.env.get('ZENDESK_API_TOKEN');
    const ZENDESK_SUBDOMAIN = Deno.env.get('ZENDESK_SUBDOMAIN');
    const ZENDESK_EMAIL = Deno.env.get('ZENDESK_EMAIL');

    diagnostics.push({
      step: 'credentials_check',
      status: (ZENDESK_OAUTH_TOKEN || ZENDESK_API_TOKEN) && ZENDESK_SUBDOMAIN ? 'success' : 'error',
      message: (ZENDESK_OAUTH_TOKEN || ZENDESK_API_TOKEN) && ZENDESK_SUBDOMAIN 
        ? 'Zendesk credentials are configured' 
        : 'Missing Zendesk credentials',
      details: {
        has_oauth_token: !!ZENDESK_OAUTH_TOKEN,
        has_api_token: !!ZENDESK_API_TOKEN,
        has_subdomain: !!ZENDESK_SUBDOMAIN,
        has_email: !!ZENDESK_EMAIL
      }
    });

    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      diagnostics.push({
        step: 'auth_check',
        status: 'error',
        message: 'No authentication header provided'
      });
      
      return new Response(JSON.stringify({ diagnostics }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      diagnostics.push({
        step: 'auth_check',
        status: 'error',
        message: 'Invalid authentication token',
        details: userError
      });
      
      return new Response(JSON.stringify({ diagnostics }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    diagnostics.push({
      step: 'auth_check',
      status: 'success',
      message: 'User authenticated successfully',
      details: { user_id: user.id, email: user.email }
    });

    // Get user profile and school configuration
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        school_id, name, email, role,
        school_customizations!profiles_school_id_fkey(zendesk_external_id, zendesk_integration_url, school_name)
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      diagnostics.push({
        step: 'profile_check',
        status: 'error',
        message: 'User profile not found',
        details: profileError
      });
      
      return new Response(JSON.stringify({ diagnostics }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalId = profile.school_customizations?.[0]?.zendesk_external_id;
    const organizationId = profile.school_customizations?.[0]?.zendesk_integration_url;
    const schoolName = profile.school_customizations?.[0]?.school_name;

    diagnostics.push({
      step: 'profile_check',
      status: 'success',
      message: 'User profile loaded successfully',
      details: {
        school_id: profile.school_id,
        role: profile.role,
        school_name: schoolName,
        external_id: externalId,
        organization_id: organizationId,
        has_external_id: !!externalId,
        has_organization_id: !!organizationId,
        has_zendesk_config: !!(externalId || organizationId)
      }
    });

    // Check if external_id or organization is configured
    if (!externalId && !organizationId) {
      diagnostics.push({
        step: 'organization_check',
        status: 'warning',
        message: 'Neither External ID nor Organization ID configured for this school',
        details: { school_id: profile.school_id }
      });
    } else {
      diagnostics.push({
        step: 'organization_check',
        status: 'success',
        message: externalId ? 'External ID found in configuration (preferred)' : 'Organization ID found in configuration',
        details: { 
          external_id: externalId,
          organization_id: organizationId,
          method: externalId ? 'external_id' : 'organization_id'
        }
      });
    }

    // Test Zendesk connectivity if we have credentials
    if ((ZENDESK_OAUTH_TOKEN || ZENDESK_API_TOKEN) && ZENDESK_SUBDOMAIN) {
      const zendeskUrl = `https://proesc.zendesk.com/api/v2`;
      
      let zendeskHeaders: { [key: string]: string };
      
      if (ZENDESK_OAUTH_TOKEN) {
        zendeskHeaders = {
          'Authorization': `Bearer ${ZENDESK_OAUTH_TOKEN}`,
          'Content-Type': 'application/json',
        };
      } else {
        const credentials = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
        zendeskHeaders = {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        };
      }

      // Test basic API connectivity
      try {
        const testResponse = await fetch(`${zendeskUrl}/users/me.json`, { 
          headers: zendeskHeaders 
        });
        
        if (testResponse.ok) {
          const userData = await testResponse.json();
          diagnostics.push({
            step: 'api_connectivity',
            status: 'success',
            message: 'Zendesk API connection successful',
            details: { 
              user_name: userData.user?.name,
              user_email: userData.user?.email,
              auth_method: ZENDESK_OAUTH_TOKEN ? 'OAuth' : 'API Token'
            }
          });
        } else {
          const errorData = await testResponse.text();
          diagnostics.push({
            step: 'api_connectivity',
            status: 'error',
            message: `Zendesk API connection failed: ${testResponse.status}`,
            details: { status: testResponse.status, error: errorData }
          });
        }
      } catch (error) {
        diagnostics.push({
          step: 'api_connectivity',
          status: 'error',
          message: 'Failed to connect to Zendesk API',
          details: { error: error.message }
        });
      }

      // Test external_id ticket search (preferred method)
      if (externalId) {
        try {
          const externalIdResponse = await fetch(`${zendeskUrl}/search.json?query=${encodeURIComponent(`type:ticket organization_external_id:${externalId}`)}&per_page=5`, { 
            headers: zendeskHeaders 
          });
          
          if (externalIdResponse.ok) {
            const externalIdData = await externalIdResponse.json();
            diagnostics.push({
              step: 'external_id_test',
              status: 'success',
              message: `External ID search successful - found ${externalIdData.results?.length || 0} tickets`,
              details: { 
                ticket_count: externalIdData.results?.length || 0,
                external_id: externalId,
                method: 'external_id_search'
              }
            });
          } else {
            const errorData = await externalIdResponse.text();
            diagnostics.push({
              step: 'external_id_test',
              status: 'error',
              message: `External ID search failed: ${externalIdResponse.status}`,
              details: { 
                external_id: externalId,
                status: externalIdResponse.status, 
                error: errorData 
              }
            });
          }
        } catch (error) {
          diagnostics.push({
            step: 'external_id_test',
            status: 'error',
            message: 'Failed to test external ID search',
            details: { external_id: externalId, error: error.message }
          });
        }
      }

      // Test organization existence if we have organization ID (fallback method)
      if (organizationId) {
        try {
          const orgResponse = await fetch(`${zendeskUrl}/organizations/${organizationId}.json`, { 
            headers: zendeskHeaders 
          });
          
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            diagnostics.push({
              step: 'organization_test',
              status: 'success',
              message: 'Organization exists and is accessible (fallback method)',
              details: { 
                organization_name: orgData.organization?.name,
                organization_id: orgData.organization?.id,
                external_id: orgData.organization?.external_id,
                method: 'organization_lookup'
              }
            });
          } else {
            const errorData = await orgResponse.text();
            diagnostics.push({
              step: 'organization_test',
              status: 'error',
              message: `Organization not found or not accessible: ${orgResponse.status}`,
              details: { 
                organization_id: organizationId,
                status: orgResponse.status, 
                error: errorData 
              }
            });
          }
        } catch (error) {
          diagnostics.push({
            step: 'organization_test',
            status: 'error',
            message: 'Failed to test organization access',
            details: { organization_id: organizationId, error: error.message }
          });
        }

        // Test ticket retrieval for the organization (fallback method)
        if (!externalId) {
          try {
            const ticketsResponse = await fetch(`${zendeskUrl}/organizations/${organizationId}/tickets.json?per_page=5`, { 
              headers: zendeskHeaders 
            });
            
            if (ticketsResponse.ok) {
              const ticketsData = await ticketsResponse.json();
              diagnostics.push({
                step: 'tickets_test',
                status: 'success',
                message: `Found ${ticketsData.tickets?.length || 0} tickets for organization (fallback method)`,
                details: { 
                  ticket_count: ticketsData.tickets?.length || 0,
                  organization_id: organizationId,
                  method: 'organization_tickets'
                }
              });
            } else {
              const errorData = await ticketsResponse.text();
              diagnostics.push({
                step: 'tickets_test',
                status: 'error',
                message: `Failed to retrieve tickets: ${ticketsResponse.status}`,
                details: { 
                  organization_id: organizationId,
                  status: ticketsResponse.status, 
                  error: errorData 
                }
              });
            }
          } catch (error) {
            diagnostics.push({
              step: 'tickets_test',
              status: 'error',
              message: 'Failed to test ticket retrieval',
              details: { organization_id: organizationId, error: error.message }
            });
          }
        }
      }
    }

    // Summary
    const hasErrors = diagnostics.some(d => d.status === 'error');
    const hasWarnings = diagnostics.some(d => d.status === 'warning');
    
    return new Response(JSON.stringify({ 
      overall_status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'success',
      diagnostics,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Diagnostics error:', error);
    return new Response(JSON.stringify({ 
      overall_status: 'error',
      error: 'Diagnostic check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});