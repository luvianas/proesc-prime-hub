import React, { useEffect, useRef } from 'react';

interface GoogleMapContainerProps {
  marketData: any;
  schoolData: any;
  onMapLoad: () => void;
  onMapError: (error: string) => void;
  enableProgressiveLoading?: boolean;
}

const GoogleMapContainer: React.FC<GoogleMapContainerProps> = ({
  marketData,
  schoolData,
  onMapLoad,
  onMapError,
  enableProgressiveLoading = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!enableProgressiveLoading && (!marketData || !schoolData)) return;

    let mounted = true;

    const initMap = async () => {
      try {
        console.log('🗺️ Inicializando Google Maps no componente isolado...');

        // Use the installed @googlemaps/js-api-loader
        const { Loader } = await import('@googlemaps/js-api-loader');
        
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim().replace(/^["']|["']$/g, '');
        
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places', 'marker']
        });

        const google = await loader.load();

        // Check if component is still mounted
        if (!mounted || !containerRef.current) return;

        // Create map directly in the container
        const centerCoords = marketData?.center_coordinates || 
          (schoolData?.latitude && schoolData?.longitude ? 
            { lat: schoolData.latitude, lng: schoolData.longitude } : 
            { lat: -14.235, lng: -51.9253 }); // Default to Brazil center
        
        const map = new google.maps.Map(containerRef.current, {
          zoom: marketData ? 13 : 6,
          center: centerCoords,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi.school',
              elementType: 'all',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        mapRef.current = map;

        // Add main school marker if we have location data
        if (centerCoords && (marketData || schoolData)) {
          const mainMarker = new google.maps.Marker({
            position: centerCoords,
            map: map,
            title: schoolData?.school_name || schoolData?.nome || 'Sua Escola',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            }
          });

        markersRef.current.push(mainMarker);

          const mainInfoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-semibold text-primary">${schoolData?.school_name || schoolData?.nome || 'Sua Escola'}</h3>
                <p class="text-sm text-muted-foreground">Escola Principal</p>
                ${!marketData ? '<p class="text-xs text-muted-foreground mt-1">Analisando concorrentes...</p>' : ''}
              </div>
            `
          });

          mainMarker.addListener('click', () => {
            mainInfoWindow.open(map, mainMarker);
          });
        }

        // Add competitor markers only if market data is available
        if (marketData?.competitors) {
          marketData.competitors.forEach((competitor: any) => {
          if (!competitor.geometry?.location) return;

          const marker = new google.maps.Marker({
            position: {
              lat: competitor.geometry.location.lat,
              lng: competitor.geometry.location.lng
            },
            map: map,
            title: competitor.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#EF4444',
              fillOpacity: 0.9,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }
          });

          markersRef.current.push(marker);

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2 max-w-xs">
                <h3 class="font-semibold text-primary">${competitor.name}</h3>
                <p class="text-sm text-muted-foreground">${competitor.vicinity}</p>
                ${competitor.rating ? `
                  <div class="flex items-center gap-1 mt-1">
                    <span class="text-yellow-500">★</span>
                    <span class="text-sm">${competitor.rating}</span>
                    ${competitor.user_ratings_total ? `
                      <span class="text-xs text-muted-foreground">(${competitor.user_ratings_total})</span>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `
          });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
          });
        }

        onMapLoad();
        console.log('🎯 Mapa isolado carregado com sucesso');

      } catch (error) {
        console.error('❌ Erro no componente isolado do mapa:', error);
        
        let errorMessage = 'Erro ao carregar o mapa';
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            errorMessage = 'Chave da API do Google Maps inválida';
          } else if (error.message.includes('quota')) {
            errorMessage = 'Limite da API atingido';
          }
        }
        
        onMapError(errorMessage);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      mounted = false;
      
      // Clean up markers
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          if (marker && typeof marker.setMap === 'function') {
            try {
              marker.setMap(null);
            } catch (e) {
              console.warn('Error cleaning marker:', e);
            }
          }
        });
        markersRef.current = [];
      }
      
      // Clean up map
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [marketData, schoolData, onMapLoad, onMapError, enableProgressiveLoading]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
};

export default GoogleMapContainer;