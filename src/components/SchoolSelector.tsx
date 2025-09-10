import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Building, Settings } from 'lucide-react';
import { useSchool } from '@/contexts/SchoolContext';

interface School {
  id: string;
  school_name: string;
  logo_url?: string;
  theme_color?: string;
}

interface SchoolSelectorProps {
  onSelectAdmin: () => void;
}

export const SchoolSelector = ({ onSelectAdmin }: SchoolSelectorProps) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectSchool } = useSchool();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('school_customizations')
          .select('id, school_name, logo_url, theme_color')
          .order('school_name');

        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('Erro ao carregar escolas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school =>
    school.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSchoolSelect = (schoolId: string) => {
    selectSchool(schoolId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Prime Hub</h1>
          <p className="text-muted-foreground">Selecione uma escola ou acesse o painel administrativo</p>
          <Badge variant="secondary" className="mt-2">
            Modo Administrador
          </Badge>
        </div>

        {/* Admin Panel Button */}
        <div className="mb-8 text-center">
          <Button onClick={onSelectAdmin} size="lg" className="gap-2">
            <Settings className="h-5 w-5" />
            Painel de Administração
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSchools.map((school) => (
            <Card 
              key={school.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => handleSchoolSelect(school.id)}
            >
              <CardContent className="p-6 text-center">
                {school.logo_url ? (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={school.logo_url}
                      alt={`Logo ${school.school_name}`}
                      className="h-16 w-16 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex justify-center">
                    <div 
                      className="h-16 w-16 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: school.theme_color || '#3b82f6' }}
                    >
                      <Building className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}
                <h3 className="font-semibold text-foreground truncate">
                  {school.school_name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique para acessar
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSchools.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma escola encontrada
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Tente uma busca diferente' : 'Não há escolas cadastradas'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};