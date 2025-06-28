
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import AIAssistant from "@/components/AIAssistant";
import TicketSystem from "@/components/TicketSystem";
import FinancialDashboard from "@/components/FinancialDashboard";
import SecretariaDashboard from "@/components/SecretariaDashboard";
import AgendaDashboard from "@/components/AgendaDashboard";
import PedagogicoDashboard from "@/components/PedagogicoDashboard";
import Header from "@/components/Header";
import WelcomeSection from "@/components/WelcomeSection";
import CarouselSection from "@/components/CarouselSection";
import QuickActions from "@/components/QuickActions";
import DashboardGrid from "@/components/DashboardGrid";

const Index = () => {
  const [showAI, setShowAI] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedDashboard, setExpandedDashboard] = useState<string | null>(null);

  const dashboards = [
    {
      id: "financial",
      component: <FinancialDashboard onBack={() => setExpandedDashboard(null)} />
    },
    {
      id: "agenda",
      component: <AgendaDashboard onBack={() => setExpandedDashboard(null)} />
    },
    {
      id: "secretaria",
      component: <SecretariaDashboard onBack={() => setExpandedDashboard(null)} />
    },
    {
      id: "pedagogico",
      component: <PedagogicoDashboard onBack={() => setExpandedDashboard(null)} />
    }
  ];

  // Handle expanded dashboard display
  if (expandedDashboard) {
    const dashboard = dashboards.find(d => d.id === expandedDashboard);
    return dashboard ? dashboard.component : null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-50">
      <Header showAI={showAI} setShowAI={setShowAI} />

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
          <AgendaDashboard onBack={() => setActiveSection("dashboard")} />
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
