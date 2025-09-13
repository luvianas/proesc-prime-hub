import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TicketSystem from "@/components/TicketSystem";
import { logEvent } from "@/lib/analytics";

export default function GestorTicketsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set document title and meta description
    document.title = "Prime - Acompanhar Tickets";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Sistema de tickets do Prime - Acompanhe e gerencie suas solicitações de suporte');
    }

    // Log page view
    logEvent({
      event_type: 'page_view',
      event_name: 'tickets_page_viewed',
      properties: { 
        page: '/acompanhar-tickets',
        feature: 'tickets'
      }
    });
  }, []);

  const handleBack = () => {
    logEvent({
      event_type: 'click',
      event_name: 'back_to_home',
      properties: { 
        from: '/acompanhar-tickets',
        to: '/inicio'
      }
    });
    navigate('/inicio');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <TicketSystem onBack={handleBack} />
      </div>
    </div>
  );
}