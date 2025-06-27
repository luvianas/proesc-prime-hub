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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import AIAssistant from "@/components/AIAssistant";
import TicketSystem from "@/components/TicketSystem";
import ConsultantInfo from "@/components/ConsultantInfo";
import FinancialDashboard from "@/components/FinancialDashboard";
import SecretariaDashboard from "@/components/SecretariaDashboard";

const Index = () => {
  const [showAI, setShowAI] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  const dashboards = [
    {
      name: "Matrícula",
      description: "Acompanhe matrículas e processos seletivos",
      icon: Users,
      color: "bg-red-600",
      url: "#"
    },
    {
      name: "Financeiro",
      description: "Relatórios financeiros e receitas",
      icon: DollarSign,
      color: "bg-red-700",
      action: () => setActiveSection("financial")
    },
    {
      name: "Proesc Agenda",
      description: "Sistema de agendamentos integrado",
      icon: CalendarDays,
      color: "bg-red-500",
      url: "#"
    },
    {
      name: "Secretaria",
      description: "Gestão administrativa e documentos",
      icon: FileText,
      color: "bg-red-800",
      action: () => setActiveSection("secretaria")
    },
    {
      name: "Pedagógico",
      description: "Acompanhamento pedagógico e notas",
      icon: GraduationCap,
      color: "bg-red-900",
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

  // Updated carousel images with the new Proesc images
  const carouselImages = [
    {
      id: 1,
      title: "A Proesc está entre os indicados ao Top Educação 2025!",
      description: "Vote agora e ajude a Proesc a conquistar este reconhecimento",
      image: "/lovable-uploads/e591c8ad-1800-4b34-afed-43510f6a8268.png"
    },
    {
      id: 2,
      title: "Confira as demais programações em treinamentos",
      description: "Acesse www.educacional.proesc.com/treinamentos para mais informações",
      image: "/lovable-uploads/6674693d-4414-484d-bcda-91c0b0d108ac.png"
    },
    {
      id: 3,
      title: "Boleto Escolar via PIX e QR Code",
      description: "Mais facilidade para os pais - Compensação rápida, praticidade e segurança",
      image: "/lovable-uploads/c38a6881-8d92-4f8a-a13d-b5e6099798f8.png"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-50">
      {/* Header */}
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
            
            {/* Proesc Prime Logo - Increased size and centered */}
            <div className="flex items-center justify-center flex-1">
              <img 
                src="/lovable-uploads/87a7541c-22d3-4ff4-8b78-7b74c4f90f7e.png" 
                alt="Proesc Prime" 
                className="h-16"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "dashboard" && (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Bem-vindo ao Portal Prime
              </h2>
              <p className="text-gray-600">
                Red House Internacional School - Acesso exclusivo às ferramentas avançadas do Proesc
              </p>
            </div>

            {/* Carousel Section */}
            <div className="mb-8">
              <Card className="overflow-hidden border-red-100">
                <CardContent className="p-0">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {carouselImages.map((item) => (
                        <CarouselItem key={item.id}>
                          <div className="relative">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-[300px] md:h-[400px] object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                              <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                              <p className="text-white/90">{item.description}</p>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </Carousel>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Recursos Disponíveis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickActions.map((action, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 hover:scale-105"
                    style={{ borderLeftColor: '#c41133' }}
                    onClick={action.action}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: '#c41133', opacity: 0.1 }}>
                            <action.icon className="h-5 w-5" style={{ color: '#c41133' }} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{action.name}</CardTitle>
                            <CardDescription>{action.description}</CardDescription>
                          </div>
                        </div>
                        {action.count && (
                          <Badge variant="destructive" className="ml-2" style={{ backgroundColor: '#c41133' }}>
                            {action.count}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
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
                    onClick={() => dashboard.action ? dashboard.action() : window.open(dashboard.url, "_blank")}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 ${dashboard.color} rounded-lg`}>
                            <dashboard.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-red-600 transition-colors">
                              {dashboard.name}
                            </CardTitle>
                            <CardDescription>{dashboard.description}</CardDescription>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Nota:</strong> Os dashboards serão incorporados diretamente do Metabase em breve. 
                  Aguarde as próximas atualizações para visualização completa dos dados.
                </p>
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

        {activeSection === "financial" && (
          <FinancialDashboard onBack={() => setActiveSection("dashboard")} />
        )}

        {activeSection === "secretaria" && (
          <SecretariaDashboard onBack={() => setActiveSection("dashboard")} />
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
