import React from 'react';
import { School } from 'lucide-react';
import MobileSidebarNavigation from '@/components/MobileSidebarNavigation';

interface MobileGestorHeaderProps {
  schoolData?: {
    school_name?: string;
    logo_url?: string;
    market_analysis_enabled?: boolean;
  };
  userProfile?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  onOpenProfile: () => void;
  onNavigateSection?: (section: string) => void;
  onToggleAI?: () => void;
  showAI?: boolean;
}

const MobileGestorHeader: React.FC<MobileGestorHeaderProps> = ({
  schoolData,
  userProfile,
  onOpenProfile,
  onNavigateSection,
  onToggleAI,
  showAI
}) => {
  return (
    <header className="flex items-center justify-between spacing-mobile bg-card border-b border-border overflow-safe sticky top-0 z-50 backdrop-blur-md bg-card/95">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {schoolData?.logo_url ? (
          <div className="logo-adaptive h-8 w-8 flex-shrink-0">
            <img 
              src={schoolData.logo_url} 
              alt={schoolData.school_name}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            <School className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold truncate">{schoolData?.school_name || 'Prime Hub'}</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <img 
          src="/lovable-uploads/e2e0ce0d-c100-4d48-8073-8635cab3c459.png" 
          alt="Proesc Prime"
          className="h-6 w-auto hidden sm:block"
        />
        
        <MobileSidebarNavigation 
          onOpenProfile={onOpenProfile}
          onNavigateSection={onNavigateSection}
          onToggleAI={onToggleAI}
          showAI={showAI}
          userProfile={userProfile}
          schoolData={schoolData}
        />
      </div>
    </header>
  );
};

export default MobileGestorHeader;