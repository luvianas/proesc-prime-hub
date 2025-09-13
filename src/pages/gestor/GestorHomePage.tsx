import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { 
  Bot, 
  Ticket, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  FileText, 
  GraduationCap,
  TrendingUp,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { logEvent } from "@/lib/analytics";
import NovidadesCarousel from "@/components/NovidadesCarousel";
import AIAssistant from "@/components/AIAssistant";

interface SchoolCustomization {
  school_name?: string;
  school_id: string;
  show_market_analysis?: boolean;
}

interface UserProfile {
  name?: string;
  email?: string;
  role?: string;
  school_id?: string;
}

export default function GestorHomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [schoolData, setSchoolData] = useState<SchoolCustomization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSchoolData();
    }
  }, [user]);

  useEffect(() => {
    // Set document title and meta description
    document.title = "Prime - Início";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Dashboard principal do Prime - Sistema de gestão educacional');
    }
  }, []);

  const fetchSchoolData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, role, school_id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        
        if (profile.school_id) {
          // Then get school customizations
          const { data: schoolCustomization, error } = await supabase
            .from('school_customizations')
            .select('*')
            .eq('school_id', profile.school_id)
            .single();

          if (error) {
            console.error('Error fetching school data:', error);
            toast({
              title: "Erro ao carregar dados da escola",
              description: "Não foi possível carregar as informações da escola.",
              variant: "destructive",
            });
          } else {
            setSchoolData(schoolCustomization);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro interno",
        description: "Erro ao carregar dados. Tente recarregar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (section: string, path: string) => {
    logEvent({
      event_type: 'click',
      event_name: `navigate_to_${section}`,
      properties: { 
        section,
        path,
        from: 'home',
        user_role: userProfile.role 
      }
    });
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!schoolData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Escola não encontrada</h2>
          <p className="text-gray-600 dark:text-gray-400">Não foi possível encontrar os dados da sua escola.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Bem-vindo ao Prime
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mt-2">
              {schoolData.school_name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              IA Assistant
            </Button>
          </div>
        </div>

        {/* Novidades Carousel */}
        <div className="mb-8">
          <NovidadesCarousel schoolId={schoolData.school_id} />
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Tickets */}
          <Card 
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => navigateTo('tickets', '/acompanhar-tickets')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sistema de Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Tickets</div>
              <p className="text-xs text-muted-foreground">
                Acompanhe e gerencie solicitações
              </p>
            </CardContent>
          </Card>

          {/* Consultor Agenda */}
          <Card 
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => navigateTo('agenda-consultor', '/agenda-consultor')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agenda do Consultor</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Agenda</div>
              <p className="text-xs text-muted-foreground">
                Contate seu consultor educacional
              </p>
            </CardContent>
          </Card>

          {/* Dashboard Financeiro */}
          <Card 
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => navigateTo('dashboard-financeiro', '/dashboard/financeiro')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dashboard Financeiro</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Financeiro</div>
              <p className="text-xs text-muted-foreground">
                Relatórios e análises financeiras
              </p>
            </CardContent>
          </Card>

          {/* Dashboard Agenda */}
          <Card 
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => navigateTo('dashboard-agenda', '/dashboard/agenda')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dashboard Agenda</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Proesc Agenda</div>
              <p className="text-xs text-muted-foreground">
                Visualização de agendamentos
              </p>
            </CardContent>
          </Card>

          {/* Dashboard Secretaria */}
          <Card 
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => navigateTo('dashboard-secretaria', '/dashboard/secretaria')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dashboard Secretaria</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Secretaria</div>
              <p className="text-xs text-muted-foreground">
                Relatórios administrativos
              </p>
            </CardContent>
          </Card>

          {/* Dashboard Pedagógico */}
          <Card 
            className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => navigateTo('dashboard-pedagogico', '/dashboard/pedagogico')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dashboard Pedagógico</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Pedagógico</div>
              <p className="text-xs text-muted-foreground">
                Análises educacionais
              </p>
            </CardContent>
          </Card>

          {/* Market Analysis (conditional) */}
          {schoolData.show_market_analysis && (
            <Card 
              className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => navigateTo('estudo-mercado', '/estudo-mercado')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estudo de Mercado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Análise</div>
                <p className="text-xs text-muted-foreground">
                  Insights de mercado educacional
                </p>
                <Badge variant="secondary" className="mt-2">Novo</Badge>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Assistant */}
        {showAIAssistant && (
          <AIAssistant 
            onClose={() => setShowAIAssistant(false)}
          />
        )}
      </div>
    </div>
  );
}