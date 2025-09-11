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
  const [currentPage, setCurrentPage] = useState(1);
  const [competitorsPerPage] = useState(10);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  useEffect(() => {
    if (marketData && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [marketData]);

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

      // Check if we have cached market analysis
      if (school.market_analysis && Object.keys(school.market_analysis as object).length > 0) {
        const cachedData = school.market_analysis as unknown as MarketData;
        setMarketData(cachedData);
        setLoading(false);
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
    try {
      const { data, error } = await supabase.functions.invoke('Google-Maps-10km', {
        body: { address, radius: 10000 } // 10km radius
      });

      if (error) throw error;

      setMarketData(data);
      
      // Cache the analysis in the database
      await supabase
        .from('school_customizations')
        .update({ market_analysis: data })
        .eq('id', schoolId);

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching market analysis:', err);
      setError(err.message || 'Erro ao buscar análise de mercado');
      setLoading(false);
    }
  };

  const initializeMap = async () => {
    if (!marketData || !mapRef.current) return;

    try {
      // Load Google Maps dynamically
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBOti4mM-6x9WTnTWjNTkZJnzL8wd-wCXw&libraries=places`;
        script.async = true;
        script.defer = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = (error) => {
            console.error('Error loading Google Maps:', error);
            reject(error);
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

    } catch (err) {
      console.error('Error initializing map:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar o mapa',
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
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
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
                <p className="text-2xl font-bold">{marketData.analysis.price_distribution.moderate}</p>
                <p className="text-sm text-muted-foreground">Preço Moderado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{marketData.analysis.price_distribution.expensive + marketData.analysis.price_distribution.luxury}</p>
                <p className="text-sm text-muted-foreground">Premium</p>
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
            <div ref={mapRef} className="w-full h-[400px] rounded-lg" />
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
            
            <div className="space-y-2">
              <h4 className="font-semibold">Distribuição de Preços:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Baixo custo: {marketData.analysis.price_distribution.budget}</div>
                <div>Moderado: {marketData.analysis.price_distribution.moderate}</div>
                <div>Alto custo: {marketData.analysis.price_distribution.expensive}</div>
                <div>Premium: {marketData.analysis.price_distribution.luxury}</div>
              </div>
            </div>
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