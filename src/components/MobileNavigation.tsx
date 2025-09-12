import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { 
  Menu, 
  Home, 
  ClipboardList, 
  CalendarDays, 
  Wallet, 
  GraduationCap, 
  ClipboardCheck,
  TrendingUp,
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Monitor 
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
}

interface MobileNavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  marketAnalysisEnabled?: boolean;
  onProfileClick?: () => void;
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeSection,
  onNavigate,
  marketAnalysisEnabled = false,
  onProfileClick,
  className = ""
}) => {
  const { setTheme, theme } = useTheme();
  const { signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Início',
      icon: Home,
      onClick: () => {
        onNavigate('home');
        setOpen(false);
      }
    },
    {
      id: 'tickets',
      label: 'Tickets',
      icon: ClipboardList,
      onClick: () => {
        onNavigate('tickets');
        setOpen(false);
      }
    },
    {
      id: 'consultor-agenda',
      label: 'Agenda do Consultor',
      icon: CalendarDays,
      onClick: () => {
        onNavigate('consultor-agenda');
        setOpen(false);
      }
    },
    ...(marketAnalysisEnabled ? [{
      id: 'market-analysis',
      label: 'Estudo de Mercado',
      icon: TrendingUp,
      onClick: () => {
        onNavigate('market-analysis');
        setOpen(false);
      }
    }] : []),
    {
      id: 'dash-financeiro',
      label: 'Dashboard Financeiro',
      icon: Wallet,
      onClick: () => {
        onNavigate('dash-financeiro');
        setOpen(false);
      }
    },
    {
      id: 'dash-agenda',
      label: 'Proesc Agenda',
      icon: CalendarDays,
      onClick: () => {
        onNavigate('dash-agenda');
        setOpen(false);
      }
    },
    {
      id: 'dash-pedagogico',
      label: 'Dashboard Pedagógico',
      icon: GraduationCap,
      onClick: () => {
        onNavigate('dash-pedagogico');
        setOpen(false);
      }
    },
    {
      id: 'dash-secretaria',
      label: 'Dashboard Secretaria',
      icon: ClipboardCheck,
      onClick: () => {
        onNavigate('dash-secretaria');
        setOpen(false);
      }
    }
  ];

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
      setOpen(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`mobile-touch-target ${className}`}
          aria-label="Menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Navigation Header */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Portal Prime</h2>
            <p className="text-sm text-muted-foreground">Navegação</p>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`mobile-nav-item w-full text-left ${
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-muted-foreground hover:text-foreground'
                    } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="mobile-text">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="border-t p-4 space-y-2">
            {/* Theme Toggle */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground px-3">Tema</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  <span className="text-xs">Claro</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  <span className="text-xs">Escuro</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('system')}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  <span className="text-xs">Sistema</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Profile and Logout */}
            <div className="space-y-2">
              {onProfileClick && (
                <button
                  onClick={handleProfileClick}
                  className="mobile-nav-item w-full text-left"
                >
                  <User className="h-5 w-5" />
                  <span className="mobile-text">Meu Perfil</span>
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="mobile-nav-item w-full text-left text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span className="mobile-text">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigation;