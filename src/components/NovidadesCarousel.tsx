import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface SchoolBanner {
  id: string;
  image_url: string;
  title?: string | null;
  link_url?: string | null;
}

interface NovidadesCarouselProps {
  schoolId: string;
}

const NovidadesCarousel = ({ schoolId }: NovidadesCarouselProps) => {
  const [banners, setBanners] = useState<SchoolBanner[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    const fetchBanners = async () => {
      const { data, error } = await supabase
        .from('school_banners')
        .select('id, image_url, title, link_url')
        .eq('school_id', schoolId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao carregar banners:', error);
        return;
      }
      setBanners(data || []);
    };
    fetchBanners();
  }, [schoolId]);

  if (!banners?.length) return null;

  return (
    <section aria-label="Novidades" className="space-y-4">
      <h2 className="text-xl font-semibold">Novidades</h2>
      <div className="relative">
        <Carousel opts={{ loop: true, align: 'start' }} className="w-full">
          <CarouselContent>
            {banners.map((banner) => {
              const img = (
                <AspectRatio ratio={2480/520} className="overflow-hidden rounded-md border bg-muted">
                  <img
                    src={banner.image_url}
                    alt={banner.title ? `Novidade: ${banner.title}` : 'Banner de novidades do Proesc'}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </AspectRatio>
              );
              return (
                <CarouselItem key={banner.id}>
                  {banner.link_url ? (
                    <a href={banner.link_url} target="_blank" rel="noopener noreferrer" aria-label={banner.title || 'Abrir novidade em nova aba'}>
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="bg-background/80 backdrop-blur border" />
          <CarouselNext className="bg-background/80 backdrop-blur border" />
        </Carousel>
      </div>
    </section>
  );
};

export default NovidadesCarousel;
