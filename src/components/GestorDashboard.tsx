import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { School, CalendarDays, ClipboardList, Wallet, ClipboardCheck, GraduationCap } from 'lucide-react';
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
import NovidadesCarousel from '@/components/NovidadesCarousel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { logEvent } from '@/lib/analytics';
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
  isAdminMode?: boolean;
  selectedSchoolId?: string;
  onBackToSelection?: () => void;
}

const GestorDashboard = ({ isAdminMode, selectedSchoolId, onBackToSelection }: GestorDashboardProps = {}) => {
  const [schoolData, setSchoolData] = useState<SchoolCustomization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'home' | 'tickets' | 'consultor-agenda' | 'dash-financeiro' | 'dash-agenda' | 'dash-secretaria' | 'dash-pedagogico'>('home');
  const [showAssistant, setShowAssistant] = useState(false);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchSchoolData();
  }, [user, selectedSchoolId, isAdminMode]);
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
    if (!user) return;
    
    try {
      let schoolIdToUse: string;
      
      if (isAdminMode && selectedSchoolId) {
        // In admin mode, use the selected school ID directly
        schoolIdToUse = selectedSchoolId;
        setUserProfile({
          school_id: selectedSchoolId,
          name: user.email || 'Admin User',
          email: user.email || ''
        });
      } else {
        // Normal gestor mode - get school_id from user profile
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
        schoolIdToUse = profile.school_id;
      }

      console.log('👤 GestorDashboard: Profile carregado, school_id:', schoolIdToUse);
      console.log('🎯 School ID para banners:', schoolIdToUse);
      
      const {
        data: school,
        error: schoolError
      } = await supabase.from('school_customizations').select('*').eq('school_id', schoolIdToUse).maybeSingle();
      
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
    return <div className="container mx-auto p-4">
        {activeSection === 'tickets' && <TicketSystem onBack={back} />}
        
        {activeSection === 'consultor-agenda' && <ConsultorAgenda onBack={back} schoolData={schoolData} />}
        {activeSection === 'dash-financeiro' && <FinancialDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.financeiro} />}
        {activeSection === 'dash-agenda' && <AgendaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.agenda} />}
        {activeSection === 'dash-secretaria' && <SecretariaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.secretaria} />}
        {activeSection === 'dash-pedagogico' && <PedagogicoDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.pedagogico} />}
        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>;
  }
  return <div className="min-h-screen bg-hero">
      {/* Admin Header */}
      {isAdminMode && onBackToSelection && (
        <div className="bg-card/90 backdrop-blur-md border-b border-border/30 shadow-elegant">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {schoolData?.logo_url ? (
                  <img
                    src={schoolData.logo_url}
                    alt={`Logo ${schoolData.school_name}`}
                    className="w-12 h-12 object-contain rounded hover-scale"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gradient-primary text-white flex items-center justify-center font-bold">
                    {schoolData?.school_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gradient">{schoolData?.school_name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      Portal Prime
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                      Modo Admin
                    </Badge>
                  </div>
                </div>
              </div>
              <Button onClick={onBackToSelection} variant="outline" className="gap-2">
                ← Voltar à Seleção
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Welcome Message */}
        <div className="text-left py-8 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Bem-vindo ao seu Portal Prime
          </h1>
          <p className="text-xl text-muted-foreground">
            Gerencie sua escola com excelência
          </p>
        </div>

        {/* Novidades - Carrossel de Banners */}
        <NovidadesCarousel schoolId={userProfile.school_id} />

        {/* Alternar tema */}
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        {/* Destaques */}
        <section className="grid md:grid-cols-2 gap-8">
          <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('tickets')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <ClipboardList className="h-6 w-6 text-primary" /> 
                Acompanhar Tickets
              </CardTitle>
              <CardDescription className="text-base">Crie e acompanhe solicitações de suporte</CardDescription>
            </CardHeader>
          </Card>

          <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                onClick={() => navigateTo('consultor-agenda')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <CalendarDays className="h-6 w-6 text-primary" /> 
                Agenda do Consultor
              </CardTitle>
              <CardDescription className="text-base">Agende reuniões e converse no WhatsApp</CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Dashboards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Dashboards</h2>
          <div className="grid md:grid-cols-2 gap-8">

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-financeiro')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Wallet className="h-6 w-6 text-primary" /> 
                  Dashboard Financeiro
                </CardTitle>
                <CardDescription className="text-base">Receitas, inadimplência e projeções</CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-agenda')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CalendarDays className="h-6 w-6 text-primary" /> 
                  Proesc Agenda
                </CardTitle>
                <CardDescription className="text-base">Compromissos e lembretes acadêmicos</CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-pedagogico')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <GraduationCap className="h-6 w-6 text-primary" /> 
                  Dashboard Pedagógico
                </CardTitle>
                <CardDescription className="text-base">Avaliações e desempenho acadêmico</CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-secretaria')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <ClipboardCheck className="h-6 w-6 text-primary" /> 
                  Dashboard Secretaria
                </CardTitle>
                <CardDescription className="text-base">Gestão documental e processos</CardDescription>
              </CardHeader>
            </Card>

          </div>
        </section>


        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    </div>;
};
export default GestorDashboard;