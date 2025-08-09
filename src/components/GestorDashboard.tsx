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
 
interface SchoolCustomization {
  id: string;
  school_name: string;
  theme_color: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_photo_url?: string;
  consultant_whatsapp?: string;
  consultant_calendar_url?: string;
  zendesk_integration_url?: string;
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

const GestorDashboard = () => {
  const [schoolData, setSchoolData] = useState<SchoolCustomization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<
    | 'home'
    | 'tickets'
    | 'consultor-agenda'
    | 'dash-financeiro'
    | 'dash-agenda'
    | 'dash-secretaria'
    | 'dash-pedagogico'
  >('home');
  const [showAssistant, setShowAssistant] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolData();
  }, [user]);

  useEffect(() => {
    document.title = 'Proesc Prime - Painel do Gestor';
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

  const fetchSchoolData = async () => {
    if (!user) return;

    try {
      // First get user profile with school_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id, name, email')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      if (!profile?.school_id) {
        toast({
          title: "Aviso",
          description: "Nenhuma escola associada a este usuário.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // Then get school customization data
      const { data: school, error: schoolError } = await supabase
        .from('school_customizations')
        .select('*')
        .eq('school_id', profile.school_id)
        .maybeSingle();

      if (schoolError) throw schoolError;

      setSchoolData(school);
    } catch (error: any) {
      console.error('Error fetching school data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da escola",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!schoolData || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <School className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Escola não encontrada</h2>
          <p className="text-muted-foreground">
            Nenhuma personalização de escola foi configurada para este usuário.
          </p>
        </div>
      </div>
    );
  }

  const handleExternalLink = (url: string | undefined, name: string) => {
    if (!url) {
      toast({
        title: 'Link não configurado',
        description: `A integração com ${name} não foi configurada ainda.`,
        variant: 'destructive',
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
      <div className="container mx-auto p-4">
        {activeSection === 'tickets' && <TicketSystem onBack={back} />}
        
        {activeSection === 'consultor-agenda' && (
          <ConsultorAgenda
            onBack={back}
            consultantName={schoolData.consultant_name}
            consultantWhatsapp={schoolData.consultant_whatsapp}
            consultantPhotoUrl={schoolData.consultant_photo_url}
            calendarEmbedUrl={schoolData.consultant_calendar_url}
          />
        )}
        {activeSection === 'dash-financeiro' && <FinancialDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.financeiro} />}
        {activeSection === 'dash-agenda' && <AgendaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.agenda} />}
        {activeSection === 'dash-secretaria' && <SecretariaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.secretaria} />}
        {activeSection === 'dash-pedagogico' && <PedagogicoDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.pedagogico} />}
        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${schoolData.theme_color}10 0%, ${schoolData.theme_color}05 100%)`,
      }}
    >
      <div className="container mx-auto p-6 space-y-6">
        {/* Novidades - Carrossel de Banners (no topo) */}
        <NovidadesCarousel schoolId={userProfile.school_id} />

        {/* Destaques */}
        <section className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Acompanhar Tickets</CardTitle>
              <CardDescription>Crie e acompanhe solicitações de suporte</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setActiveSection('tickets')}>
                Abrir
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Agenda do Consultor</CardTitle>
              <CardDescription>Próximos encontros e disponibilidade</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setActiveSection('consultor-agenda')}>
                Abrir Agenda
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Dashboards */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Dashboards</h2>
          <div className="grid md:grid-cols-2 gap-6">

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Dashboard Financeiro</CardTitle>
                <CardDescription>Receitas, inadimplência e projeções</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveSection('dash-financeiro')}>
                  Abrir
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Proesc Agenda</CardTitle>
                <CardDescription>Compromissos e lembretes acadêmicos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveSection('dash-agenda')}>
                  Abrir
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Dashboard Pedagógico</CardTitle>
                <CardDescription>Avaliações e desempenho acadêmico</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveSection('dash-pedagogico')}>
                  Abrir
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Dashboard Secretaria</CardTitle>
                <CardDescription>Gestão documental e processos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveSection('dash-secretaria')}>
                  Abrir
                </Button>
              </CardContent>
            </Card>

          </div>
        </section>


        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    </div>
  );
};

export default GestorDashboard;