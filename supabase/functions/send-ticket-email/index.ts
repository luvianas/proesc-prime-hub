import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketEmailRequest {
  title: string;
  description: string;
  priority: string;
  userEmail: string;
  userName: string;
  schoolName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, priority, userEmail, userName, schoolName }: TicketEmailRequest = await req.json();

    console.log('📧 Sending ticket email:', {
      title,
      userEmail,
      userName,
      schoolName,
      priority
    });

    const emailResponse = await resend.emails.send({
      from: userEmail,
      to: ["contato@proesc.com"],
      subject: `[Novo Ticket] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #c41133; border-bottom: 2px solid #c41133; padding-bottom: 10px;">
            Novo Ticket de Suporte
          </h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Informações do Ticket</h2>
            <p><strong>Título:</strong> ${title}</p>
            <p><strong>Prioridade:</strong> ${priority}</p>
            <p><strong>Descrição:</strong></p>
            <div style="background: white; padding: 15px; border-left: 4px solid #c41133; margin: 10px 0;">
              ${description.replace(/\n/g, '<br>')}
            </div>
          </div>

          <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Informações do Solicitante</h3>
            <p><strong>Nome:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            ${schoolName ? `<p><strong>Escola:</strong> ${schoolName}</p>` : ''}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p>Este email foi enviado automaticamente através do Portal Prime do Proesc.</p>
            <p>Para responder ao solicitante, utilize o email: ${userEmail}</p>
          </div>
        </div>
      `,
    });

    console.log("✅ Ticket email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-ticket-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);