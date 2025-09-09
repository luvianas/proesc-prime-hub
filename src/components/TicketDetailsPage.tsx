import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, User, Calendar, MessageSquare, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketDetailsPageProps {
  ticketId: string;
  onBack: () => void;
}

interface TicketDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created: string;
  category: string;
  zendesk_id?: number;
  requester_name?: string;
  requester_email?: string;
  comments?: Comment[];
  audits?: Audit[];
}

interface Comment {
  id: number;
  type: string;
  body: string;
  html_body: string;
  author_id: number;
  created_at: string;
  public: boolean;
  author?: {
    name: string;
    email: string;
  };
}

interface Audit {
  id: number;
  ticket_id: number;
  created_at: string;
  author_id: number;
  events: AuditEvent[];
  author?: {
    name: string;
    email: string;
  };
}

interface AuditEvent {
  id: number;
  type: string;
  field_name?: string;
  previous_value?: any;
  value?: any;
}

const TicketDetailsPage = ({ ticketId, onBack }: TicketDetailsPageProps) => {
  const { toast } = useToast();
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-tickets', {
        body: { 
          action: 'get_ticket_details',
          ticket_id: ticketId
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        console.error('Error loading ticket details:', error);
        toast({
          title: "Erro ao carregar detalhes",
          description: "Não foi possível carregar os detalhes do ticket.",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Erro",
          description: data.message || "Erro ao carregar detalhes do ticket.",
          variant: "destructive",
        });
        return;
      }

      setTicketDetails(data);
    } catch (error) {
      console.error('Error loading ticket details:', error);
      toast({
        title: "Erro interno",
        description: "Erro inesperado ao carregar detalhes do ticket.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      "Em Andamento": "default",
      "Pendente": "secondary",
      "Resolvido": "success"
    };
    return variants[status as keyof typeof variants] || "default";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Em Andamento":
        return <Clock className="h-4 w-4" />;
      case "Resolvido":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    if (!priority || typeof priority !== 'string') {
      return 'bg-gray-100 text-gray-800';
    }
    
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventDescription = (event: AuditEvent) => {
    switch (event.type) {
      case 'Change':
        if (event.field_name === 'status') {
          return `Status alterado de "${event.previous_value}" para "${event.value}"`;
        }
        if (event.field_name === 'priority') {
          return `Prioridade alterada de "${event.previous_value}" para "${event.value}"`;
        }
        if (event.field_name === 'assignee_id') {
          return event.value ? 'Ticket atribuído' : 'Atribuição removida';
        }
        return `${event.field_name} alterado`;
      case 'Create':
        return 'Ticket criado';
      case 'Comment':
        return 'Comentário adicionado';
      default:
        return event.type;
    }
  };

  const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
    if (!dateValue) {
      return 'Data não disponível';
    }
    
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue);
        return 'Data inválida';
      }
      
      return format(date, formatString, { locale: ptBR });
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', dateValue);
      return 'Erro ao formatar data';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando detalhes do ticket...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticketDetails) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Button variant="ghost" onClick={onBack} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Ticket não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#ca8619' }}>
              Detalhes do Ticket #{ticketDetails.id}
            </h1>
            <p className="text-muted-foreground">Visualização completa do ticket</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">#{ticketDetails.id}</Badge>
                      <Badge variant={getStatusBadge(ticketDetails.status) as any}>
                        {getStatusIcon(ticketDetails.status)}
                        <span className="ml-1">{ticketDetails.status}</span>
                      </Badge>
                      <Badge variant="secondary">{ticketDetails.category}</Badge>
                    </div>
                    <CardTitle className="text-xl">{ticketDetails.title}</CardTitle>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <div className="flex items-center space-x-1 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>Criado em {safeFormatDate(ticketDetails.created)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Descrição:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{ticketDetails.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline de Atividades */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Histórico de Atividades</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mostrar apenas comentários/conversas */}
                  {(() => {
                    const allEvents: any[] = [];
                    
                    // Adicionar apenas comentários públicos
                    if (ticketDetails.comments) {
                      ticketDetails.comments.forEach(comment => {
                        // Mostrar apenas comentários públicos
                        if (comment.public && comment.created_at) {
                          const commentDate = new Date(comment.created_at);
                          if (!isNaN(commentDate.getTime())) {
                            allEvents.push({
                              type: 'comment',
                              data: comment,
                              date: commentDate
                            });
                          } else {
                            console.warn('Invalid comment date:', comment.created_at);
                          }
                        }
                      });
                    }
                    
                    // Ordenar por data (mais recente primeiro)
                    allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
                    
                    if (allEvents.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Nenhuma atividade registrada</p>
                        </div>
                      );
                    }
                    
                    return allEvents.map((event, index) => (
                      <div key={index} className="flex space-x-3 pb-4 border-b last:border-b-0 last:pb-0">
                        <div className="flex-shrink-0">
                          {event.type === 'comment' ? (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Activity className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {event.type === 'comment' ? (
                                <>
                                  <span className="font-medium">
                                    {event.data.author?.name || 'Usuário'}
                                  </span>
                                  <Badge variant={event.data.public ? "default" : "secondary"} className="text-xs">
                                    {event.data.public ? "Público" : "Privado"}
                                  </Badge>
                                </>
                              ) : (
                                <span className="font-medium">
                                  {event.data.audit?.author?.name || 'Sistema'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {safeFormatDate(event.date)}
                            </span>
                          </div>
                          <div className="mt-1">
                            {event.type === 'comment' ? (
                              <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ 
                                  __html: event.data.html_body || event.data.body 
                                }}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {formatEventDescription(event.data)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com informações adicionais */}
          <div className="space-y-6">
            {/* Informações do Solicitante */}
            {(ticketDetails.requester_name || ticketDetails.requester_email) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Solicitante</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ticketDetails.requester_name && (
                      <div>
                        <p className="text-sm font-medium">Nome</p>
                        <p className="text-sm text-muted-foreground">{ticketDetails.requester_name}</p>
                      </div>
                    )}
                    {ticketDetails.requester_email && (
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{ticketDetails.requester_email}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Propriedades do Ticket */}
            <Card>
              <CardHeader>
                <CardTitle>Propriedades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Prioridade</p>
                    <Badge className={getPriorityColor(ticketDetails.priority)}>
                      {ticketDetails.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Categoria</p>
                    <p className="text-sm text-muted-foreground">{ticketDetails.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={getStatusBadge(ticketDetails.status) as any}>
                      {getStatusIcon(ticketDetails.status)}
                      <span className="ml-1">{ticketDetails.status}</span>
                    </Badge>
                  </div>
                  {ticketDetails.zendesk_id && (
                    <div>
                      <p className="text-sm font-medium">ID Zendesk</p>
                      <p className="text-sm text-muted-foreground">#{ticketDetails.zendesk_id}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsPage;