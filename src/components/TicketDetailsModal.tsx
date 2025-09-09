import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, CheckCircle, AlertCircle, User, MessageSquare, Settings, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketDetailsModalProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created: string;
  updated: string;
  category: string;
  zendesk_url?: string;
  comments: Comment[];
  audits: Audit[];
}

interface Comment {
  id: number;
  body: string;
  html_body?: string;
  plain_body?: string;
  public: boolean;
  author_id: number;
  author_name: string;
  author_email: string;
  author_role: string;
  created_at: string;
  attachments: any[];
}

interface Audit {
  id: number;
  author_id: number;
  author_name: string;
  author_email: string;
  author_role: string;
  created_at: string;
  events: AuditEvent[];
}

interface AuditEvent {
  type: string;
  field_name?: string;
  previous_value?: any;
  value?: any;
}

const TicketDetailsModal = ({ ticketId, isOpen, onClose }: TicketDetailsModalProps) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicketDetails();
    }
  }, [isOpen, ticketId]);

  const loadTicketDetails = async () => {
    if (!ticketId) return;

    try {
      setLoading(true);
      console.log('🔍 Loading ticket details for:', ticketId);

      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-tickets', {
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        },
        body: {},
        method: 'GET',
        // Pass parameters as URL search params
      });

      // Use URL with query parameters
      const supabaseUrl = 'https://yzlbtfhjohjhnqjbtmjn.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/zendesk-tickets`);
      url.searchParams.set('action', 'get-ticket-details');
      url.searchParams.set('ticketId', ticketId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.message || 'Erro ao carregar detalhes do ticket');
      }

      setTicket(result.ticket);
      console.log('✅ Ticket details loaded:', result.ticket);

    } catch (error) {
      console.error('❌ Error loading ticket details:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes do ticket.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      "Em Andamento": "default" as const,
      "Pendente": "secondary" as const, 
      "Resolvido": "outline" as const
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
    const colors = {
      "Urgente": "text-red-600",
      "Alta": "text-orange-600",
      "Normal": "text-blue-600",
      "Baixa": "text-gray-600"
    };
    return colors[priority as keyof typeof colors] || "text-gray-600";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'agent':
      case 'admin':
        return <Settings className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatEventDescription = (event: AuditEvent) => {
    switch (event.type) {
      case 'Change':
        return `Alterou ${event.field_name} de "${event.previous_value}" para "${event.value}"`;
      case 'Create':
        return 'Ticket criado';
      case 'Comment':
        return 'Adicionou comentário';
      default:
        return `${event.type} - ${event.field_name || 'Ação do sistema'}`;
    }
  };

  // Combine and sort all activities (comments + audits) chronologically
  const getAllActivities = () => {
    if (!ticket) return [];

    const activities: any[] = [];

    // Add comments
    ticket.comments.forEach(comment => {
      activities.push({
        type: 'comment',
        data: comment,
        timestamp: comment.created_at,
        author: comment.author_name,
        author_role: comment.author_role
      });
    });

    // Add audit events
    ticket.audits.forEach(audit => {
      audit.events.forEach(event => {
        if (event.type !== 'Comment') { // Avoid duplicate comment entries
          activities.push({
            type: 'audit',
            data: { ...event, audit_id: audit.id, author_name: audit.author_name },
            timestamp: audit.created_at,
            author: audit.author_name,
            author_role: audit.author_role
          });
        }
      });
    });

    return activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Ticket</span>
            {ticket?.zendesk_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={ticket.zendesk_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir no Zendesk
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando detalhes...</span>
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Ticket Header */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-semibold">{ticket.title}</h3>
                      <p className="text-muted-foreground text-sm">#{ticket.id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadge(ticket.status)} className="flex items-center space-x-1">
                        {getStatusIcon(ticket.status)}
                        <span>{ticket.status}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Prioridade:</span>
                      <p className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Categoria:</span>
                      <p className="font-medium">{ticket.category}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Criado em:</span>
                      <p className="font-medium">
                        {format(new Date(ticket.created), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Atualizado em:</span>
                      <p className="font-medium">
                        {format(new Date(ticket.updated), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <Separator />
                  
                  <div>
                    <span className="font-medium text-muted-foreground">Descrição:</span>
                    <div className="mt-2 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activities Timeline */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Histórico de Atividades
                </h4>
                
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {getAllActivities().map((activity, index) => (
                      <div key={`${activity.type}-${index}`} className="border-l-2 border-muted pl-4 pb-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                            {activity.type === 'comment' ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : (
                              getRoleIcon(activity.author_role)
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{activity.author}</span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.author_role === 'agent' ? 'Agente' : 
                                   activity.author_role === 'admin' ? 'Admin' : 'Usuário'}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            
                            {activity.type === 'comment' ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={activity.data.public ? "default" : "secondary"} className="text-xs">
                                    {activity.data.public ? "Público" : "Privado"}
                                  </Badge>
                                </div>
                                <div className="bg-background border rounded-md p-3">
                                  <div 
                                    className="text-sm"
                                    dangerouslySetInnerHTML={{ 
                                      __html: activity.data.html_body || activity.data.body 
                                    }}
                                  />
                                </div>
                                {activity.data.attachments?.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    📎 {activity.data.attachments.length} anexo(s)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {formatEventDescription(activity.data)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>Não foi possível carregar os detalhes do ticket.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsModal;