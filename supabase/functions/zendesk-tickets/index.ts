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

// Function to get detailed ticket information including comments and audits
const getTicketDetails = async (ticketId: string, subdomain: string, email: string, token: string) => {
  const cleanSubdomain = subdomain.replace(/\.zendesk\.com$/, '');
  const baseUrl = `https://${cleanSubdomain}.zendesk.com/api/v2`;
  const credentials = btoa(`${email}/token:${token}`);
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };

  try {
    console.log(`🎫 Fetching ticket details for ID: ${ticketId}`);
    
    // Fetch ticket basic info
    const ticketResponse = await fetch(`${baseUrl}/tickets/${ticketId}.json`, { headers });
    if (!ticketResponse.ok) {
      throw new Error(`Failed to fetch ticket: ${ticketResponse.status}`);
    }
    const ticketData = await ticketResponse.json();
    const ticket = ticketData.ticket;

    // Fetch ticket comments
    console.log(`💬 Fetching comments for ticket ${ticketId}`);
    const commentsResponse = await fetch(`${baseUrl}/tickets/${ticketId}/comments.json`, { headers });
    let comments = [];
    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json();
      comments = commentsData.comments || [];
      console.log(`✅ Found ${comments.length} comments`);
    } else {
      console.warn(`⚠️ Failed to fetch comments: ${commentsResponse.status}`);
    }

    // Fetch ticket audits
    console.log(`📋 Fetching audits for ticket ${ticketId}`);
    const auditsResponse = await fetch(`${baseUrl}/tickets/${ticketId}/audits.json`, { headers });
    let audits = [];
    if (auditsResponse.ok) {
      const auditsData = await auditsResponse.json();
      audits = auditsData.audits || [];
      console.log(`✅ Found ${audits.length} audits`);
    } else {
      console.warn(`⚠️ Failed to fetch audits: ${auditsResponse.status}`);
    }

    // Get unique user IDs from comments and audits
    const userIds = new Set();
    comments.forEach(comment => {
      if (comment.author_id) userIds.add(comment.author_id);
    });
    audits.forEach(audit => {
      if (audit.author_id) userIds.add(audit.author_id);
    });

    // Fetch user information
    let usersData = {};
    if (userIds.size > 0) {
      console.log(`👥 Fetching user data for ${userIds.size} users`);
      const usersResponse = await fetch(`${baseUrl}/users/show_many.json?ids=${Array.from(userIds).join(',')}`, { headers });
      if (usersResponse.ok) {
        const usersJson = await usersResponse.json();
        usersData = usersJson.users.reduce((acc: any, user: any) => {
          acc[user.id] = {
            name: user.name || 'Usuário',
            email: user.email || ''
          };
          return acc;
        }, {});
        console.log(`✅ Fetched data for ${Object.keys(usersData).length} users`);
      }
    }

    // Transform the ticket data
    const transformedTicket = {
      id: ticket.id.toString(),
      title: ticket.subject || 'Sem título',
      description: ticket.description || '',
      status: mapZendeskStatus(ticket.status),
      priority: mapZendeskPriority(ticket.priority),
      created: ticket.created_at,
      category: ticket.type || 'question',
      zendesk_id: ticket.id,
      requester_name: ticket.requester_id ? (usersData[ticket.requester_id]?.name || 'Usuário') : null,
      requester_email: ticket.requester_id ? (usersData[ticket.requester_id]?.email || '') : null,
      comments: comments.map(comment => ({
        id: comment.id,
        type: comment.type,
        body: comment.body,
        html_body: comment.html_body,
        author_id: comment.author_id,
        created_at: comment.created_at,
        public: comment.public,
        author: usersData[comment.author_id] || null
      })),
      audits: audits.map(audit => ({
        id: audit.id,
        ticket_id: audit.ticket_id,
        created_at: audit.created_at,
        author_id: audit.author_id,
        events: audit.events,
        author: usersData[audit.author_id] || null
      }))
    };

    console.log(`✅ Ticket details prepared for ID: ${ticketId}`);
    
    return new Response(JSON.stringify(transformedTicket), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`❌ Error fetching ticket details for ${ticketId}:`, error);
    return new Response(JSON.stringify({
      error: 'ticket_details_fetch_failed',
      message: 'Erro ao buscar detalhes do ticket',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
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

// Process ReactQuill HTML content for Zendesk
const processQuillHtml = (htmlContent: string) => {
  let processedHtml = htmlContent;
  const base64Images: string[] = [];
  
  // Extract base64 images and replace with placeholders
  const base64ImageRegex = /<img[^>]*src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/gi;
  let match;
  let imageIndex = 0;
  
  while ((match = base64ImageRegex.exec(htmlContent)) !== null) {
    const [fullMatch, format, base64Data] = match;
    base64Images.push(`data:image/${format};base64,${base64Data}`);
    
    // Replace base64 image with placeholder text
    const placeholder = `[Imagem ${imageIndex + 1} - ${format.toUpperCase()}]`;
    processedHtml = processedHtml.replace(fullMatch, placeholder);
    imageIndex++;
  }
  
  // Clean up HTML for better Zendesk compatibility
  processedHtml = processedHtml
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/<p><\/p>/gi, '<br>')
    .replace(/(<p[^>]*>)\s*<br>\s*(<\/p>)/gi, '$1$2')
    .replace(/^\s*<br>\s*/gi, '')
    .replace(/\s*<br>\s*$/gi, '');
  
  return {
    html: processedHtml,
    base64Images: base64Images
  };
};

// Upload base64 image to Zendesk as attachment
const uploadImageToZendesk = async (
  ticketId: string,
  base64Data: string,
  filename: string,
  subdomain: string,
  email: string,
  token: string
) => {
  const cleanSubdomain = subdomain.replace(/\.zendesk\.com$/, '');
  const baseUrl = `https://${cleanSubdomain}.zendesk.com/api/v2`;
  const credentials = btoa(`${email}/token:${token}`);
  
  try {
    // Convert base64 to blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('uploaded_data', blob, filename);
    
    // Upload to Zendesk
    const uploadResponse = await fetch(`${baseUrl}/uploads.json?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      console.error(`❌ Failed to upload image: ${uploadResponse.status}`);
      return null;
    }
    
    const uploadResult = await uploadResponse.json();
    console.log(`✅ Image uploaded successfully:`, uploadResult.upload.token);
    
    return uploadResult.upload.token;
    
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return null;
  }
};

// Validate if user exists in Zendesk
const validateZendeskUser = async (userEmail: string, subdomain: string, email: string, token: string) => {
  const cleanSubdomain = subdomain.replace(/\.zendesk\.com$/, '');
  const baseUrl = `https://${cleanSubdomain}.zendesk.com/api/v2`;
  const credentials = btoa(`${email}/token:${token}`);
  
  try {
    console.log(`🔍 Validating Zendesk user: ${userEmail}`);
    
    // Use search API to find user by email
    const searchUrl = `${baseUrl}/search.json?query=type:user email:${encodeURIComponent(userEmail)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to search user: ${response.status}`);
      return { exists: false, userId: null, error: `Search failed: ${response.status}` };
    }
    
    const data = await response.json();
    const users = data.results || [];
    
    // Find exact email match (case insensitive)
    const user = users.find((u: any) => 
      u.email && u.email.toLowerCase() === userEmail.toLowerCase()
    );
    
    if (user) {
      console.log(`✅ User found in Zendesk:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        active: user.active
      });
      
      return { 
        exists: true, 
        userId: user.id, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          active: user.active
        }
      };
    } else {
      console.log(`❌ User not found in Zendesk: ${userEmail}`);
      return { exists: false, userId: null, error: 'User not found' };
    }
    
  } catch (error) {
    console.error(`❌ Error validating Zendesk user:`, error);
    return { exists: false, userId: null, error: error.message };
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
  let ticketId = url.searchParams.get('ticketId');
  let action = url.searchParams.get('action');
  let requestBody = null;
  
  // Check if it's a POST request with body data
  if (req.method === 'POST') {
    try {
      requestBody = await req.json();
      ticketId = requestBody.ticket_id || ticketId;
      action = requestBody.action || action;
      console.log('📥 POST request body:', { action, ticket_id: ticketId });
    } catch (error) {
      console.log('⚠️ Failed to parse POST body, using query params only');
    }
  }

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
    
    // Handle get_ticket_details action
    if (action === 'get_ticket_details' && ticketId) {
      console.log(`🔍 Fetching details for ticket ${ticketId}`);
      return await getTicketDetails(ticketId, ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN);
    }
    
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

    // Handle add comment request
    if (action === 'add-comment' && ticketId) {
      console.log('💬 Adding comment to ticket:', ticketId);
      
      try {
        const { comment_body, is_public = true, has_attachment = false } = requestBody || {};
        
        if (!comment_body || comment_body.trim() === '') {
          return new Response(JSON.stringify({
            error: 'comment_body_required',
            message: 'Corpo do comentário é obrigatório'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Validar que apenas comentários públicos e com anexo são permitidos
        if (!is_public && !has_attachment) {
          return new Response(JSON.stringify({
            error: 'invalid_comment_type',
            message: 'Apenas comentários públicos ou com anexo são permitidos'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Validar se o usuário existe no Zendesk antes de permitir comentário
        console.log('🔍 Validating user in Zendesk:', profile.email);
        const userValidation = await validateZendeskUser(profile.email, ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN);
        
        if (!userValidation.exists) {
          console.log('❌ User not found in Zendesk, blocking comment');
          return new Response(JSON.stringify({
            error: 'user_not_found_in_zendesk',
            message: 'Usuário não encontrado no Zendesk. Entre em contato com o administrador para criar seu acesso.',
            details: 'Para enviar comentários em tickets, você precisa ter uma conta ativa no sistema Zendesk da sua escola.'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('✅ User validated in Zendesk, proceeding with comment');

        // Processar HTML do ReactQuill
        console.log('🔄 Processing ReactQuill HTML content...');
        const { html: processedHtml, base64Images } = processQuillHtml(comment_body);
        
        // Upload de imagens se houver
        const uploadTokens: string[] = [];
        if (base64Images.length > 0) {
          console.log(`📎 Found ${base64Images.length} base64 images, uploading...`);
          
          for (let i = 0; i < base64Images.length; i++) {
            const base64Data = base64Images[i];
            const format = base64Data.match(/data:image\/([^;]+);base64/)?.[1] || 'png';
            const filename = `image_${Date.now()}_${i + 1}.${format}`;
            
            const uploadToken = await uploadImageToZendesk(
              ticketId,
              base64Data,
              filename,
              ZENDESK_SUBDOMAIN,
              ZENDESK_EMAIL,
              ZENDESK_API_TOKEN
            );
            
            if (uploadToken) {
              uploadTokens.push(uploadToken);
            }
          }
          
          console.log(`✅ Successfully uploaded ${uploadTokens.length}/${base64Images.length} images`);
        }

        // Preparar dados do comentário com o author_id do usuário real
        const commentData = {
          ticket: {
            comment: {
              html_body: processedHtml, // Usar html_body para manter formatação
              body: processedHtml.replace(/<[^>]*>/g, ''), // Fallback de texto simples
              public: is_public,
              author_id: userValidation.userId, // Usar o ID real do usuário no Zendesk
              uploads: uploadTokens // Adicionar anexos se houver
            }
          }
        };

        console.log('📝 Adding comment data:', {
          ticket_id: ticketId,
          is_public: is_public,
          user_name: profile.name,
          user_email: profile.email,
          zendesk_user_id: userValidation.userId,
          comment_length: comment_body.length
        });

        // Enviar comentário para o Zendesk
        const commentResponse = await fetch(`${zendeskUrl}/tickets/${ticketId}.json`, {
          method: 'PUT',
          headers: zendeskHeaders,
          body: JSON.stringify(commentData)
        });

        if (!commentResponse.ok) {
          const errorData = await commentResponse.json();
          console.error('❌ Error adding comment:', errorData);
          throw new Error(`Failed to add comment: ${commentResponse.status} - ${errorData.description || errorData.error}`);
        }

        const result = await commentResponse.json();
        console.log('✅ Comment added successfully to ticket:', ticketId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Comentário adicionado com sucesso',
          ticket_id: ticketId,
          comment_id: result.audit?.id,
          author_info: {
            zendesk_user_id: userValidation.userId,
            name: userValidation.user?.name,
            email: userValidation.user?.email
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('❌ Error adding comment:', error);
        return new Response(JSON.stringify({
          error: 'add_comment_failed',
          message: 'Erro ao adicionar comentário',
          details: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

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