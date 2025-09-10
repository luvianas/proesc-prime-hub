import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardList, CalendarDays, Wallet, ClipboardCheck, GraduationCap, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AIAssistant from '@/components/AIAssistant';
import TicketSystem from '@/components/TicketSystem';
import ConsultorAgenda from '@/components/ConsultorAgenda';
import FinancialDashboard from '@/components/FinancialDashboard';
import SecretariaDashboard from '@/components/SecretariaDashboard';
import PedagogicoDashboard from '@/components/PedagogicoDashboard';
import AgendaDashboard from '@/components/AgendaDashboard';
import NovidadesCarousel from '@/components/NovidadesCarousel';

interface SchoolData {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_whatsapp?: string;
  consultant_calendar_url?: string;
  proesc_id?: string;
  dashboard_links?: any;
}

const SchoolViewer = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'home' | 'tickets' | 'consultor-agenda' | 'dash-financeiro' | 'dash-agenda' | 'dash-secretaria' | 'dash-pedagogico'>('home');
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData();
    }
  }, [schoolId]);

  const fetchSchoolData = async () => {
    if (!schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from('school_customizations')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      
      setSchoolData(data);
      
      // Update page title
      document.title = `Prime Hub - ${data.school_name} (Admin View)`;
    } catch (error) {
      console.error('Error fetching school data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da escola',
        variant: 'destructive'
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (section: typeof activeSection) => {
    setActiveSection(section);
  };

  const back = () => {
    setActiveSection('home');
  };

  const handleBack = () => {
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dados da escola...</p>
        </div>
      </div>
    );
  }

  if (!schoolData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Escola não encontrada</h3>
          <p className="text-muted-foreground mb-4">
            Os dados da escola não foram localizados
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Seleção
          </Button>
        </div>
      </div>
    );
  }

  // Render specific sections
  if (activeSection !== 'home') {
    return (
      <div className="min-h-screen bg-hero">
        {/* Admin viewing indicator */}
        <div className="bg-primary/10 border-b border-primary/20 px-6 py-3">
          <div className="container mx-auto flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">Visualizando como Admin:</span>
            <span className="font-semibold">{schoolData.school_name}</span>
            <Badge variant="secondary" className="ml-2">Admin View</Badge>
          </div>
        </div>
        
        {activeSection === 'tickets' && <TicketSystem onBack={back} />}
        {activeSection === 'consultor-agenda' && <ConsultorAgenda onBack={back} />}
        {activeSection === 'dash-financeiro' && <FinancialDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.financeiro} />}
        {activeSection === 'dash-agenda' && <AgendaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.agenda} />}
        {activeSection === 'dash-secretaria' && <SecretariaDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.secretaria} />}
        {activeSection === 'dash-pedagogico' && <PedagogicoDashboard onBack={back} dashboardUrl={schoolData.dashboard_links?.pedagogico} />}
        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero">
      <div className="container mx-auto p-6 space-y-8">
        {/* Back button and Admin indicator */}
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Seleção
          </Button>
          <Badge variant="secondary" className="mb-4">
            <Eye className="h-4 w-4 mr-1" />
            Visualização Admin
          </Badge>
        </div>

        {/* Welcome Message */}
        <div className="text-left py-8 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            {schoolData.school_name}
          </h1>
          <p className="text-xl text-muted-foreground">
            Portal da escola - Visualização de administrador
          </p>
          {schoolData.proesc_id && (
            <p className="text-lg text-muted-foreground mt-2">
              ID Proesc: {schoolData.proesc_id}
            </p>
          )}
        </div>

        {/* Novidades - Carrossel de Banners */}
        <NovidadesCarousel schoolId={schoolId!} />

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
              <CardDescription className="text-base">Acesse a agenda e informações de contato</CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Dashboards */}
        <section>
          <h2 className="text-3xl font-bold mb-6 text-gradient">Dashboards Especializados</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-financeiro')}>
              <CardHeader className="text-center pb-3">
                <CardTitle className="flex items-center justify-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                  Dashboard Financeiro
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-agenda')}>
              <CardHeader className="text-center pb-3">
                <CardTitle className="flex items-center justify-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Proesc Agenda
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-pedagogico')}>
              <CardHeader className="text-center pb-3">
                <CardTitle className="flex items-center justify-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Dashboard Pedagógico
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-elegant card-interactive rounded-xl animate-scale-in" 
                  onClick={() => navigateTo('dash-secretaria')}>
              <CardHeader className="text-center pb-3">
                <CardTitle className="flex items-center justify-center gap-2 text-lg">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Dashboard Secretaria
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* AI Assistant toggle */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setShowAssistant(!showAssistant)}
            className="rounded-full shadow-lg"
            size="lg"
          >
            {showAssistant ? 'Fechar IA' : 'Assistente IA'}
          </Button>
        </div>

        {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}
      </div>
    </div>
  );
};

export default SchoolViewer;