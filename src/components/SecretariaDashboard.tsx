import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import AIInsightsButton from "@/components/AIInsightsButton";
import { supabase } from "@/integrations/supabase/client";

interface SecretariaDashboardProps {
  onBack: () => void;
  dashboardUrl?: string;
  school_id?: string;
}

const SecretariaDashboard = ({ onBack, dashboardUrl, school_id }: SecretariaDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateEmbedUrl = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Use school_id prop (admin view) or fetch from user profile (gestor view)
        let targetSchoolId = school_id;
        
        if (!targetSchoolId) {
          // Get current user's school and proesc_id
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('Usuário não autenticado');
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('user_id', user.id)
            .single();

          if (!profile?.school_id) {
            throw new Error('Escola não encontrada para o usuário');
          }
          
          targetSchoolId = profile.school_id;
        }

        const { data: schoolConfig } = await supabase
          .from('school_customizations')
          .select('proesc_id')
          .eq('school_id', targetSchoolId)
          .single();

        if (!schoolConfig?.proesc_id) {
          throw new Error('ID da escola no Proesc não configurado');
        }

        // Generate Metabase embed token
        const { data: embedData, error: embedError } = await supabase.functions.invoke('metabase-embed-token', {
          body: {
            dashboardType: 'secretaria',
            proescId: schoolConfig.proesc_id
          }
        });

        if (embedError) {
          throw new Error(embedError.message || 'Erro ao gerar token de incorporação');
        }

        setEmbedUrl(embedData.iframeUrl);
      } catch (err) {
        console.error('Erro ao gerar URL de incorporação:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    generateEmbedUrl();
  }, [school_id]);

  const handleIframeLoad = () => {
    console.log('Dashboard de Secretaria carregada com sucesso');
  };

  const handleIframeError = () => {
    setError('Erro ao carregar o dashboard de Secretaria. Verifique a conexão.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h2 className="text-3xl font-bold text-brand">Dashboard de Secretaria</h2>
        </div>
        <AIInsightsButton 
          label="Explicar com IA" 
          cardId={43}
          dashboardUrl={embedUrl || ''}
          dashboardType="secretaria"
          question="Analise os dados administrativos desta dashboard e forneça insights sobre processos da secretaria, documentação e eficiência operacional"
          school_id={school_id}
        />
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Relatórios de Secretaria</span>
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-red-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">
                    Erro no Carregamento
                  </h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                    <span>Carregando dashboard de secretaria...</span>
                  </div>
                </div>
              )}
              {embedUrl && (
                <iframe
                  src={embedUrl}
                  title="Dashboard de Secretaria"
                  width="100%"
                  height="800"
                  frameBorder="0"
                  allowTransparency
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  className="w-full border-0"
                  style={{ minHeight: '800px' }}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Dashboard de Secretaria:</strong> Visualização integrada dos relatórios administrativos e documentos.</p>
      </div>
    </div>
  );
};

export default SecretariaDashboard;
