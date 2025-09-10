import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import GestorDashboard from '@/components/GestorDashboard';
import { useAdminSchoolContext } from '@/hooks/useAdminSchoolContext';

const SchoolViewer = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSelectedSchool, setIsViewingAsAdmin } = useAdminSchoolContext();
  
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData();
    }
  }, [schoolId]);

  useEffect(() => {
    // Set admin context when component mounts
    setIsViewingAsAdmin(true);
    
    // Cleanup when component unmounts
    return () => {
      setIsViewingAsAdmin(false);
      setSelectedSchool(null);
    };
  }, [setIsViewingAsAdmin, setSelectedSchool]);

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
      setSelectedSchool({
        id: data.id,
        school_name: data.school_name,
        logo_url: data.logo_url,
        consultant_name: data.consultant_name,
        consultant_whatsapp: data.consultant_whatsapp,
        consultant_calendar_url: data.consultant_calendar_url,
        proesc_id: data.proesc_id,
        dashboard_links: data.dashboard_links as any
      });
      
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

  return (
    <div className="relative">
      {/* Back to selection button */}
      <div className="absolute top-4 left-4 z-10">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar à Seleção
        </Button>
      </div>
      
      {/* Use the original GestorDashboard with admin school ID */}
      <GestorDashboard adminViewSchoolId={schoolId} />
    </div>
  );
};

export default SchoolViewer;