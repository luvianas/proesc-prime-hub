
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Search, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface TicketSystemProps {
  onBack: () => void;
}

const TicketSystem = ({ onBack }: TicketSystemProps) => {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [tickets] = useState([
    {
      id: "TK-001",
      title: "Problema na integração do sistema financeiro",
      description: "Dashboard financeira não está carregando os dados atualizados",
      status: "Em Andamento",
      priority: "Alta",
      created: "2024-01-15",
      category: "Técnico"
    },
    {
      id: "TK-002",
      title: "Solicitação de novo relatório",
      description: "Necessário criar relatório personalizado de matrículas por período",
      status: "Pendente",
      priority: "Média",
      created: "2024-01-14",
      category: "Solicitação"
    },
    {
      id: "TK-003",
      title: "Erro no agendamento",
      description: "Sistema não está permitindo agendamentos para próxima semana",
      status: "Resolvido",
      priority: "Baixa",
      created: "2024-01-10",
      category: "Bug"
    }
  ]);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sistema de Tickets</h2>
            <p className="text-gray-600">Acompanhe e gerencie seus tickets de suporte</p>
          </div>
        </div>
        <Button onClick={() => setShowNewTicket(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Novo Ticket</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar tickets..." className="pl-10" />
        </div>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Criar Novo Ticket</CardTitle>
            <CardDescription>Descreva seu problema ou solicitação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Título do ticket" />
            <Textarea placeholder="Descreva detalhadamente sua solicitação..." rows={4} />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setShowNewTicket(false)}>
                Criar Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{ticket.id}</Badge>
                    <Badge variant={getStatusBadge(ticket.status) as any}>
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1">{ticket.status}</span>
                    </Badge>
                    <Badge variant="secondary">{ticket.category}</Badge>
                  </div>
                  <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  <CardDescription>{ticket.description}</CardDescription>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Criado em</p>
                  <p>{new Date(ticket.created).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TicketSystem;
