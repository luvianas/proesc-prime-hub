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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
 
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
  avatar_url?: string;
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

  // Apply school theme colors dynamically
  useEffect(() => {
    if (schoolData?.theme_color) {
      // Convert hex to HSL for CSS custom properties
      const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      const hslColor = hexToHsl(schoolData.theme_color);
      document.documentElement.style.setProperty('--primary', hslColor);
    }
  }, [schoolData]);

  const fetchSchoolData = async () => {
    if (!user) return;

    try {
      // First get user profile with school_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id, name, email, avatar_url')
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
      console.log('👤 GestorDashboard: Profile carregado:', profile);
      console.log('🎯 School ID para banners:', profile.school_id);
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header with logo and profile */}
      <header className="bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/930b35eb-0dec-4ae6-b035-c09aaa983262.png" 
              alt="Proesc Prime Logo" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {schoolData.school_name}
              </h1>
              <p className="text-sm text-muted-foreground">Portal Prime</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 hover:bg-primary/10"
            >
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src={userProfile.avatar_url || ''} alt={userProfile.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {userProfile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium">{userProfile.name}</p>
              <p className="text-xs text-muted-foreground">Gestor</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Welcome Message */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            Bem-vindo ao seu Portal Prime
          </h1>
          <p className="text-lg text-muted-foreground">
            {schoolData.school_name} - Gerencie sua escola com excelência
          </p>
        </div>

        {/* Novidades - Carrossel de Banners */}
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