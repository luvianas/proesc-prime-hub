import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, School, User, BarChart3, MessageCircle, Bot, CalendarDays, ListChecks, ClipboardList, LineChart, Wallet, ClipboardCheck, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AIAssistant from '@/components/AIAssistant';
import TicketSystem from '@/components/TicketSystem';
import ConsultorAgenda from '@/components/ConsultorAgenda';
import MatriculaDashboard from '@/components/MatriculaDashboard';
import FinancialDashboard from '@/components/FinancialDashboard';
import SecretariaDashboard from '@/components/SecretariaDashboard';
import PedagogicoDashboard from '@/components/PedagogicoDashboard';
import AgendaDashboard from '@/components/AgendaDashboard';
import TicketQueue from '@/components/TicketQueue';

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
    | 'queue'
    | 'consultor-agenda'
    | 'dash-matricula'
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
    const desc = 'Portal Prime para gestores: tickets, WhatsApp do consultor, agenda e dashboards.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
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

  const handleWhatsAppClick = () => {
    const phone = schoolData?.consultant_whatsapp?.replace(/\D/g, '');
    if (!phone) {
      toast({
        title: 'WhatsApp não configurado',
        description: 'Solicite ao administrador para configurar o WhatsApp do consultor.',
        variant: 'destructive',
      });
      return;
    }
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  if (!schoolData) return null;

  // Views other than home
  if (activeSection !== 'home') {
    const back = () => setActiveSection('home');
    return (
      <div className="container mx-auto p-4">
        {activeSection === 'tickets' && <TicketSystem onBack={back} />}
        {activeSection === 'queue' && <TicketQueue onBack={back} />}
        {activeSection === 'consultor-agenda' && <ConsultorAgenda onBack={back} />}
        {activeSection === 'dash-matricula' && <MatriculaDashboard onBack={back} />}
        {activeSection === 'dash-financeiro' && <FinancialDashboard onBack={back} />}
        {activeSection === 'dash-agenda' && <AgendaDashboard onBack={back} />}
        {activeSection === 'dash-secretaria' && <SecretariaDashboard onBack={back} />}
        {activeSection === 'dash-pedagogico' && <PedagogicoDashboard onBack={back} />}
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
        {/* Header with School Info */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              {schoolData.logo_url ? (
                <img
                  src={schoolData.logo_url}
                  alt={`Logo ${schoolData.school_name}`}
                  className="w-20 h-20 object-contain rounded-lg"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: schoolData.theme_color }}
                >
                  {schoolData.school_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{schoolData.school_name}</h1>
                <p className="text-muted-foreground mt-2">Painel de Gestão - {userProfile?.name}</p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge
                    style={{ backgroundColor: schoolData.theme_color, color: 'white' }}
                  >
                    Gestor
                  </Badge>
                  {schoolData.consultant_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" /> Consultor: {schoolData.consultant_name}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowAssistant(true)} aria-label="Abrir IA Assistente">
                  <Bot className="h-4 w-4 mr-2" /> IA Assistente
                </Button>
                {schoolData.consultant_photo_url && (
                  <img
                    src={schoolData.consultant_photo_url}
                    alt="Foto do consultor"
                    className="w-16 h-16 rounded-full object-cover border-2"
                    style={{ borderColor: schoolData.theme_color }}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acessos Rápidos */}
        <section className="grid md:grid-cols-3 gap-6">
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
              <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Fila de Tickets</CardTitle>
              <CardDescription>Veja a ordem de atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setActiveSection('queue')}>
                Abrir
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp do Consultor</CardTitle>
              <CardDescription>Fale diretamente com o seu consultor</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleWhatsAppClick}>
                Abrir WhatsApp
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Agenda do Consultor</CardTitle>
              <CardDescription>Próximos encontros e disponibilidade</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setActiveSection('consultor-agenda')}>
                Abrir Agenda
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Dashboard de Matrícula</CardTitle>
              <CardDescription>Acompanhe seu funil de matrículas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setActiveSection('dash-matricula')}>
                Abrir
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Dashboard Financeiro</CardTitle>
              <CardDescription>Receitas, inadimplência e projeções</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setActiveSection('dash-financeiro')}>
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
              <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Dashboard Secretaria</CardTitle>
              <CardDescription>Gestão documental e processos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setActiveSection('dash-secretaria')}>
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
        </section>

        {/* Integrações (opcionais) */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" style={{ color: schoolData.theme_color }} />
                Suporte - Zendesk
              </CardTitle>
              <CardDescription>Acesse o sistema de tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExternalLink(schoolData.zendesk_integration_url, 'Zendesk')}
                className="w-full"
                style={{ backgroundColor: schoolData.theme_color, borderColor: schoolData.theme_color }}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir Zendesk
              </Button>
              {!schoolData.zendesk_integration_url && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Integração não configurada</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: schoolData.theme_color }} />
                Dashboards - Metabase
              </CardTitle>
              <CardDescription>Relatórios e métricas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExternalLink(schoolData.metabase_integration_url, 'Metabase')}
                className="w-full"
                variant="outline"
                style={{ borderColor: schoolData.theme_color, color: schoolData.theme_color }}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir Metabase
              </Button>
              {!schoolData.metabase_integration_url && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Integração não configurada</p>
              )}
            </CardContent>
          </Card>
        </div>

        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    </div>
  );
};

export default GestorDashboard;