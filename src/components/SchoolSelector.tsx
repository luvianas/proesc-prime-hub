import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { School, Settings, Search, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface SchoolData {
  id: string;
  school_name: string;
  logo_url?: string;
  proesc_id?: string;
  consultant_name?: string;
  created_at: string;
}

const SchoolSelector = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('school_customizations')
        .select('id, school_name, logo_url, proesc_id, consultant_name, created_at')
        .order('school_name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as escolas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.proesc_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSchoolSelect = (schoolId: string) => {
    navigate(`/admin/school/${schoolId}`);
  };

  const handleAdminDashboard = () => {
    navigate('/admin/dashboard');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando escolas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-4 text-gradient">
          Seleção de Ambiente
        </h1>
        <p className="text-xl text-muted-foreground">
          Escolha a escola para visualizar ou acesse o painel administrativo
        </p>
      </div>

      {/* Admin Dashboard Option */}
      <Card className="card-elegant border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Settings className="h-7 w-7 text-primary" />
            Painel Administrativo
          </CardTitle>
          <CardDescription className="text-lg">
            Gerenciar usuários, escolas e configurações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAdminDashboard}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            Acessar Painel Admin
          </Button>
        </CardContent>
      </Card>

      {/* Schools Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Building className="h-6 w-6" />
            Escolas Disponíveis
          </h2>
          <Badge variant="secondary" className="text-sm">
            {filteredSchools.length} escola{filteredSchools.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da escola ou ID Proesc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Schools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map((school) => (
            <Card 
              key={school.id} 
              className="card-elegant card-interactive cursor-pointer hover:border-primary/40 transition-all"
              onClick={() => handleSchoolSelect(school.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {school.logo_url ? (
                    <div className="logo-adaptive logo-round h-10 w-10 flex-shrink-0">
                      <img 
                        src={school.logo_url} 
                        alt={`Logo ${school.school_name}`}
                        className="h-full w-full"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <School className="h-10 w-10 text-primary" />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">
                      {school.school_name}
                    </CardTitle>
                    {school.proesc_id && (
                      <p className="text-sm text-muted-foreground">
                        ID: {school.proesc_id}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {school.consultant_name && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Consultor: {school.consultant_name}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Criada em {new Date(school.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    Acessar →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSchools.length === 0 && !loading && (
          <div className="text-center py-12">
            <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma escola encontrada</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Tente ajustar os termos de busca' : 'Não há escolas cadastradas ainda'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolSelector;