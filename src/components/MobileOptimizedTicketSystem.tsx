import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MessageSquare, Clock, User } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface MobileOptimizedTicketSystemProps {
  tickets: Ticket[];
  onBack?: () => void;
  onCreateTicket?: () => void;
  onSelectTicket?: (ticket: Ticket) => void;
}

const MobileOptimizedTicketSystem: React.FC<MobileOptimizedTicketSystemProps> = ({
  tickets,
  onBack,
  onCreateTicket,
  onSelectTicket
}) => {
  const { isMobile } = useBreakpoint();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-hero overflow-safe">
      <div className="container mx-auto spacing-mobile space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="mobile-touch-target"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-responsive-lg font-semibold">Tickets de Suporte</h1>
          </div>
          
          {onCreateTicket && (
            <Button
              onClick={onCreateTicket}
              className="mobile-touch-target btn-elegant"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isMobile ? 'Novo' : 'Novo Ticket'}
            </Button>
          )}
        </div>

        {/* Tickets List */}
        <div className="space-y-3 sm:space-y-4">
          {tickets.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="spacing-mobile text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-responsive-base font-medium mb-2">Nenhum ticket encontrado</h3>
                <p className="text-responsive-xs text-muted-foreground">
                  Crie seu primeiro ticket de suporte para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="card-elegant card-interactive cursor-pointer mobile-touch-target"
                onClick={() => onSelectTicket?.(ticket)}
              >
                <CardHeader className="spacing-mobile pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-responsive-base truncate">
                        #{ticket.id.slice(-6)} - {ticket.title}
                      </CardTitle>
                      <CardDescription className="text-responsive-xs mt-1">
                        {ticket.description.length > 100 
                          ? `${ticket.description.substring(0, 100)}...`
                          : ticket.description
                        }
                      </CardDescription>
                    </div>
                    
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(ticket.priority)}`} />
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-1 ${getStatusColor(ticket.status)}`}
                      >
                        {ticket.status === 'open' ? 'Aberto' :
                         ticket.status === 'in_progress' ? 'Em Progresso' : 'Fechado'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="spacing-mobile pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Prioridade {ticket.priority}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileOptimizedTicketSystem;