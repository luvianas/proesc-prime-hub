
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Calendar, Clock, User, Phone } from "lucide-react";

interface ConsultantInfoProps {
  onBack: () => void;
}

const ConsultantInfo = ({ onBack }: ConsultantInfoProps) => {
  const consultant = {
    name: "Ana Silva",
    role: "Consultora Prime",
    phone: "+55 (21) 98276-3635",
    email: "ana.silva@proesc.com.br",
    availability: "Segunda a Sexta, 8h às 18h"
  };

  const upcomingMeetings = [
    {
      id: 1,
      title: "Revisão Dashboard Financeiro",
      date: "2024-01-20",
      time: "14:00",
      duration: "1h",
      type: "Reunião Online"
    },
    {
      id: 2,
      title: "Treinamento Novas Funcionalidades",
      date: "2024-01-22",
      time: "10:00",
      duration: "2h",
      type: "Presencial"
    },
    {
      id: 3,
      title: "Planejamento Estratégico Q1",
      date: "2024-01-25",
      time: "15:30",
      duration: "1h30min",
      type: "Reunião Online"
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Consultor Prime</h2>
          <p className="text-gray-600">Informações e agenda do seu consultor dedicado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultant Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle>{consultant.name}</CardTitle>
                  <CardDescription>{consultant.role}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{consultant.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{consultant.availability}</span>
              </div>
              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => window.open(`https://wa.me/5521982763635`, "_blank")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Reunião
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Compromissos</CardTitle>
              <CardDescription>Reuniões e eventos agendados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(meeting.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{meeting.time} ({meeting.duration})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{meeting.type}</Badge>
                      <Button size="sm" variant="outline">
                        Entrar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConsultantInfo;
