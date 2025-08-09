import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/components/AdminDashboard";
import UserDashboard from "@/components/UserDashboard";
import GestorDashboard from "@/components/GestorDashboard";
import AIAssistant from "@/components/AIAssistant";
import TicketSystem from "@/components/TicketSystem";
import FinancialDashboard from "@/components/FinancialDashboard";
import SecretariaDashboard from "@/components/SecretariaDashboard";
import AgendaDashboard from "@/components/AgendaDashboard";
import PedagogicoDashboard from "@/components/PedagogicoDashboard";
import MatriculaDashboard from "@/components/MatriculaDashboard";
import ConsultorAgenda from "@/components/ConsultorAgenda";
import ConsultantInfo from "@/components/ConsultantInfo";
import ProjectPlan from "@/components/ProjectPlan";
import Header from "@/components/Header";
import WelcomeSection from "@/components/WelcomeSection";
import CarouselSection from "@/components/CarouselSection";
import QuickActions from "@/components/QuickActions";
import DashboardGrid from "@/components/DashboardGrid";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
const Index = () => {
  const [showAI, setShowAI] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedDashboard, setExpandedDashboard] = useState<string | null>(null);
  const {
    user,
    userRole,
    loading,
    signOut
  } = useAuth();
  const [schoolHeader, setSchoolHeader] = useState<{
    schoolName: string;
    themeColor: string;
    logoUrl?: string;
    consultantName?: string;
    userName?: string;
  } | null>(null);

  // Convert HEX like #c41133 to "h s% l%" for CSS variables
  const hexToHsl = (hex: string): {
    h: number;
    s: number;
    l: number;
  } | null => {
    const cleaned = hex.replace('#', '');
    if (!(cleaned.length === 3 || cleaned.length === 6)) return null;
    const full = cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned;
    const r = parseInt(full.substring(0, 2), 16) / 255;
    const g = parseInt(full.substring(2, 4), 16) / 255;
    const b = parseInt(full.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 1);
          break;
        case g:
          h = (b - r) / d + 3;
          break;
        case b:
          h = (r - g) / d + 5;
          break;
      }
      h *= 60;
    }
    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };
  const applyTheme = (hex?: string) => {
    if (!hex) return;
    const hsl = hexToHsl(hex);
    if (!hsl) return;
    const hslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    const accentL = Math.min(95, hsl.l + 35);
    const accent = `${hsl.h} ${Math.max(20, hsl.s - 30)}% ${accentL}%`;
    document.documentElement.style.setProperty('--primary', hslString);
    document.documentElement.style.setProperty('--ring', hslString);
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--secondary', accent);
  };
  useEffect(() => {
    if (userRole !== 'gestor' || !user) return;
    const load = async () => {
      const {
        data: profile
      } = await supabase.from('profiles').select('school_id, name').eq('user_id', user.id).single();
      if (!profile?.school_id) return;
      const {
        data: school
      } = await supabase.from('school_customizations').select('school_name, theme_color, logo_url, consultant_name').eq('school_id', profile.school_id).maybeSingle();
      if (school) {
        setSchoolHeader({
          schoolName: school.school_name,
          themeColor: school.theme_color,
          logoUrl: school.logo_url || undefined,
          consultantName: school.consultant_name || undefined,
          userName: profile.name || undefined
        });
        applyTheme(school.theme_color);
      }
    };
    load();
  }, [userRole, user]);

  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>;
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render admin dashboard for admin users
  if (userRole === 'admin') {
    return <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Sistema de Controle - Admin</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <AdminDashboard />
      </div>;
  }

  // Render gestor dashboard for gestor users
  if (userRole === 'gestor') {
    return <div className="min-h-screen">
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
          <div className="flex items-center gap-3">
            {schoolHeader?.logoUrl ? <img src={schoolHeader.logoUrl} alt={`Logo ${schoolHeader.schoolName}`} className="w-10 h-10 object-contain rounded" loading="lazy" /> : <div className="w-10 h-10 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {schoolHeader?.schoolName?.charAt(0).toUpperCase()}
              </div>}
            <div>
              <h1 className="text-lg font-semibold">
                Prime Hub - {schoolHeader?.schoolName ?? 'Escola'}
                {schoolHeader?.userName ? ` - ${schoolHeader.userName}` : ''}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge className="bg-primary text-primary-foreground">Gestor</Badge>
                {schoolHeader?.consultantName}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <GestorDashboard />
      </div>;
  }

  // Render user dashboard for regular users
  if (userRole === 'user') {
    return <div className="min-h-screen">
        <div className="absolute top-4 right-4 z-10">
          <Button variant="outline" onClick={signOut} className="bg-white/90 backdrop-blur">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <UserDashboard />
      </div>;
  }

  // Fallback - show original dashboard for users without specific roles
  const dashboards = [{
    id: "matricula",
    component: <MatriculaDashboard onBack={() => setExpandedDashboard(null)} />
  }, {
    id: "pedagogico",
    component: <PedagogicoDashboard onBack={() => setExpandedDashboard(null)} />
  }, {
    id: "secretaria",
    component: <SecretariaDashboard onBack={() => setExpandedDashboard(null)} />
  }, {
    id: "agenda",
    component: <ConsultorAgenda onBack={() => setExpandedDashboard(null)} />
  }];

  // Handle expanded dashboard display
  if (expandedDashboard) {
    const dashboard = dashboards.find(d => d.id === expandedDashboard);
    return dashboard ? dashboard.component : null;
  }
  return <div className="min-h-screen bg-gradient-to-br from-white to-red-50">
      <div className="flex items-center justify-between p-4">
        <Header showAI={showAI} setShowAI={setShowAI} />
        <div className="flex items-center space-x-4">
          <Link to="/auth">
            <Button variant="outline">Entrar no Sistema</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "dashboard" && <>
            <WelcomeSection />
            <CarouselSection />
            <QuickActions setActiveSection={setActiveSection} />
            <Separator className="my-8" />
            <DashboardGrid setExpandedDashboard={setExpandedDashboard} />
          </>}

        {activeSection === "tickets" && <TicketSystem onBack={() => setActiveSection("dashboard")} />}

        {activeSection === "agenda" && <ConsultantInfo onBack={() => setActiveSection("dashboard")} />}

        {activeSection === "plan" && <ProjectPlan onBack={() => setActiveSection("dashboard")} />}

        {/* AI Assistant */}
        {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
      </div>
    </div>;
};
export default Index;