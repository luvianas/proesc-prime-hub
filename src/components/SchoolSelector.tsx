import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Settings, School } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchool } from '@/contexts/SchoolContext';
import AdminDashboard from '@/components/AdminDashboard';

interface SchoolData {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_name?: string;
  proesc_id?: string;
  organization_id?: number;
  created_at: string;
}

const SchoolSelector = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const { selectSchool } = useSchool();
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = schools.filter(school =>
        school.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.proesc_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.consultant_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [searchTerm, schools]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('school_customizations')
        .select('*')
        .order('school_name');
      
      if (error) throw error;
      
      setSchools(data || []);
      setFilteredSchools(data || []);
    } catch (error: any) {
      console.error('Error fetching schools:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de escolas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolSelect = (school: SchoolData) => {
    selectSchool({
      id: school.id,
      school_name: school.school_name,
      logo_url: school.logo_url,
      consultant_name: school.consultant_name,
      proesc_id: school.proesc_id,
      organization_id: school.organization_id,
    });
  };

  if (showAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen auth-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/lovable-uploads/31be6a89-85b7-486f-b156-ebe5b3557c02.png"
              alt="Proesc Prime"
              className="h-12"
            />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Seleção de Instituição
          </h1>
          <p className="text-xl text-muted-foreground">
            Escolha uma escola para gerenciar ou acesse o painel administrativo
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => setShowAdmin(true)}
            variant="outline"
            size="lg"
            className="flex-1 h-16 text-lg hover-lift"
          >
            <Settings className="w-6 h-6 mr-3" />
            Painel Administrativo
          </Button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Buscar por escola, ID Proesc ou consultor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-16 text-lg border-glow"
            />
          </div>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-lg">Carregando escolas...</div>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-16">
            <School className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Tente ajustar os termos de busca'
                : 'Aguarde o cadastro das primeiras escolas no sistema'
              }
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <Card
                key={school.id}
                className="card-elegant card-interactive cursor-pointer hover-lift"
                onClick={() => handleSchoolSelect(school)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={`Logo ${school.school_name}`}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight text-gradient line-clamp-2">
                        {school.school_name}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {school.proesc_id && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          ID: {school.proesc_id}
                        </Badge>
                      </div>
                    )}
                    
                    {school.consultant_name && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Consultor:</span> {school.consultant_name}
                      </div>
                    )}
                    
                    {school.organization_id && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Org ID:</span> {school.organization_id}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Cadastrado em: {new Date(school.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolSelector;