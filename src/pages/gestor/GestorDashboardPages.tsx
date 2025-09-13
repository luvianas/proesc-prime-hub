import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FinancialDashboard from "@/components/FinancialDashboard";
import AgendaDashboard from "@/components/AgendaDashboard";
import SecretariaDashboard from "@/components/SecretariaDashboard";
import PedagogicoDashboard from "@/components/PedagogicoDashboard";
import MarketAnalysisDashboard from "@/components/MarketAnalysisDashboard";
import { logEvent } from "@/lib/analytics";

const dashboardTypes = {
  'financeiro': {
    component: FinancialDashboard,
    title: 'Dashboard Financeiro',
    description: 'Relatórios e análises financeiras da instituição'
  },
  'agenda': {
    component: AgendaDashboard,
    title: 'Dashboard Agenda',
    description: 'Visualização e análise de agendamentos'
  },
  'secretaria': {
    component: SecretariaDashboard,
    title: 'Dashboard Secretaria',
    description: 'Relatórios administrativos e de secretaria'
  },
  'pedagogico': {
    component: PedagogicoDashboard,
    title: 'Dashboard Pedagógico',
    description: 'Análises educacionais e pedagógicas'
  }
};

export default function GestorDashboardPages() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchSchoolData();
    }
  }, [user]);

  useEffect(() => {
    if (type && dashboardTypes[type as keyof typeof dashboardTypes]) {
      const dashboard = dashboardTypes[type as keyof typeof dashboardTypes];
      
      // Set document title and meta description
      document.title = `Prime - ${dashboard.title}`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', dashboard.description);
      }

      // Log page view
      logEvent({
        event_type: 'page_view',
        event_name: `dashboard_${type}_page_viewed`,
        properties: { 
          page: `/dashboard/${type}`,
          feature: `dashboard-${type}`
        }
      });
    }
  }, [type]);

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
        from: `/dashboard/${type}`,
        to: '/inicio'
      }
    });
    navigate('/inicio');
  };

  if (!type || !dashboardTypes[type as keyof typeof dashboardTypes]) {
    navigate('/inicio');
    return null;
  }

  const DashboardComponent = dashboardTypes[type as keyof typeof dashboardTypes].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <DashboardComponent 
          onBack={handleBack} 
          school_id={schoolData?.school_id}
        />
      </div>
    </div>
  );
}

// Market Analysis Page (separate due to conditional rendering)
export function GestorMarketAnalysisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);

  useEffect(() => {
    // Set document title and meta description
    document.title = "Prime - Estudo de Mercado";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Análise de mercado educacional - Insights e tendências do setor');
    }

    // Log page view
    logEvent({
      event_type: 'page_view',
      event_name: 'market_analysis_page_viewed',
      properties: { 
        page: '/estudo-mercado',
        feature: 'estudo-mercado'
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
        from: '/estudo-mercado',
        to: '/inicio'
      }
    });
    navigate('/inicio');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <MarketAnalysisDashboard 
          onBack={handleBack} 
          schoolId={schoolData?.school_id}
        />
      </div>
    </div>
  );
}