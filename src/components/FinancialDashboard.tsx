
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

interface FinancialDashboardProps {
  onBack: () => void;
}

const FinancialDashboard = ({ onBack }: FinancialDashboardProps) => {
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generateMetabaseUrl = async () => {
      try {
        // Simulando a geração do token JWT (isso deveria ser feito no backend)
        const METABASE_SITE_URL = "https://graficos.proesc.com";
        
        // Para teste, vamos tentar carregar diretamente com um token simulado
        // Em produção, isso deve ser feito através de uma API do backend
        const simulatedToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZXNvdXJjZSI6eyJkYXNoYm9hcmQiOjUyfSwicGFyYW1zIjp7ImVudGlkYWRlX2lkIjpbNDQ0Ml19LCJleHAiOjE3MzU0MTM3NTV9";
        
        const url = `${METABASE_SITE_URL}/embed/dashboard/${simulatedToken}#bordered=true&titled=true`;
        
        console.log('Generated Metabase URL:', url);
        setIframeUrl(url);
        setIsLoading(false);
      } catch (err) {
        console.error('Error generating Metabase URL:', err);
        setError('Erro ao carregar dashboard do Metabase');
        setIsLoading(false);
      }
    };

    generateMetabaseUrl();
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('Iframe loaded successfully');
  };

  const handleIframeError = () => {
    setError('Erro ao carregar o dashboard. Verifique a conexão com o Metabase.');
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Financeira</h2>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Relatórios Financeiros - Proesc</span>
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
                    Erro na Integração
                  </h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <p className="text-sm text-red-600">
                  Para uma integração completa, implemente a geração de tokens JWT no backend seguindo as orientações do Metabase.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                    <span>Carregando dashboard...</span>
                  </div>
                </div>
              )}
              <iframe
                src={iframeUrl}
                title="Dashboard Financeira Metabase"
                width="100%"
                height="600"
                frameBorder="0"
                allowTransparency
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                className="w-full border-0"
                style={{ minHeight: '600px' }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Nota:</strong> Esta é uma implementação de teste. Para produção, implemente a geração de tokens JWT no backend por questões de segurança.</p>
      </div>
    </div>
  );
};

export default FinancialDashboard;
