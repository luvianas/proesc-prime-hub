
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

interface SecretariaDashboardProps {
  onBack: () => void;
}

const SecretariaDashboard = ({ onBack }: SecretariaDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const dashboardUrl = "https://graficos.proesc.com/public/dashboard/ffae0cf9-0c53-40ba-b72c-013846fe8b7f?entidade_id=4442&exerc%25C3%25ADcio=2025&grupos=&tab=141-geral&unidade=";

  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('Dashboard de Secretaria carregada com sucesso');
  };

  const handleIframeError = () => {
    setError('Erro ao carregar o dashboard de Secretaria. Verifique a conexão.');
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
        <h2 className="text-3xl font-bold text-gray-900">Dashboard de Secretaria</h2>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Relatórios de Secretaria - Red House Internacional School</span>
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
              <iframe
                src={dashboardUrl}
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
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Dashboard de Secretaria:</strong> Visualização integrada dos relatórios administrativos e documentos da Red House Internacional School.</p>
      </div>
    </div>
  );
};

export default SecretariaDashboard;
