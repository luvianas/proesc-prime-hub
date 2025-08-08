
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, CalendarDays, FileText, GraduationCap, ChevronDown } from "lucide-react";

interface DashboardGridProps {
  setExpandedDashboard: (id: string) => void;
}

const DashboardGrid = ({ setExpandedDashboard }: DashboardGridProps) => {
  const dashboards = [
    {
      id: "matricula",
      name: "Dashboard de Matrícula",
      description: "Gestão de matrículas e novos alunos",
      icon: GraduationCap,
      color: "bg-red-700"
    },
    {
      id: "pedagogico",
      name: "Dashboard Pedagógico",
      description: "Acompanhamento pedagógico e notas",
      icon: FileText,
      color: "bg-red-500"
    },
    {
      id: "secretaria",
      name: "Dashboard da Secretaria",
      description: "Gestão administrativa e documentos",
      icon: FileText,
      color: "bg-red-800"
    },
    {
      id: "agenda",
      name: "Agenda com Consultor",
      description: "Agendamentos e comunicação",
      icon: CalendarDays,
      color: "bg-red-900"
    }
  ];

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Dashboards Prime</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((dashboard, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onClick={() => setExpandedDashboard(dashboard.id)}
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
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-red-600 transition-colors" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
        <p className="text-sm text-red-800">
          <strong>Nota:</strong> Clique em qualquer dashboard para expandi-la e visualizar os dados completos. 
          Use o botão "Voltar" para recolher a visualização.
        </p>
      </div>
    </div>
  );
};

export default DashboardGrid;
