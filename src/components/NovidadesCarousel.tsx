import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';
const sb: any = supabase;

interface SchoolBanner {
  id: string;
  image_url: string;
  title?: string | null;
  link_url?: string | null;
  order_index?: number | null;
  created_at?: string;
}

interface NovidadesCarouselProps {
  schoolId: string;
}

const NovidadesCarousel = ({ schoolId }: NovidadesCarouselProps) => {
  const [banners, setBanners] = useState<SchoolBanner[]>([]);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!schoolId) return;
    const fetchBanners = async () => {
      console.log('🔍 NovidadesCarousel: Iniciando busca de banners para schoolId:', schoolId);
      
      const globalRes = await sb
        .from('school_banners')
        .select('id, image_url, title, link_url, order_index, created_at')
        .eq('is_global', true);
      
      console.log('🌍 Banners globais encontrados:', globalRes.data, 'Erro:', globalRes.error);
      
      const schoolRes = await sb
        .from('school_banners')
        .select('id, image_url, title, link_url, order_index, created_at')
        .eq('school_id', schoolId);

      console.log('🏫 Banners da escola encontrados:', schoolRes.data, 'Erro:', schoolRes.error);

      if (globalRes.error) console.error('Erro ao carregar banners globais:', globalRes.error);
      if (schoolRes.error) console.error('Erro ao carregar banners da escola:', schoolRes.error);

      const list: SchoolBanner[] = [
        ...(((globalRes.data as unknown) as SchoolBanner[]) || []),
        ...(((schoolRes.data as unknown) as SchoolBanner[]) || []),
      ];
      
      console.log('📋 Lista final de banners:', list);
      
      list.sort((a: SchoolBanner, b: SchoolBanner) => {
        const orderDiff = (a.order_index ?? 0) - (b.order_index ?? 0);
        if (orderDiff !== 0) return orderDiff;
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      });
      
      console.log('🎯 Banners após ordenação:', list);
      setBanners(list);
    };
    fetchBanners();
  }, [schoolId]);

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  if (!banners?.length) return null;

  return (
    <section aria-label="Novidades" className="space-y-6 animate-slide-up">
      <h2 className="text-2xl font-bold text-foreground">Novidades</h2>
      <div className="relative">
        <Carousel 
          opts={{ loop: true, align: 'start' }} 
          className="w-full"
          setApi={setApi}
        >
          <CarouselContent>
            {banners.map((banner) => {
              const img = (
                <AspectRatio ratio={2480/520} className="overflow-hidden rounded-xl border bg-muted shadow-large hover-glow group">
                  <div className="relative w-full h-full">
                    <img
                      src={banner.image_url}
                      alt={banner.title ? `Novidade: ${banner.title}` : 'Banner de novidades do Proesc'}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {banner.title && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white text-lg font-semibold drop-shadow-lg">
                          {banner.title}
                        </h3>
                      </div>
                    )}
                  </div>
                </AspectRatio>
              );
              return (
                <CarouselItem key={banner.id}>
                  {banner.link_url ? (
                    <a href={banner.link_url} target="_blank" rel="noopener noreferrer" 
                       aria-label={banner.title || 'Abrir novidade em nova aba'}
                       className="block transition-transform duration-300 hover:scale-[1.02]">
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="btn-elegant bg-background/90 backdrop-blur border shadow-medium hover-glow" />
          <CarouselNext className="btn-elegant bg-background/90 backdrop-blur border shadow-medium hover-glow" />
        </Carousel>
      </div>
    </section>
  );
};

export default NovidadesCarousel;
