
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
  const [showImplementation, setShowImplementation] = useState(false);

  useEffect(() => {
    // Simulando a lógica que deveria estar no backend
    const generateMetabaseUrl = () => {
      try {
        const METABASE_SITE_URL = "https://graficos.proesc.com";
        
        // Esta lógica deveria estar no backend:
        // const jwt = require("jsonwebtoken");
        // const METABASE_SECRET_KEY = "056a18dea0785f13e40ce093997c4e915e2aee2bb694f9487c09be5dd3bc15ee";
        // const payload = {
        //   resource: { dashboard: 52 },
        //   params: {
        //     "entidade_id": []
        //   },
        //   exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 minute expiration
        // };
        // const token = jwt.sign(payload, METABASE_SECRET_KEY);
        // const iframeUrl = METABASE_SITE_URL + "/embed/dashboard/" + token + "#bordered=true&titled=true";
        
        // Por enquanto, vamos mostrar uma mensagem explicativa
        setError('Integração precisa ser implementada no backend');
        setIsLoading(false);
      } catch (err) {
        console.error('Error generating Metabase URL:', err);
        setError('Erro ao gerar URL do Metabase');
        setIsLoading(false);
      }
    };

    generateMetabaseUrl();
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
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-2">Carregando dashboard...</span>
            </div>
          )}
          
          {error && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-800">
                    Integração com Metabase - Implementação Necessária
                  </h3>
                </div>
                <p className="text-amber-700 mb-4">
                  Para integrar com o Metabase seguindo as orientações da documentação, 
                  é necessário implementar a geração de tokens JWT no backend por questões de segurança.
                </p>
                <Button 
                  onClick={() => setShowImplementation(!showImplementation)}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  {showImplementation ? 'Ocultar' : 'Ver'} Código de Implementação
                </Button>
              </div>

              {showImplementation && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Código para Backend (Node.js):</h4>
                  <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`// Instalar: npm install jsonwebtoken
const jwt = require("jsonwebtoken");

const METABASE_SITE_URL = "https://graficos.proesc.com";
const METABASE_SECRET_KEY = "056a18dea0785f..."; // Chave secreta

const payload = {
  resource: { dashboard: 52 },
  params: {
    "entidade_id": []
  },
  exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 min
};

const token = jwt.sign(payload, METABASE_SECRET_KEY);
const iframeUrl = METABASE_SITE_URL + "/embed/dashboard/" + token + 
  "#bordered=true&titled=true";`}
                  </pre>
                  
                  <h4 className="font-semibold text-gray-800 mb-4 mt-6">HTML para Frontend:</h4>
                  <pre className="bg-gray-800 text-blue-400 p-4 rounded-lg overflow-x-auto text-sm">
{`<iframe
  src={iframeUrl}
  frameborder="0"
  width="800"
  height="600"
  allowtransparency
/>`}
                  </pre>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-800 mb-3">Próximos Passos:</h4>
                <ul className="list-disc list-inside space-y-2 text-blue-700">
                  <li>Criar endpoint no backend para gerar tokens JWT</li>
                  <li>Implementar a lógica de geração de token com a chave secreta</li>
                  <li>Chamar o endpoint do frontend para obter a URL do iframe</li>
                  <li>Renderizar o iframe com a URL gerada pelo backend</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Nota:</strong> A dashboard será exibida aqui assim que a integração backend estiver implementada seguindo as orientações do Metabase.</p>
      </div>
    </div>
  );
};

export default FinancialDashboard;
