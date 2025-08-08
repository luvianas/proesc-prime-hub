import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, School, User, BarChart3, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SchoolCustomization {
  id: string;
  school_name: string;
  theme_color: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_photo_url?: string;
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolData();
  }, [user]);

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
        .single();

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
        title: "Link não configurado",
        description: `A integração com ${name} não foi configurada ainda.`,
        variant: "destructive",
      });
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(135deg, ${schoolData.theme_color}10 0%, ${schoolData.theme_color}05 100%)` 
      }}
    >
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with School Info */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center space-x-6">
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
                <p className="text-muted-foreground mt-2">
                  Painel de Gestão - {userProfile.name}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge 
                    style={{ 
                      backgroundColor: schoolData.theme_color,
                      color: 'white'
                    }}
                  >
                    Gestor
                  </Badge>
                  {schoolData.consultant_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      Consultor: {schoolData.consultant_name}
                    </div>
                  )}
                </div>
              </div>
              {schoolData.consultant_photo_url && (
                <img 
                  src={schoolData.consultant_photo_url} 
                  alt="Foto do consultor"
                  className="w-16 h-16 rounded-full object-cover border-2"
                  style={{ borderColor: schoolData.theme_color }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Integration Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Zendesk Integration */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle 
                  className="w-5 h-5"
                  style={{ color: schoolData.theme_color }}
                />
                Suporte - Zendesk
              </CardTitle>
              <CardDescription>
                Acesse o sistema de tickets e suporte da escola
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => handleExternalLink(schoolData.zendesk_integration_url, 'Zendesk')}
                className="w-full"
                style={{ 
                  backgroundColor: schoolData.theme_color,
                  borderColor: schoolData.theme_color
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Zendesk
              </Button>
              {!schoolData.zendesk_integration_url && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Integração não configurada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metabase Integration */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 
                  className="w-5 h-5"
                  style={{ color: schoolData.theme_color }}
                />
                Dashboards - Metabase
              </CardTitle>
              <CardDescription>
                Visualize relatórios e métricas da escola
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => handleExternalLink(schoolData.metabase_integration_url, 'Metabase')}
                className="w-full"
                variant="outline"
                style={{ 
                  borderColor: schoolData.theme_color,
                  color: schoolData.theme_color
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Metabase
              </Button>
              {!schoolData.metabase_integration_url && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Integração não configurada
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* School Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School 
                className="w-5 h-5"
                style={{ color: schoolData.theme_color }}
              />
              Informações da Escola
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Nome da Escola</h4>
                <p className="font-medium">{schoolData.school_name}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Cor do Tema</h4>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: schoolData.theme_color }}
                  />
                  <span className="text-sm font-mono">{schoolData.theme_color}</span>
                </div>
              </div>
              {schoolData.consultant_name && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Consultor Responsável</h4>
                  <p className="font-medium">{schoolData.consultant_name}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Gestor</h4>
                <p className="font-medium">{userProfile.name}</p>
                <p className="text-sm text-muted-foreground">{userProfile.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Acesso Rápido</h3>
              <p className="text-sm text-muted-foreground">
                Use os botões acima para acessar diretamente as ferramentas de gestão configuradas 
                pelo administrador para sua escola.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GestorDashboard;