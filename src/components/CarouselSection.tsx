
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from "@/components/ui/carousel";

const CarouselSection = () => {
  const [api, setApi] = useState<CarouselApi>();

  // Auto-carousel functionality
  useEffect(() => {
    if (!api) {
      return;
    }

    const intervalId = setInterval(() => {
      api.scrollNext();
    }, 5000); // 5 seconds

    return () => clearInterval(intervalId);
  }, [api]);

  // Updated carousel images with the new Proesc images
  const carouselImages = [
    {
      id: 1,
      title: "A Proesc está entre os indicados ao Top Educação 2025!",
      description: "Vote agora e ajude a Proesc a conquistar este reconhecimento",
      image: "/lovable-uploads/e591c8ad-1800-4b34-afed-43510f6a8268.png"
    },
    {
      id: 2,
      title: "Confira as demais programações em treinamentos",
      description: "Acesse www.educacional.proesc.com/treinamentos para mais informações",
      image: "/lovable-uploads/6674693d-4414-484d-bcda-91c0b0d108ac.png"
    },
    {
      id: 3,
      title: "Boleto Escolar via PIX e QR Code",
      description: "Mais facilidade para os pais - Compensação rápida, praticidade e segurança",
      image: "/lovable-uploads/c38a6881-8d92-4f8a-a13d-b5e6099798f8.png"
    }
  ];

  return (
    <div className="mb-8">
      <Card className="overflow-hidden border-red-100">
        <CardContent className="p-0">
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {carouselImages.map((item) => (
                <CarouselItem key={item.id}>
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-[300px] md:h-[400px] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-white/90">{item.description}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarouselSection;
