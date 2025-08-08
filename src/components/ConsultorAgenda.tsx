import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MessageCircle, Phone, Mail, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConsultorAgendaProps {
  onBack: () => void;
}

const ConsultorAgenda = ({ onBack }: ConsultorAgendaProps) => {
  const consultant = {
    name: "Maria Silva",
    role: "Consultora Educacional",
    phone: "+55 11 99999-9999",
    email: "maria.silva@redhouse.edu.br",
    avatar: "/lovable-uploads/e591c8ad-1800-4b34-afed-43510f6a8268.png"
  };

  const upcomingMeetings = [
    {
      date: "2024-01-15",
      time: "14:00",
      type: "Reunião de Planejamento",
      status: "confirmado"
    },
    {
      date: "2024-01-18",
      time: "10:30",
      type: "Apresentação Institucional",
      status: "pendente"
    }
  ];

  const handleWhatsAppClick = () => {
    const whatsappUrl = `https://wa.me/5511999999999?text=Olá! Gostaria de agendar uma reunião.`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h2 className="text-3xl font-bold text-gray-900">Agenda com Consultor</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultant Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  src={consultant.avatar} 
                  alt={consultant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{consultant.name}</h3>
                <p className="text-sm text-muted-foreground">{consultant.role}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{consultant.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{consultant.email}</span>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleWhatsAppClick}
                className="w-full bg-green-600 hover:bg-green-700"
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

        {/* Calendar and Meetings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Próximas Reuniões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingMeetings.map((meeting, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{meeting.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{meeting.time}</span>
                  </div>
                  <span className="text-sm">{meeting.type}</span>
                </div>
                <Badge variant={meeting.status === 'confirmado' ? 'default' : 'secondary'}>
                  {meeting.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Google Calendar Integration */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Calendário de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src="https://calendar.google.com/calendar/embed?src=c_classroom34b38741%40group.calendar.google.com&ctz=America%2FSao_Paulo"
            title="Calendário do Consultor"
            width="100%"
            height="600"
            frameBorder="0"
            className="w-full border-0 rounded-b-lg"
          />
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Agenda com Consultor:</strong> Visualize e agende reuniões com nossa consultora educacional. Use o WhatsApp para comunicação rápida.</p>
      </div>
    </div>
  );
};

export default ConsultorAgenda;