import { useEffect, useRef, useState } from "react";
import { 
  Shield, 
  Zap, 
  Users, 
  TrendingUp, 
  Award, 
  Clock 
} from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Suporte Prioritário",
    description: "Atendimento exclusivo com tempo de resposta reduzido"
  },
  {
    icon: Zap,
    title: "Atualizações Antecipadas",
    description: "Acesso em primeira mão às novas funcionalidades"
  },
  {
    icon: Users,
    title: "Consultor Dedicado",
    description: "Acompanhamento personalizado para sua escola"
  },
  {
    icon: TrendingUp,
    title: "Análise de Mercado",
    description: "Dados estratégicos da sua região e concorrência"
  },
  {
    icon: Award,
    title: "Selo Prime",
    description: "Reconhecimento de excelência em gestão escolar"
  },
  {
    icon: Clock,
    title: "Treinamentos Exclusivos",
    description: "Capacitação contínua para sua equipe"
  }
];

const BenefitsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-primary/5 to-background" />
      
      {/* Decorative Elements */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Benefícios
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Por que ser uma{" "}
            <span className="text-gradient bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Escola Prime?
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Faça parte de um grupo seleto de escolas que contam com o melhor suporte 
            e ferramentas do ecossistema Proesc.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={`group relative p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-500 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Icon Container */}
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                  {benefit.title}
                </h3>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed pl-[52px]">
                {benefit.description}
              </p>

              {/* Hover Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
