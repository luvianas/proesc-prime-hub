import { useEffect, useRef, useState } from "react";
import { BarChart3, Headphones, Calendar, MapPin } from "lucide-react";

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

const features = [
  {
    icon: BarChart3,
    title: "Dashboards de BI",
    description: "Acompanhe indicadores financeiros, pedagógicos e administrativos em tempo real com dashboards integrados ao Metabase.",
    color: "from-blue-500 to-cyan-500",
    delay: 0
  },
  {
    icon: Headphones,
    title: "Suporte via Tickets",
    description: "Sistema de tickets integrado ao Zendesk para suporte prioritário. Acompanhe suas solicitações em tempo real.",
    color: "from-purple-500 to-pink-500",
    delay: 100
  },
  {
    icon: Calendar,
    title: "Agenda do Consultor",
    description: "Agende reuniões diretamente com seu consultor especializado. Atendimento personalizado para sua escola.",
    color: "from-orange-500 to-red-500",
    delay: 200
  },
  {
    icon: MapPin,
    title: "Estudo de Mercado",
    description: "Análise completa do mercado educacional na sua região com mapa interativo e dados de precificação.",
    color: "from-green-500 to-emerald-500",
    delay: 300
  }
];

const FeaturesSection = ({ sectionRef }: FeaturesSectionProps) => {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = cardsRef.current.indexOf(entry.target as HTMLDivElement);
          if (entry.isIntersecting && index !== -1) {
            setVisibleCards((prev) => [...new Set([...prev, index])]);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-gradient-to-b from-background to-muted/30"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Funcionalidades
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Tudo que você precisa em{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              um só lugar
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ferramentas poderosas projetadas para simplificar a gestão da sua escola 
            e potencializar seus resultados.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => (cardsRef.current[index] = el)}
              className={`group relative p-8 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 transition-all duration-700 ${
                visibleCards.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${feature.delay}ms` }}
            >
              {/* Glow Effect on Hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Decorative Corner */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${feature.color} opacity-5 rounded-bl-[100px] rounded-tr-2xl`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
