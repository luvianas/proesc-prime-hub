import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, TrendingUp, Users, Star, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import GoogleMapContainer from './GoogleMapContainer';

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
    gm_authFailure?: () => void;
  }
}

interface MarketAnalysisProps {
  onBack: () => void;
  schoolId: string;
}

interface CompetitorData {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  price_level?: number;
  pricing_data?: {
    monthly_fee?: number;
    annual_fee?: number;
    price_range?: 'budget' | 'moderate' | 'expensive' | 'luxury';
    confidence_score?: number;
    data_source?: string;
  };
}

interface MarketData {
  competitors: CompetitorData[];
  analysis: {
    total_competitors: number;
    average_rating: number;
    high_rated_count: number;
    price_distribution: {
      budget: number;
      moderate: number;
      expensive: number;
      luxury: number;
    };
    pricing_insights: {
      schools_with_pricing: number;
      average_monthly_fee?: number;
      price_range_distribution: {
        budget: number;
        moderate: number;
        expensive: number;
        luxury: number;
      };
    };
    insights: string;
  };
  center_coordinates: {
    lat: number;
    lng: number;
  };
}

const MarketAnalysisDashboard: React.FC<MarketAnalysisProps> = ({ onBack, schoolId }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [competitorsPerPage] = useState(10);
  const [analysisProgress, setAnalysisProgress] = useState<string>('Carregando dados da escola...');
  const [competitorCount, setCompetitorCount] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (schoolData && schoolData.address) {
      // Start map loading immediately even without market data
      setMapLoading(false); // Allow map to render with school location
    }
  }, [schoolData]);

  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  useEffect(() => {
    if (marketData && !mapError) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!validateApiKey(apiKey)) {
        setMapError('Chave da API do Google Maps inválida ou não configurada');
        setMapLoading(false);
        console.error('❌ Google Maps API key inválida:', apiKey);
      }
    }
  }, [marketData]);

  const validateApiKey = (apiKey: string | undefined): boolean => {
    if (!apiKey) return false;
    
    // Remove quotes and whitespace
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    
    // Basic format validation for Google Maps API key
    const googleMapsKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
    return googleMapsKeyPattern.test(cleanKey);
  };

  const handleMapLoad = () => {
    setMapLoading(false);
  };

  const handleMapError = (errorMessage: string) => {
    setMapError(errorMessage);
    setMapLoading(false);
    toast({
      title: "Erro no Mapa",
      description: errorMessage,
      variant: "destructive"
    });
  };

  const fetchSchoolData = async () => {
    try {
      const { data: school, error } = await supabase
        .from('school_customizations')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      
      setSchoolData(school);
      
      if (!school.address) {
        setError('Endereço da escola não configurado. Configure o endereço nas configurações da escola.');
        setLoading(false);
        return;
      }

      // Check for cached data (within 24 hours)
      if (school.market_analysis && Object.keys(school.market_analysis as object).length > 0) {
        const cachedData = school.market_analysis as unknown as MarketData;
        setMarketData(cachedData);
        setCompetitorCount(cachedData.competitors?.length || 0);
        setAnalysisComplete(true);
        setLoading(false);
        
        toast({
          title: 'Dados em Cache',
          description: 'Usando análise armazenada. Recarregue para atualizar.',
        });
        return;
      }

      // Fetch new market analysis
      await fetchMarketAnalysis(school.address);
    } catch (err: any) {
      console.error('Error fetching school data:', err);
      setError(err.message || 'Erro ao carregar dados da escola');
      setLoading(false);
    }
  };

  const fetchMarketAnalysis = async (address: string) => {
    const timeoutId = setTimeout(() => {
      setError('Tempo limite excedido. A análise está demorando mais que o esperado.');
      setLoading(false);
    }, 30000); // 30 second timeout

    try {
      console.log('🚀 Iniciando busca de análise de mercado para:', address);
      setAnalysisProgress('Localizando endereço da escola...');
      
      // Update progress as we go
      setTimeout(() => setAnalysisProgress('Buscando escolas concorrentes na região...'), 2000);
      setTimeout(() => setAnalysisProgress('Analisando dados encontrados...'), 15000);
      
      const { data, error } = await supabase.functions.invoke('Google-Maps-10km', {
        body: { address, radius: 10000 } // 10km radius
      });

      clearTimeout(timeoutId);
      console.log('📡 Resposta da função:', { data, error });

      if (error) {
        console.error('❌ Erro na função Edge:', error);
        throw new Error(error.message || 'Erro na função de análise de mercado');
      }

      if (!data) {
        throw new Error('Nenhum dado retornado pela análise');
      }

      console.log('✅ Análise concluída com sucesso:', {
        competitors_found: data.competitors?.length || 0,
        analysis: data.analysis
      });

      setMarketData(data);
      setCompetitorCount(data.competitors?.length || 0);
      setAnalysisComplete(true);
      
      // Cache result for future requests
      await supabase
        .from('school_customizations')
        .update({ market_analysis: data })
        .eq('id', schoolId);

      setLoading(false);
      
      toast({
        title: 'Análise Concluída',
        description: `Encontradas ${data.competitors?.length || 0} escolas na região`,
      });
      
      } catch (err: any) {
        console.error('❌ Erro na análise de mercado:', err);
        clearTimeout(timeoutId);
        
        let errorMessage = 'Erro ao buscar análise de mercado';
        let errorDetails = '';
        
        if (err.message?.includes('timeout')) {
          errorMessage = 'Tempo limite excedido';
          errorDetails = 'A análise demorou mais que 30 segundos';
        } else if (err.message?.includes('API key')) {
        errorMessage = 'Problema com configuração da API';
        errorDetails = 'A chave da API do Google Maps precisa ser configurada';
      } else if (err.message?.includes('geocode')) {
        errorMessage = 'Endereço não encontrado';
        errorDetails = 'Verifique se o endereço da escola está correto';
      } else if (err.message?.includes('Places API')) {
        errorMessage = 'Erro na busca de escolas';
        errorDetails = 'Problema temporário com o serviço de mapas';
      }
      
      setError(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`);
      setLoading(false);
      
      toast({
        title: 'Erro na Análise',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };


  const getPriceLevelText = (level?: number) => {
    switch (level) {
      case 0: return 'Gratuito';
      case 1: return 'Baixo custo';
      case 2: return 'Moderado';
      case 3: return 'Alto custo';
      case 4: return 'Premium';
      default: return 'Não informado';
    }
  };

  const getPriceLevelColor = (level?: number) => {
    switch (level) {
      case 0: return 'bg-green-100 text-green-800';
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Estudo de Mercado</h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="font-medium">{analysisProgress}</p>
              {competitorCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {competitorCount} escolas encontradas até agora...
                </p>
              )}
              <div className="bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500 ease-out"
                  style={{ width: analysisComplete ? '100%' : '70%' }}
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setError('Análise cancelada pelo usuário');
                setLoading(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !marketData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Estudo de Mercado</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-red-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
              </div>
              <h2 className="text-xl font-semibold">Erro ao carregar análise</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              
              <div className="space-y-2">
                <Button onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchSchoolData();
                }} className="mr-2">
                  Tentar novamente
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Recarregar página
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground mt-4">
                <p>Se o problema persistir:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Verifique se o endereço da escola está configurado</li>
                  <li>Confirme a configuração da API do Google Maps</li>
                  <li>Entre em contato com o suporte técnico</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination logic
  const indexOfLastCompetitor = currentPage * competitorsPerPage;
  const indexOfFirstCompetitor = indexOfLastCompetitor - competitorsPerPage;
  const currentCompetitors = marketData?.competitors.slice(indexOfFirstCompetitor, indexOfLastCompetitor) || [];
  const totalPages = Math.ceil((marketData?.competitors.length || 0) / competitorsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Estudo de Mercado</h1>
          <p className="text-muted-foreground">Análise competitiva da região (raio de 10km) - {marketData?.competitors.length || 0} escolas encontradas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{marketData.analysis.total_competitors}</p>
                <p className="text-sm text-muted-foreground">Concorrentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{marketData.analysis.average_rating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {marketData.competitors.filter(c => c.price_level !== undefined).length}
                </p>
                <p className="text-sm text-muted-foreground">Com Info. Preço</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {marketData.competitors.filter(c => c.rating && c.rating >= 4.5).length}
                </p>
                <p className="text-sm text-muted-foreground">Alta Avaliação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mapa de Concorrentes
            </CardTitle>
            <CardDescription>Localização das escolas na região</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[400px] rounded-lg bg-muted/50 overflow-hidden relative">
              {mapError ? (
                <div className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground z-10 bg-background/80">
                  <div>
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="text-sm">{mapError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setMapError(null);
                        setMapLoading(true);
                      }}
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              ) : mapLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground z-10 bg-background/80">
                  <div>
                    <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>Carregando mapa...</p>
                  </div>
                </div>
              ) : (
                <GoogleMapContainer
                  marketData={marketData}
                  schoolData={schoolData}
                  onMapLoad={handleMapLoad}
                  onMapError={handleMapError}
                  enableProgressiveLoading={true}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Insights de Mercado
            </CardTitle>
            <CardDescription>Análise da concorrência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
            <p className="text-blue-800 dark:text-blue-200">{marketData.analysis.insights}</p>
          </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">Resumo de Avaliações:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>⭐ 5.0: {marketData.competitors.filter(c => c.rating === 5.0).length}</div>
                  <div>⭐ 4.5+: {marketData.competitors.filter(c => c.rating && c.rating >= 4.5 && c.rating < 5.0).length}</div>
                  <div>⭐ 4.0+: {marketData.competitors.filter(c => c.rating && c.rating >= 4.0 && c.rating < 4.5).length}</div>
                  <div>⭐ &lt;4.0: {marketData.competitors.filter(c => c.rating && c.rating < 4.0).length}</div>
                </div>
              </div>
              
              {marketData.competitors.filter(c => c.price_level !== undefined).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Informações de Preço:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Baixo custo: {marketData.analysis.price_distribution.budget}</div>
                    <div>Moderado: {marketData.analysis.price_distribution.moderate}</div>
                    <div>Alto custo: {marketData.analysis.price_distribution.expensive}</div>
                    <div>Premium: {marketData.analysis.price_distribution.luxury}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {marketData.competitors.filter(c => c.price_level === undefined).length} escolas sem informação de preço
                  </p>
                </div>
              )}</div>
          </CardContent>
        </Card>
      </div>

      {/* Competitors List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Concorrentes</CardTitle>
          <CardDescription>
            Escolas encontradas na região - Página {currentPage} de {totalPages} ({marketData.competitors.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentCompetitors.map((competitor, index) => (
              <div key={competitor.place_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold">{competitor.name}</h4>
                  <p className="text-sm text-muted-foreground">{competitor.vicinity}</p>
                  {competitor.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{competitor.rating} ({competitor.user_ratings_total || 0} avaliações)</span>
                    </div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  {competitor.price_level !== undefined ? (
                    <Badge className={getPriceLevelColor(competitor.price_level)}>
                      {getPriceLevelText(competitor.price_level)}
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">
                      Sem informação de preço
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="px-3 py-1 text-sm">
                {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketAnalysisDashboard;