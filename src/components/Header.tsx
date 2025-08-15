
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  showAI: boolean;
  setShowAI: (show: boolean) => void;
}

const Header = ({ showAI, setShowAI }: HeaderProps) => {
  return (
    <header className="bg-surface/80 backdrop-blur-sm shadow-elegant border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-6">
            {/* Red House Logo */}
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/e2e0ce0d-c100-4d48-8073-8635cab3c459.png" 
                alt="Red House Internacional School" 
                className="h-12 w-12"
              />
              <div className="ml-3 hidden md:block">
                <h1 className="text-xl font-bold" style={{ color: '#c41133' }}>Red House Internacional School</h1>
                <Badge variant="secondary" className="text-xs">Portal Prime</Badge>
              </div>
            </div>
          </div>
          
          {/* Central Logo - Centered */}
          <div className="flex items-center justify-center flex-1">
            <img 
              src="/lovable-uploads/acebbdfd-931e-4b04-af8c-a6951b7e1088.png" 
              alt="Portal Prime" 
              className="h-12"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAI(!showAI)}
              className="btn-elegant hover-glow flex items-center space-x-2"
              style={{ borderColor: '#c41133', color: '#c41133' }}
            >
              <Bot className="h-4 w-4" />
              <span>IA Assistente</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              <div className="w-8 h-8 rounded-full flex items-center justify-center hover-lift" style={{ backgroundColor: '#c41133' }}>
                <span className="text-white font-medium text-sm">R</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
