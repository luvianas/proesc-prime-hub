import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onScrollToFeatures: () => void;
  onLoginClick: () => void;
}

const HeroSection = ({ onScrollToFeatures, onLoginClick }: HeroSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10">
        {/* Floating Shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Particle Effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9nPjwvc3ZnPg==')] opacity-50" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Logo */}
        <div 
          className={`mb-8 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
          }`}
        >
          <img 
            src="/lovable-uploads/91ae59f5-1f79-4321-8f22-333ba8882338.png" 
            alt="Prime Hub" 
            className="h-24 md:h-32 mx-auto drop-shadow-2xl"
          />
        </div>

        {/* Badge */}
        <div 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6 transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">Exclusivo para Escolas Prime</span>
        </div>

        {/* Headline */}
        <h1 
          className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="text-foreground">Transforme a </span>
          <span className="text-gradient bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
            Gestão
          </span>
          <br />
          <span className="text-foreground">da Sua Escola</span>
        </h1>

        {/* Subheadline */}
        <p 
          className={`text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          O Prime Hub reúne dashboards inteligentes, suporte prioritário e ferramentas exclusivas 
          para escolas que fazem parte do programa Prime do Proesc.
        </p>

        {/* CTAs */}
        <div 
          className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Button 
            size="lg" 
            onClick={onScrollToFeatures}
            className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
          >
            <span className="relative z-10">Conhecer Funcionalidades</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            onClick={onLoginClick}
            className="px-8 py-6 text-lg rounded-xl border-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300"
          >
            Acessar Prime Hub
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-1000 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button 
          onClick={onScrollToFeatures}
          className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300 group"
        >
          <span className="text-sm">Descubra mais</span>
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
