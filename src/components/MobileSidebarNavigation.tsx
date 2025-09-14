import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
  User, LogOut, Sun, Moon, Monitor, Settings, 
  ClipboardList, CalendarDays, Wallet, GraduationCap, 
  ClipboardCheck, TrendingUp, Home, Bot 
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  badge?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface MobileSidebarNavigationProps {
  onOpenProfile: () => void;
  onNavigateSection?: (section: string) => void;
  onToggleAI?: () => void;
  showAI?: boolean;
  userProfile?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  schoolData?: {
    school_name?: string;
    market_analysis_enabled?: boolean;
  };
}

const MobileSidebarNavigation: React.FC<MobileSidebarNavigationProps> = ({ 
  onOpenProfile, 
  onNavigateSection,
  onToggleAI,
  showAI,
  userProfile,
  schoolData
}) => {
  const { setTheme } = useTheme();
  const { signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  const sections: NavigationSection[] = [
    {
      title: "Principal",
      items: [
        {
          id: "home",
          label: "Início",
          icon: Home,
          onClick: () => {
            window.location.href = '/inicio';
            setOpen(false);
          }
        },
        {
          id: "tickets",
          label: "Tickets",
          icon: ClipboardList,
          onClick: () => {
            window.location.href = '/acompanhar-tickets';
            setOpen(false);
          }
        },
        {
          id: "consultant-agenda",
          label: "Agenda do Consultor",
          icon: CalendarDays,
          onClick: () => {
            window.location.href = '/agenda-consultor';
            setOpen(false);
          }
        }
      ]
    },
    {
      title: "Dashboards",
      items: [
        {
          id: "financial",
          label: "Dashboard Financeiro",
          icon: Wallet,
          onClick: () => {
            window.location.href = '/dashboard/financeiro';
            setOpen(false);
          }
        },
        {
          id: "agenda",
          label: "Proesc Agenda",
          icon: CalendarDays,
          onClick: () => {
            window.location.href = '/dashboard/agenda';
            setOpen(false);
          }
        },
        {
          id: "pedagogical",
          label: "Dashboard Pedagógico",
          icon: GraduationCap,
          onClick: () => {
            window.location.href = '/dashboard/pedagogico';
            setOpen(false);
          }
        },
        {
          id: "secretariat",
          label: "Dashboard Secretaria",
          icon: ClipboardCheck,
          onClick: () => {
            window.location.href = '/dashboard/secretaria';
            setOpen(false);
          }
        }
      ]
    }
  ];

  // Add market analysis if enabled
  if (schoolData?.market_analysis_enabled) {
    sections[0].items.push({
      id: "market-analysis",
      label: "Estudo de Mercado",
      icon: TrendingUp,
      badge: "BETA",
      onClick: () => {
        window.location.href = '/estudo-mercado';
        setOpen(false);
      }
    });
  }

  const themeItems: NavigationItem[] = [
    {
      id: "theme-light",
      label: "Tema Claro",
      icon: Sun,
      onClick: () => setTheme("light")
    },
    {
      id: "theme-dark",
      label: "Tema Escuro", 
      icon: Moon,
      onClick: () => setTheme("dark")
    },
    {
      id: "theme-system",
      label: "Tema do Sistema",
      icon: Monitor,
      onClick: () => setTheme("system")
    }
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="mobile-touch-target hover-glow hover:ring-2 hover:ring-primary/50 hover:scale-105 transition-all duration-200 hover:shadow-lg"
          aria-label="Menu de navegação"
        >
          <Avatar className="h-8 w-8 hover:scale-105 transition-transform duration-200">
            <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-[320px] mobile-safe-area overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-semibold">
            {schoolData?.school_name || 'Prime Hub'}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {userProfile?.name && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={userProfile.avatar_url} alt={userProfile.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{userProfile.name}</span>
              </div>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Navigation Sections */}
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start mobile-touch-target hover-scale"
                    onClick={item.onClick}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full border border-primary/20">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <Separator />

          {/* AI Assistant */}
          {onToggleAI && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Assistente
              </h3>
              <Button
                variant="ghost"
                className="w-full justify-start mobile-touch-target hover-scale"
                onClick={() => {
                  onToggleAI();
                  setOpen(false);
                }}
              >
                <Bot className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">
                  {showAI ? 'Fechar' : 'Abrir'} IA
                </span>
              </Button>
            </div>
          )}

          <Separator />

          {/* Theme Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tema
            </h3>
            <div className="space-y-1">
              {themeItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start mobile-touch-target hover-scale"
                  onClick={item.onClick}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Account Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Conta
            </h3>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start mobile-touch-target hover-scale"
                onClick={() => {
                  onOpenProfile();
                  setOpen(false);
                }}
              >
                <User className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">Meu Perfil</span>
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start mobile-touch-target hover-scale text-destructive hover:text-destructive"
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebarNavigation;