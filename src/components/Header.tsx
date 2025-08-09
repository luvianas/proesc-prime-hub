
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Bell } from "lucide-react";

interface HeaderProps {
  showAI: boolean;
  setShowAI: (show: boolean) => void;
}

const Header = ({ showAI, setShowAI }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b border-red-100">
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
              <div className="ml-3">
                <h1 className="text-xl font-bold" style={{ color: '#c41133' }}>Red House Internacional School</h1>
                <Badge variant="secondary" className="text-xs">Portal Prime</Badge>
              </div>
            </div>
          </div>
          
          {/* Proesc Prime Logo - Centered */}
          <div className="flex items-center justify-center flex-1">
            <img 
              src="/lovable-uploads/72aa872c-a403-45a6-a89f-d1c8ce13777b.png" 
              alt="Proesc Prime" 
              className="h-12"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAI(!showAI)}
              className="flex items-center space-x-2 border-red-200 hover:bg-red-50"
              style={{ borderColor: '#c41133', color: '#c41133' }}
            >
              <Bot className="h-4 w-4" />
              <span>IA Assistente</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#c41133' }}>
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
