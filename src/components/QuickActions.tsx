
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, MessageCircle, Calendar } from "lucide-react";

interface QuickActionsProps {
  setActiveSection: (section: string) => void;
}

const QuickActions = ({ setActiveSection }: QuickActionsProps) => {
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
  );
};

export default QuickActions;
