import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MessageCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConsultorAgendaProps {
  onBack: () => void;
  schoolData?: any;
}

const ConsultorAgenda = ({ onBack, schoolData }: ConsultorAgendaProps) => {
  const [consultantData, setConsultantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsultantData = async () => {
      if (!schoolData?.consultant_id) {
        setLoading(false);
        return;
      }

      try {
        const { data: consultant, error } = await supabase
          .from('profiles')
          .select('name, consultant_whatsapp, consultant_calendar_url, avatar_url')
          .eq('user_id', schoolData.consultant_id)
          .single();

        if (error) throw error;
        setConsultantData(consultant);
      } catch (error) {
        console.error('Error fetching consultant data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultantData();
  }, [schoolData?.consultant_id]);

  const extractSrc = (input?: string) => {
    if (!input) return undefined;
    const match = input.match(/src=["']([^"']+)["']/i);
    if (match) return match[1];
    return input.trim();
  };

  const calendarSrc = extractSrc(consultantData?.consultant_calendar_url);

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
    const phone = consultantData?.consultant_whatsapp;
    if (!phone) {
      window.alert('WhatsApp do consultor não configurado.');
      return;
    }
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  if (loading) {
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
          <h2 className="text-3xl font-bold text-brand">Agenda com Consultor</h2>
        </div>
        <div className="text-center py-8">Carregando dados do consultor...</div>
      </div>
    );
  }

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
        <h2 className="text-3xl font-bold text-brand">Agenda com Consultor</h2>
        <link rel="canonical" href={window.location.href} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultant Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {consultantData?.avatar_url && (
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img 
                    src={consultantData.avatar_url} 
                    alt={consultantData?.name || "Consultor"} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{consultantData?.name || "Consultor não encontrado"}</h3>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contatos removidos por não estarem configurados no contexto atual */}
            
            <div className="space-y-2">
              {consultantData?.consultant_whatsapp && (
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Agendar Reunião
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Google Calendar Integration */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Calendário de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {calendarSrc ? (
            <iframe
              src={calendarSrc}
              title="Calendário do Consultor"
              width="100%"
              height="600"
              frameBorder="0"
              className="w-full border-0 rounded-b-lg"
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Calendário não configurado para este consultor</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Agenda com Consultor:</strong> Visualize e agende reuniões com nossa consultora educacional. Use o WhatsApp para comunicação rápida.</p>
      </div>
    </div>
  );
};

export default ConsultorAgenda;