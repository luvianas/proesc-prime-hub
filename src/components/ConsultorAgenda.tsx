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
          const schoolId = schoolData?.school_id || schoolData?.id;
          
          // Buscar primeiro os dados da escola com o consultant_id
          const { data: schoolCustomization, error: schoolError } = await supabase
            .from('school_customizations')
            .select('consultant_id, consultant_whatsapp, consultant_calendar_url, consultant_name, consultant_photo_url')
            .eq('school_id', schoolId)
            .single();

          if (schoolError) throw schoolError;

          let consultantInfo = {
            name: 'Consultor não configurado',
            consultant_whatsapp: null,
            consultant_calendar_url: null,
            avatar_url: null,
          };

          // Se temos um consultant_id, buscar dados completos do perfil do consultor
          if (schoolCustomization?.consultant_id) {
            const { data: consultantProfile, error: consultantError } = await supabase
              .from('profiles')
              .select('name, avatar_url, consultant_whatsapp, consultant_calendar_url')
              .eq('user_id', schoolCustomization.consultant_id)
              .single();

            if (!consultantError && consultantProfile) {
              consultantInfo = {
                name: consultantProfile.name || schoolCustomization.consultant_name || 'Consultor não configurado',
                consultant_whatsapp: consultantProfile.consultant_whatsapp || schoolCustomization.consultant_whatsapp,
                consultant_calendar_url: consultantProfile.consultant_calendar_url || schoolCustomization.consultant_calendar_url,
                avatar_url: consultantProfile.avatar_url || schoolCustomization.consultant_photo_url,
              };

              console.log('✅ Dados do consultor obtidos do perfil:', {
                school_id: schoolId,
                consultant_id: schoolCustomization.consultant_id,
                consultant_data: consultantInfo
              });
            } else {
              // Fallback para dados armazenados diretamente na school_customizations
              consultantInfo = {
                name: schoolCustomization.consultant_name || 'Consultor não configurado',
                consultant_whatsapp: schoolCustomization.consultant_whatsapp,
                consultant_calendar_url: schoolCustomization.consultant_calendar_url,
                avatar_url: schoolCustomization.consultant_photo_url,
              };

              console.log('⚠️ Usando dados de fallback da escola:', {
                school_id: schoolId,
                consultant_data: consultantInfo
              });
            }
          } else {
            // Se não há consultant_id, usar dados diretos da school_customizations
            consultantInfo = {
              name: schoolCustomization.consultant_name || 'Consultor não configurado',
              consultant_whatsapp: schoolCustomization.consultant_whatsapp,
              consultant_calendar_url: schoolCustomization.consultant_calendar_url,
              avatar_url: schoolCustomization.consultant_photo_url,
            };

            console.log('📋 Dados do consultor obtidos da configuração da escola:', {
              school_id: schoolId,
              consultant_data: consultantInfo
            });
          }
          
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
    if (consultantData?.consultant_whatsapp) {
      const phone = consultantData.consultant_whatsapp.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
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
          <h2 className="text-3xl font-bold text-brand">Contate seu consultor</h2>
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
        <h2 className="text-3xl font-bold text-brand">Contate seu consultor</h2>
        <link rel="canonical" href={window.location.href} />
      </div>

      {/* Consultant Info Centered */}
      <div className="flex justify-center mb-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              <div className="flex flex-col items-center space-y-4">
                {consultantData?.avatar_url && (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-primary/30 shadow-lg">
                    <img 
                      src={consultantData.avatar_url} 
                      alt={consultantData?.name || "Consultor"} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                <h3 className="text-xl font-semibold">{consultantData?.name || "Consultor não configurado"}</h3>
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
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Calendário do consultor não configurado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Contate seu consultor:</strong> Visualize e agende reuniões com seu consultor educacional. Use o WhatsApp para comunicação rápida.</p>
      </div>
    </div>
  );
};

export default ConsultorAgenda;