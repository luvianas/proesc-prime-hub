
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface FinancialDashboardProps {
  onBack: () => void;
}

const FinancialDashboard = ({ onBack }: FinancialDashboardProps) => {
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      // Para desenvolvimento, vamos usar o URL direto do Metabase
      // Em produção, você deve implementar a geração do token no backend
      const METABASE_SITE_URL = "https://graficos.proesc.com";
      
      // URL temporário para teste - em produção isso deve vir do backend
      const url = `${METABASE_SITE_URL}/public/dashboard/your-public-dashboard-url`;
      
      setIframeUrl(url);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading Metabase dashboard:', err);
      setError('Erro ao carregar dashboard financeira');
      setIsLoading(false);
    }
  }, []);

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
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-2">Carregando dashboard...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
          
          {!isLoading && !error && (
            <div className="p-6 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">
                  Dashboard Financeira em Desenvolvimento
                </h3>
                <p className="text-blue-700 mb-4">
                  A integração com o Metabase está sendo configurada. Para funcionar corretamente, 
                  é necessário implementar a geração de tokens JWT no backend.
                </p>
                <div className="text-sm text-blue-600 bg-white p-4 rounded border">
                  <p><strong>Próximos passos:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Configurar endpoint no backend para gerar tokens JWT</li>
                    <li>Implementar autenticação segura</li>
                    <li>Conectar com dashboard ID 52 do Metabase</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Nota:</strong> Esta dashboard será atualizada em tempo real quando a integração completa estiver implementada.</p>
      </div>
    </div>
  );
};

export default FinancialDashboard;
