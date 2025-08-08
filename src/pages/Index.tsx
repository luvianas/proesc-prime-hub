import { useState } from "react";
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

const Index = () => {
  const [showAI, setShowAI] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedDashboard, setExpandedDashboard] = useState<string | null>(null);
  const { user, userRole, loading, signOut } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render admin dashboard for admin users
  if (userRole === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Sistema de Controle - Admin</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  // Render gestor dashboard for gestor users
  if (userRole === 'gestor') {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
          <h1 className="text-xl font-semibold">Sistema de Gestão</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <GestorDashboard />
      </div>
    );
  }

  // Render user dashboard for regular users
  if (userRole === 'user') {
    return (
      <div className="min-h-screen">
        <div className="absolute top-4 right-4 z-10">
          <Button variant="outline" onClick={signOut} className="bg-white/90 backdrop-blur">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <UserDashboard />
      </div>
    );
  }

  // Fallback - show original dashboard for users without specific roles
  const dashboards = [
    {
      id: "matricula",
      component: <MatriculaDashboard onBack={() => setExpandedDashboard(null)} />
    },
    {
      id: "pedagogico",
      component: <PedagogicoDashboard onBack={() => setExpandedDashboard(null)} />
    },
    {
      id: "secretaria",
      component: <SecretariaDashboard onBack={() => setExpandedDashboard(null)} />
    },
    {
      id: "agenda",
      component: <ConsultorAgenda onBack={() => setExpandedDashboard(null)} />
    }
  ];

  // Handle expanded dashboard display
  if (expandedDashboard) {
    const dashboard = dashboards.find(d => d.id === expandedDashboard);
    return dashboard ? dashboard.component : null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-50">
      <div className="flex items-center justify-between p-4">
        <Header showAI={showAI} setShowAI={setShowAI} />
        <div className="flex items-center space-x-4">
          <Link to="/auth">
            <Button variant="outline">Entrar no Sistema</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "dashboard" && (
          <>
            <WelcomeSection />
            <CarouselSection />
            <QuickActions setActiveSection={setActiveSection} />
            <Separator className="my-8" />
            <DashboardGrid setExpandedDashboard={setExpandedDashboard} />
          </>
        )}

        {activeSection === "tickets" && (
          <TicketSystem onBack={() => setActiveSection("dashboard")} />
        )}

        {activeSection === "agenda" && (
          <ConsultantInfo onBack={() => setActiveSection("dashboard")} />
        )}

        {activeSection === "plan" && (
          <ProjectPlan onBack={() => setActiveSection("dashboard")} />
        )}

        {/* AI Assistant */}
        {showAI && (
          <AIAssistant onClose={() => setShowAI(false)} />
        )}
      </div>
    </div>
  );
};

export default Index;