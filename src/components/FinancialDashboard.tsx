import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import AIInsightsButton from "@/components/AIInsightsButton";

interface FinancialDashboardProps {
  onBack: () => void;
  dashboardUrl?: string;
}

const FinancialDashboard = ({ onBack, dashboardUrl }: FinancialDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const defaultUrl = "https://graficos.proesc.com/public/dashboard/9a7e2013-25b0-4e91-8767-5ee3305a3a23?curso=&entidade_id=4442&etapa=&filtro_de_data=thisyear&tab=64-vis%C3%A3o-geral&tipo__de_d%25C3%25A9bito=&unidade=";
  const extractSrc = (input?: string) => {
    if (!input) return undefined;
    const match = input.match(/src=["']([^"']+)["']/i);
    if (match) return match[1];
    return input.trim();
  };
  const finalUrl = extractSrc(dashboardUrl) || defaultUrl;

  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('Dashboard Financeira carregada com sucesso');
  };

  const handleIframeError = () => {
    setError('Erro ao carregar o dashboard Financeira. Verifique a conexão.');
    setIsLoading(false);
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
          <h2 className="text-3xl font-bold text-brand">Dashboard Financeira</h2>
        </div>
        {/* IA Insights Button */}
        <AIInsightsButton 
          label="Explicar com IA" 
          dashboardUrl={finalUrl}
          dashboardType="financeiro"
          question="Analise os dados financeiros desta dashboard e forneça insights sobre receitas, despesas, inadimplência e recomendações para gestão financeira escolar"
        />
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Relatórios Financeiros</span>
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
                    <span>Carregando dashboard financeira...</span>
                  </div>
                </div>
              )}
              <iframe
                src={finalUrl}
                title="Dashboard Financeira"
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
        <p><strong>Dashboard Financeira:</strong> Visualização integrada dos relatórios financeiros e receitas.</p>
      </div>
    </div>
  );
};

export default FinancialDashboard;
