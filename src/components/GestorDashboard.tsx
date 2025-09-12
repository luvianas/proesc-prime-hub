import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { School, CalendarDays, ClipboardList, Wallet, ClipboardCheck, GraduationCap, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AIAssistant from '@/components/AIAssistant';
import TicketSystem from '@/components/TicketSystem';
import ConsultorAgenda from '@/components/ConsultorAgenda';
import FinancialDashboard from '@/components/FinancialDashboard';
import SecretariaDashboard from '@/components/SecretariaDashboard';
import PedagogicoDashboard from '@/components/PedagogicoDashboard';
import AgendaDashboard from '@/components/AgendaDashboard';
import MarketAnalysisDashboard from '@/components/MarketAnalysisDashboard';
import NovidadesCarousel from '@/components/NovidadesCarousel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { logEvent } from '@/lib/analytics';
import { useBreakpoint, useIsMobile } from '@/hooks/useBreakpoint';
import MobileHeader from '@/components/MobileHeader';
import MobileNavigation from '@/components/MobileNavigation';
interface SchoolCustomization {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_id?: string;
  consultant_whatsapp?: string;
  consultant_calendar_url?: string;
  proesc_id?: string;
  organization_id?: number;
  metabase_integration_url?: string;
  market_analysis_enabled?: boolean;
  dashboard_links?: any;
  created_at: string;
  updated_at: string;
  created_by: string;
}
interface UserProfile {
  school_id: string;
  name: string;
  email: string;
}
interface GestorDashboardProps {
  adminViewSchoolId?: string;
}

const GestorDashboard = ({ adminViewSchoolId }: GestorDashboardProps) => {
  const [schoolData, setSchoolData] = useState<SchoolCustomization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'home' | 'tickets' | 'consultor-agenda' | 'dash-financeiro' | 'dash-agenda' | 'dash-secretaria' | 'dash-pedagogico' | 'market-analysis'>('home');
  const [showAssistant, setShowAssistant] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  
  const breakpoint = useBreakpoint();
  const isMobile = useIsMobile();
  
  const isAdminView = !!adminViewSchoolId;
  useEffect(() => {
    fetchSchoolData();
  }, [user, adminViewSchoolId]);
  useEffect(() => {
    document.title = 'Prime Hub - Gestor';
    const desc = 'Portal Prime para gestores: tickets, agenda do consultor e dashboards.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, []);

  // Track page views for the home section
  useEffect(() => {
    if (activeSection === 'home') {
      logEvent({ event_type: 'page_view', event_name: 'gestor_dashboard_home' });
    }
  }, [activeSection]);

  const navigateTo = (section: typeof activeSection) => {
    setActiveSection(section);
    logEvent({ event_type: 'click', event_name: 'open_section', properties: { section } });
  };

  const fetchSchoolData = async () => {
    if (!user && !adminViewSchoolId) return;
    
    try {
      let schoolId: string;
      
      if (adminViewSchoolId) {
        // Admin view - use provided school ID
        schoolId = adminViewSchoolId;
        // Create mock profile for admin view
        setUserProfile({
          school_id: adminViewSchoolId,
          name: 'Admin User',
          email: user?.email || 'admin@example.com'
        });
      } else {
        // Regular gestor view - get user profile
        const {
          data: profile,
          error: profileError
        } = await supabase.from('profiles').select('school_id, name, email').eq('user_id', user.id).single();
        if (profileError) throw profileError;
        if (!profile?.school_id) {
          toast({
            title: "Aviso",
            description: "Nenhuma escola associada a este usuário.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        setUserProfile(profile);
        schoolId = profile.school_id;
      }
      
      console.log('👤 GestorDashboard: Profile carregado, School ID:', schoolId);
      console.log('🎯 School ID para banners:', schoolId);
      
      const {
        data: school,
        error: schoolError
      } = await supabase.from('school_customizations').select('*').eq('school_id', schoolId).maybeSingle();
      if (schoolError) throw schoolError;
      setSchoolData(school);
    } catch (error: any) {
      console.error('Error fetching school data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da escola",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>;
  }
  if (!schoolData || !userProfile) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <School className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Escola não encontrada</h2>
          <p className="text-muted-foreground">
            Nenhuma personalização de escola foi configurada para este usuário.
          </p>
        </div>
      </div>;
  }
  const handleExternalLink = (url: string | undefined, name: string) => {
    if (!url) {
      toast({
        title: 'Link não configurado',
        description: `A integração com ${name} não foi configurada ainda.`,
        variant: 'destructive'
      });
      return;
    }
    window.open(url, '_blank');
  };
  if (!schoolData) return null;

  // Views other than home
  if (activeSection !== 'home') {
    const back = () => setActiveSection('home');
    return (
      <div className="min-h-screen bg-hero">
        <MobileHeader
          title={schoolData?.school_name || 'Portal Prime'}
          logoUrl={schoolData?.logo_url}
          onBackClick={back}
          showBack={true}
          isAdminView={isAdminView}
        />
        <div className="container mx-auto p-mobile safe-area-padding">
          {activeSection === 'tickets' && <TicketSystem onBack={back} school_id={adminViewSchoolId || schoolData?.id} />}
          {activeSection === 'consultor-agenda' && <ConsultorAgenda onBack={back} schoolData={schoolData} />}
          {activeSection === 'dash-financeiro' && <FinancialDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.financeiro} school_id={adminViewSchoolId || schoolData?.id} />}
          {activeSection === 'dash-agenda' && <AgendaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.agenda} school_id={adminViewSchoolId || schoolData?.id} />}
          {activeSection === 'dash-secretaria' && <SecretariaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.secretaria} school_id={adminViewSchoolId || schoolData?.id} />}
          {activeSection === 'dash-pedagogico' && <PedagogicoDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.pedagogico} school_id={adminViewSchoolId || schoolData?.id} />}
          {activeSection === 'market-analysis' && <MarketAnalysisDashboard onBack={back} schoolId={adminViewSchoolId || schoolData?.id} />}
          {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-hero overflow-x-hidden">
      {/* Mobile Navigation */}
      <MobileNavigation
        activeSection={activeSection}
        onNavigate={navigateTo}
        marketAnalysisEnabled={schoolData.market_analysis_enabled}
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        onProfileClick={() => {
          // For now, we don't have profile functionality in gestor dashboard
          // This would need to be passed from the parent Index component
        }}
      />

      <div className="container mx-auto p-mobile safe-area-padding spacing-mobile">
        {/* Admin viewing indicator */}
        {isAdminView && !isMobile && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-responsive-sm">
              <Badge variant="secondary">Admin View</Badge>
              <span className="text-primary font-medium">Visualizando como Admin:</span>
              <span className="font-semibold">{schoolData?.school_name}</span>
            </div>
          </div>
        )}

        {/* Welcome Message */}
        {!isMobile && (
          <div className="text-left py-mobile animate-fade-in">
            <h1 className="text-responsive-2xl font-bold mb-4 text-gradient">
              {isAdminView ? schoolData?.school_name : 'Bem-vindo ao seu Portal Prime'}
            </h1>
            <p className="text-responsive-lg text-muted-foreground">
              {isAdminView ? 'Portal da escola - Visualização de administrador' : 'Gerencie sua escola com excelência'}
            </p>
          </div>
        )}

        {/* Novidades - Carrossel de Banners */}
        <NovidadesCarousel schoolId={userProfile.school_id} />

        {/* Alternar tema - only show for regular gestor view and desktop */}
        {!isAdminView && !isMobile && (
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
        )}

        {/* Destaques - Mobile responsive */}
        <section className="mobile-grid">
          <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('tickets')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 mobile-heading">
                <ClipboardList className="h-6 w-6 text-primary flex-shrink-0" /> 
                <span className="truncate">Acompanhar Tickets</span>
              </CardTitle>
              <CardDescription className="mobile-text">Crie e acompanhe solicitações de suporte</CardDescription>
            </CardHeader>
          </Card>

          <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('consultor-agenda')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 mobile-heading">
                <CalendarDays className="h-6 w-6 text-primary flex-shrink-0" /> 
                <span className="truncate">Agenda do Consultor</span>
              </CardTitle>
              <CardDescription className="mobile-text">Agende reuniões e converse no WhatsApp</CardDescription>
            </CardHeader>
          </Card>

          {/* Análise de Mercado - Integrated in grid for mobile */}
          {schoolData.market_analysis_enabled && (
            <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('market-analysis')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 mobile-heading">
                  <TrendingUp className="h-6 w-6 text-primary flex-shrink-0" /> 
                  <span className="truncate">Estudo de Mercado</span>
                  <Badge variant="secondary" className="text-xs ml-auto">BETA</Badge>
                </CardTitle>
                <CardDescription className="mobile-text">Análise competitiva da região</CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('dash-financeiro')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 mobile-heading">
                <Wallet className="h-6 w-6 text-primary flex-shrink-0" /> 
                <span className="truncate">Dashboard Financeiro</span>
              </CardTitle>
              <CardDescription className="mobile-text">Receitas, inadimplência e projeções</CardDescription>
            </CardHeader>
          </Card>

          <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('dash-agenda')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 mobile-heading">
                <CalendarDays className="h-6 w-6 text-primary flex-shrink-0" /> 
                <span className="truncate">Proesc Agenda</span>
              </CardTitle>
              <CardDescription className="mobile-text">Compromissos e lembretes acadêmicos</CardDescription>
            </CardHeader>
          </Card>

          <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('dash-pedagogico')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 mobile-heading">
                <GraduationCap className="h-6 w-6 text-primary flex-shrink-0" /> 
                <span className="truncate">Dashboard Pedagógico</span>
              </CardTitle>
              <CardDescription className="mobile-text">Avaliações e desempenho acadêmico</CardDescription>
            </CardHeader>
          </Card>

          <Card className="mobile-card card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('dash-secretaria')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 mobile-heading">
                <ClipboardCheck className="h-6 w-6 text-primary flex-shrink-0" /> 
                <span className="truncate">Dashboard Secretaria</span>
              </CardTitle>
              <CardDescription className="mobile-text">Gestão documental e processos</CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* AI Assistant - only show for regular gestor view */}
        {!isAdminView && showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    </div>
  );
};
export default GestorDashboard;