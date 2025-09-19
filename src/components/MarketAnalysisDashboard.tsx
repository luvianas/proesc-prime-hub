import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, TrendingUp, Users, Star, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

interface MarketData {
  competitors: CompetitorData[];
  analysis: {
    total_competitors: number;
    average_rating: number;
    price_distribution: {
      budget: number;
      moderate: number;
      expensive: number;
      luxury: number;
    };
    insights: string[];
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
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  useEffect(() => {
    if (marketData && mapRef.current && !mapInstanceRef.current) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!validateApiKey(apiKey)) {
        setMapError('Chave da API do Google Maps inválida ou não configurada');
        setMapLoading(false);
        console.error('❌ Google Maps API key inválida:', apiKey);
        return;
      }
      
      initializeMap();
    }
  }, [marketData]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      cleanupMap();
    };
  }, []);

  const cleanupMap = () => {
    try {
      // Clear all markers first
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          if (marker && typeof marker.setMap === 'function') {
            marker.setMap(null);
          }
        });
        markersRef.current = [];
      }

      // Clear map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }

      // Let React handle DOM cleanup - don't manually manipulate DOM nodes
      // The map container will be cleaned up by React's normal lifecycle
      
    } catch (error) {
      console.warn('⚠️ Error during map cleanup:', error);
    }
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

      // Temporarily disabled cache to validate functionality
      // if (school.market_analysis && Object.keys(school.market_analysis as object).length > 0) {
      //   const cachedData = school.market_analysis as unknown as MarketData;
      //   setMarketData(cachedData);
      //   setLoading(false);
      //   return;
      // }

      // Fetch new market analysis
      await fetchMarketAnalysis(school.address);
    } catch (err: any) {
      console.error('Error fetching school data:', err);
      setError(err.message || 'Erro ao carregar dados da escola');
      setLoading(false);
    }
  };

  const fetchMarketAnalysis = async (address: string) => {
    try {
      console.log('🚀 Iniciando busca de análise de mercado para:', address);
      
      const { data, error } = await supabase.functions.invoke('Google-Maps-10km', {
        body: { address, radius: 10000 } // 10km radius
      });

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
      
      // Temporarily disabled cache to validate functionality
      // await supabase
      //   .from('school_customizations')
      //   .update({ market_analysis: data })
      //   .eq('id', schoolId);

      setLoading(false);
      
      toast({
        title: 'Análise Concluída',
        description: `Encontradas ${data.competitors?.length || 0} escolas na região`,
      });
      
    } catch (err: any) {
      console.error('❌ Erro na análise de mercado:', err);
      
      let errorMessage = 'Erro ao buscar análise de mercado';
      let errorDetails = '';
      
      if (err.message?.includes('API key')) {
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

  const validateApiKey = (apiKey: string | undefined): boolean => {
    if (!apiKey) return false;
    
    // Remove quotes and whitespace
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    
    // Basic format validation for Google Maps API key
    const googleMapsKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
    return googleMapsKeyPattern.test(cleanKey);
  };

  const initializeMap = async () => {
    if (!marketData || !mapRef.current) return;

    setMapLoading(true);
    setMapError(null);

    try {
      console.log('🗺️ Inicializando Google Maps...');
      console.log('🔑 API Key disponível:', !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
      
      // Load Google Maps dynamically
      if (!window.google) {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim().replace(/^["']|["']$/g, '');
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&loading=async`;
        script.async = true;
        script.defer = true;
        
        // Define função callback global para o Google Maps
        window.initMap = () => {
          console.log('✅ Google Maps API carregada via callback');
        };
        
        console.log('📥 Carregando Google Maps API...');
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('✅ Google Maps API carregada com sucesso');
            resolve(true);
          };
          script.onerror = (error) => {
            console.error('❌ Erro ao carregar Google Maps:', error);
            reject(new Error('Falha ao carregar a API do Google Maps'));
          };
          
          // Adiciona tratamento para erro de API key inválida
          window.gm_authFailure = () => {
            console.error('❌ Erro de autenticação do Google Maps - API key inválida');
            reject(new Error('Chave da API do Google Maps inválida ou sem permissão'));
          };
          
          document.head.appendChild(script);
        });
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center: marketData.center_coordinates,
        zoom: 13,
        styles: [
          {
            featureType: "poi.school",
            stylers: [{ visibility: "on" }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Add marker for main school
      const schoolMarker = new window.google.maps.Marker({
        map,
        position: marketData.center_coordinates,
        title: schoolData?.school_name || 'Sua Escola',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%23ff0000"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          scaledSize: new window.google.maps.Size(40, 40)
        }
      });

      // Add markers for competitors
      marketData.competitors.forEach((competitor, index) => {
        const marker = new window.google.maps.Marker({
          map,
          position: competitor.geometry.location,
          title: competitor.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="%233b82f6"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
            scaledSize: new window.google.maps.Size(30, 30)
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${competitor.name}</h3>
              <p class="text-sm text-gray-600">${competitor.vicinity}</p>
              ${competitor.rating ? `<p class="text-sm">⭐ ${competitor.rating} (${competitor.user_ratings_total || 0} avaliações)</p>` : ''}
              ${competitor.price_level !== undefined ? `<p class="text-sm">💰 Nível de preço: ${competitor.price_level}/4</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

      setMapLoading(false);
      console.log('🎯 Mapa inicializado com sucesso com', marketData.competitors.length, 'concorrentes');

    } catch (err: any) {
      console.error('❌ Falha ao carregar Google Maps:', err);
      setMapLoading(false);
      
      let errorMessage = 'Erro ao carregar o mapa';
      
      if (err.message?.includes('API key') || err.message?.includes('inválida') || err.message?.includes('permissão')) {
        errorMessage = 'Chave da API do Google Maps inválida ou serviço não ativado';
      } else if (err.message?.includes('quota') || err.message?.includes('billing')) {
        errorMessage = 'Limite de uso da API atingido ou problemas de faturamento';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Problema de conexão. Tente novamente';
      }
      
      setMapError(errorMessage);
      
      toast({
        title: "Erro no Mapa",
        description: errorMessage,
        variant: "destructive"
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
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p>Analisando mercado na sua região...</p>
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
            <div 
              ref={mapRef}
              key={`map-${marketData?.competitors.length || 0}`}
              className="w-full h-[400px] rounded-lg bg-muted/50"
            >
              {mapError ? (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
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
                        initializeMap();
                      }}
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              ) : mapLoading ? (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                  <div>
                    <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>Carregando mapa...</p>
                  </div>
                </div>
              ) : null}
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
            {marketData.analysis.insights.map((insight, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
            
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