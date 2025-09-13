import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TicketDetailsPage from "@/components/TicketDetailsPage";
import { logEvent } from "@/lib/analytics";

export default function GestorTicketDetailsPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();

  useEffect(() => {
    // Set document title and meta description
    document.title = `Prime - Ticket ${ticketId}`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Detalhes do ticket ${ticketId} - Sistema de suporte Prime`);
    }

    // Log page view
    logEvent({
      event_type: 'page_view',
      event_name: 'ticket_details_page_viewed',
      properties: { 
        page: `/acompanhar-tickets/${ticketId}`,
        feature: 'ticket-details',
        ticket_id: ticketId
      }
    });
  }, [ticketId]);

  const handleBack = () => {
    logEvent({
      event_type: 'click',
      event_name: 'back_to_tickets',
      properties: { 
        from: `/acompanhar-tickets/${ticketId}`,
        to: '/acompanhar-tickets'
      }
    });
    navigate('/acompanhar-tickets');
  };

  if (!ticketId) {
    navigate('/acompanhar-tickets');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <TicketDetailsPage ticketId={ticketId} onBack={handleBack} />
      </div>
    </div>
  );
}