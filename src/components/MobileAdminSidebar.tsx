import { useState } from 'react';
import { LogOut, Users, School, FileText, BarChart3, ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface MobileAdminSidebarProps {
  onOpenProfile: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  adminProfile: {
    name: string;
    email: string;
    avatar_url: string;
  };
  // Props for admin dashboard navigation
  onNavigateToUsers?: () => void;
  onNavigateToSchools?: () => void;
  onNavigateToNovidades?: () => void;
  onNavigateToUsage?: () => void;
}

const MobileAdminSidebar = ({ 
  onOpenProfile, 
  onBack, 
  showBackButton = false,
  adminProfile,
  onNavigateToUsers,
  onNavigateToSchools,
  onNavigateToNovidades,
  onNavigateToUsage
}: MobileAdminSidebarProps) => {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { setTheme } = useTheme();
  const { isMobile } = useBreakpoint();
  const location = useLocation();

  // Only show mobile sidebar on mobile breakpoint
  if (!isMobile) return null;

  const isOnAdminDashboard = location.pathname === '/admin/dashboard';

  const sections: NavigationSection[] = [];

  // Add admin dashboard specific navigation if on dashboard page
  if (isOnAdminDashboard && (onNavigateToUsers || onNavigateToSchools || onNavigateToNovidades || onNavigateToUsage)) {
    sections.push({
      title: "Gerenciamento",
      items: [
        ...(onNavigateToUsers ? [{
          id: 'users',
          label: 'Usuários',
          icon: Users,
          onClick: () => {
            onNavigateToUsers();
            setOpen(false);
          }
        }] : []),
        ...(onNavigateToSchools ? [{
          id: 'schools',
          label: 'Instituições',
          icon: School,
          onClick: () => {
            onNavigateToSchools();
            setOpen(false);
          }
        }] : []),
        ...(onNavigateToNovidades ? [{
          id: 'novidades',
          label: 'Novidades',
          icon: FileText,
          onClick: () => {
            onNavigateToNovidades();
            setOpen(false);
          }
        }] : []),
        ...(onNavigateToUsage ? [{
          id: 'usage',
          label: 'Dados de Uso',
          icon: BarChart3,
          onClick: () => {
            onNavigateToUsage();
            setOpen(false);
          }
        }] : [])
      ]
    });
  }

  const themeItems = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Escuro' },
    { value: 'system', label: 'Sistema' }
  ];

  const handleProfileClick = () => {
    onOpenProfile();
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative rounded-full p-1 hover:ring-2 hover:ring-primary/50 hover:scale-105 transition-all duration-200 hover:shadow-lg"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={adminProfile.avatar_url} alt="Admin profile" />
            <AvatarFallback className="bg-gradient-primary text-white text-sm">
              {(adminProfile.name || user?.email || '').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-80 p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={adminProfile.avatar_url} alt="Admin profile" />
                <AvatarFallback className="bg-gradient-primary text-white">
                  {(adminProfile.name || user?.email || '').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {adminProfile.name || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {adminProfile.email || user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              
              {/* Back Button */}
              {showBackButton && (
                <div>
                  <Button
                    variant="outline"
                    onClick={handleBackClick}
                    className="w-full justify-start gap-2 mobile-touch-target"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar à seleção
                  </Button>
                </div>
              )}

              {/* Admin Dashboard Navigation */}
              {sections.map((section, index) => (
                <div key={index}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={item.onClick}
                        className="w-full justify-start gap-3 mobile-touch-target hover:bg-primary/10 hover:text-primary"
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                  {index < sections.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}

              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Tema
                </h3>
                <div className="space-y-1">
                  {themeItems.map((theme) => (
                    <Button
                      key={theme.value}
                      variant="ghost"
                      onClick={() => setTheme(theme.value)}
                      className="w-full justify-start mobile-touch-target hover:bg-primary/10 hover:text-primary"
                    >
                      {theme.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border/30 space-y-2">
            <Button
              variant="outline"
              onClick={handleProfileClick}
              className="w-full justify-start gap-3 mobile-touch-target"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={adminProfile.avatar_url} alt="Profile" />
                <AvatarFallback className="bg-gradient-primary text-white text-xs">
                  {(adminProfile.name || '').charAt(0)}
                </AvatarFallback>
              </Avatar>
              Meu Perfil
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-start gap-3 mobile-touch-target text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileAdminSidebar;