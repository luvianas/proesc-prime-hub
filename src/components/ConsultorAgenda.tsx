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
      try {
        // Buscar dados do consultor correto com base no school_id
        if (schoolData?.school_id || schoolData?.id) {
          let query = supabase
            .from('school_customizations')
            .select('consultant_whatsapp, consultant_calendar_url, consultant_name, consultant_photo_url')
            .limit(1);

          const schoolId = schoolData?.school_id || schoolData?.id;
          query = query.eq('school_id', schoolId);

          const { data, error } = await query.maybeSingle();
          if (error) throw error;

          console.log('🔍 Dados do consultor obtidos da escola:', {
            school_id: schoolId,
            consultant_data: data
          });

          const consultantInfo = {
            name: data?.consultant_name || 'Consultor não configurado',
            consultant_whatsapp: data?.consultant_whatsapp,
            consultant_calendar_url: data?.consultant_calendar_url,
            avatar_url: data?.consultant_photo_url,
          };
          
          setConsultantData(consultantInfo);
        }
      } catch (error) {
        console.error('Error fetching consultant data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultantData();
  }, [schoolData?.school_id, schoolData?.id]);

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
    const raw = consultantData?.consultant_whatsapp as string | undefined;
    if (!raw) {
      window.alert('WhatsApp do consultor não configurado.');
      return;
    }
    const digits = raw.replace(/\D/g, '');
    const phone = digits.startsWith('55') ? digits : `55${digits}`;
    if (!phone) {
      window.alert('Número de WhatsApp inválido.');
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
            <CardTitle className="flex items-center justify-center space-x-3">
              {consultantData?.avatar_url && (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20">
                  <img 
                    src={consultantData.avatar_url} 
                    alt={consultantData?.name || "Consultor"} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-semibold">{consultantData?.name || "Consultor não encontrado"}</h3>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="space-y-2 w-full max-w-xs">
              {consultantData?.consultant_whatsapp && (
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
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