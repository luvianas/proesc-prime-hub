import { Instagram, Linkedin, Facebook, ExternalLink, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-background/95 backdrop-blur-sm border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Redes Sociais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground font-sora">Siga o Proesc</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://instagram.com/proesc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground hover:scale-110 transition-all duration-300 hover:shadow-lg"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com/company/proesc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground hover:scale-110 transition-all duration-300 hover:shadow-lg"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/proesc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground hover:scale-110 transition-all duration-300 hover:shadow-lg"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Base de Conhecimento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground font-sora">Suporte</h3>
            <div className="space-y-2">
              <a
                href="https://base.proesc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="font-sora">Base de Conhecimento</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://suporte.proesc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                <span className="font-sora">Suporte Técnico</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Links Úteis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground font-sora">Links Úteis</h3>
            <div className="space-y-2">
              <a
                href="https://proesc.com/termos"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 font-sora"
              >
                Termos de Uso
              </a>
              <a
                href="https://proesc.com/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 font-sora"
              >
                Política de Privacidade
              </a>
              <a
                href="https://proesc.com/contato"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 font-sora"
              >
                Contato
              </a>
            </div>
          </div>

          {/* Botão Premium - Retornar ao Proesc */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground font-sora">Plataforma Principal</h3>
            <Button
              asChild
              className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 font-sora"
            >
              <a
                href="https://app.proesc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retornar ao Proesc
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground font-sora">
              Acesse a plataforma completa do Proesc
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground font-sora">
              © 2024 Proesc. Todos os direitos reservados.
            </p>
            <p className="text-xs text-muted-foreground font-sora">
              Prime Hub v2.0.0 - Desenvolvido com ❤️ para educação
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;