
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Ticket, 
  MessageCircle, 
  Calendar, 
  BarChart3, 
  DollarSign, 
  CalendarDays, 
  FileText, 
  GraduationCap,
  Bot,
  ExternalLink,
  Clock,
  Users,
  Bell
} from "lucide-react";
import AIAssistant from "@/components/AIAssistant";
import TicketSystem from "@/components/TicketSystem";
import ConsultantInfo from "@/components/ConsultantInfo";

const Index = () => {
  const [showAI, setShowAI] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  const dashboards = [
    {
      name: "Matrícula",
      description: "Acompanhe matrículas e processos seletivos",
      icon: Users,
      color: "bg-blue-500",
      url: "#"
    },
    {
      name: "Financeiro",
      description: "Relatórios financeiros e receitas",
      icon: DollarSign,
      color: "bg-green-500",
      url: "#"
    },
    {
      name: "Proesc Agenda",
      description: "Sistema de agendamentos integrado",
      icon: CalendarDays,
      color: "bg-purple-500",
      url: "#"
    },
    {
      name: "Secretaria",
      description: "Gestão administrativa e documentos",
      icon: FileText,
      color: "bg-orange-500",
      url: "#"
    },
    {
      name: "Pedagógico",
      description: "Acompanhamento pedagógico e notas",
      icon: GraduationCap,
      color: "bg-indigo-500",
      url: "#"
    }
  ];

  const quickActions = [
    {
      name: "Tickets",
      description: "Acompanhe seus tickets",
      icon: Ticket,
      count: 3,
      action: () => setActiveSection("tickets")
    },
    {
      name: "WhatsApp Consultor",
      description: "Contato direto",
      icon: MessageCircle,
      action: () => window.open("https://wa.me/5596984130163", "_blank")
    },
    {
      name: "Agenda Consultor",
      description: "Próximos compromissos",
      icon: Calendar,
      action: () => setActiveSection("agenda")
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-gray-900">Proesc Prime</h1>
                  <Badge variant="secondary" className="text-xs">Portal Exclusivo</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAI(!showAI)}
                className="flex items-center space-x-2"
              >
                <Bot className="h-4 w-4" />
                <span>IA Assistente</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-gray-500" />
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "dashboard" && (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Bem-vindo ao Portal Prime
              </h2>
              <p className="text-gray-600">
                Acesso exclusivo às ferramentas avançadas do Proesc para escolas Prime
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {quickActions.map((action, index) => (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
                  onClick={action.action}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <action.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{action.name}</CardTitle>
                          <CardDescription>{action.description}</CardDescription>
                        </div>
                      </div>
                      {action.count && (
                        <Badge variant="destructive" className="ml-2">
                          {action.count}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Separator className="my-8" />

            {/* Dashboards Grid */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Dashboards Prime</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboards.map((dashboard, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => window.open(dashboard.url, "_blank")}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 ${dashboard.color} rounded-lg`}>
                            <dashboard.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                              {dashboard.name}
                            </CardTitle>
                            <CardDescription>{dashboard.description}</CardDescription>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection === "tickets" && (
          <TicketSystem onBack={() => setActiveSection("dashboard")} />
        )}

        {activeSection === "agenda" && (
          <ConsultantInfo onBack={() => setActiveSection("dashboard")} />
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
