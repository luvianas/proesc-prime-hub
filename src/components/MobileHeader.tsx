import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Menu, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/useBreakpoint';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  logoUrl?: string;
  avatarUrl?: string;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onBackClick?: () => void;
  showBack?: boolean;
  isAdminView?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  logoUrl,
  avatarUrl,
  onMenuClick,
  onProfileClick,
  onBackClick,
  showBack = false,
  isAdminView = false
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header className="mobile-header bg-card/95 backdrop-blur-md border-border/30 shadow-sm safe-area-padding sticky top-0 z-50">
      <div className="flex items-center gap-3 flex-1">
        {showBack && onBackClick ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackClick}
            className="mobile-touch-target"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : onMenuClick ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="mobile-touch-target"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}

        {logoUrl && (
          <img 
            src={logoUrl} 
            alt={title}
            className="w-10 h-10 object-contain rounded"
          />
        )}

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-responsive-base truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-responsive-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
          {isAdminView && (
            <Badge variant="secondary" className="text-xs mt-1">
              Admin View
            </Badge>
          )}
        </div>
      </div>

      {onProfileClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onProfileClick}
          className="mobile-touch-target rounded-full"
          aria-label="Perfil"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={avatarUrl} alt="Perfil" />
            <AvatarFallback className="bg-gradient-primary text-white text-xs">
              {title.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      )}
    </header>
  );
};

export default MobileHeader;