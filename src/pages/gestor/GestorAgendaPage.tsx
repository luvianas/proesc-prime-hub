import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ConsultorAgenda from "@/components/ConsultorAgenda";
import { logEvent } from "@/lib/analytics";

export default function GestorAgendaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);

  useEffect(() => {
    // Set document title and meta description
    document.title = "Prime - Agenda do Consultor";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Agenda do consultor educacional - Agende reuniões e entre em contato via WhatsApp');
    }

    // Log page view
    logEvent({
      event_type: 'page_view',
      event_name: 'agenda_consultor_page_viewed',
      properties: { 
        page: '/agenda-consultor',
        feature: 'agenda-consultor'
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchSchoolData();
    }
  }, [user]);

  const fetchSchoolData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.school_id) {
        const { data: schoolCustomization } = await supabase
          .from('school_customizations')
          .select('*')
          .eq('school_id', profile.school_id)
          .single();

        setSchoolData(schoolCustomization);
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    }
  };

  const handleBack = () => {
    logEvent({
      event_type: 'click',
      event_name: 'back_to_home',
      properties: { 
        from: '/agenda-consultor',
        to: '/inicio'
      }
    });
    navigate('/inicio');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <ConsultorAgenda onBack={handleBack} schoolData={schoolData} />
      </div>
    </div>
  );
}