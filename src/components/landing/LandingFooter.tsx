import { Instagram, Linkedin, Facebook, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingFooterProps {
  onLoginClick: () => void;
}

const LandingFooter = ({ onLoginClick }: LandingFooterProps) => {
  return (
    <footer className="relative py-16 bg-muted/30 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <img 
              src="/lovable-uploads/91ae59f5-1f79-4321-8f22-333ba8882338.png" 
              alt="Prime Hub" 
              className="h-12 mb-4"
            />
            <p className="text-muted-foreground max-w-md mb-6">
              O Prime Hub é a plataforma exclusiva para escolas que fazem parte do programa 
              Prime do Proesc. Acesse dashboards inteligentes, suporte prioritário e muito mais.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://instagram.com/proesc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-card hover:bg-primary/10 transition-colors"
              >
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
              <a 
                href="https://linkedin.com/company/proesc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-card hover:bg-primary/10 transition-colors"
              >
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
              <a 
                href="https://facebook.com/proesc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-card hover:bg-primary/10 transition-colors"
              >
                <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Links Úteis</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://proesc.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  Site do Proesc
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://proesc.com/central-de-ajuda" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  Central de Ajuda
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://proesc.com/termos-de-uso" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  Termos de Uso
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://proesc.com/privacidade" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  Política de Privacidade
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="font-semibold mb-4">Já é Prime?</h4>
            <p className="text-muted-foreground text-sm mb-4">
              Acesse sua conta e aproveite todos os benefícios exclusivos.
            </p>
            <Button 
              onClick={onLoginClick}
              className="w-full"
            >
              Fazer Login
            </Button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Proesc Tecnologia. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Prime Hub v1.0
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
