
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Search, Clock, CheckCircle, AlertCircle, ExternalLink, Loader2, User, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import TicketDetailsPage from "./TicketDetailsPage";

interface TicketSystemProps {
  onBack: () => void;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created: string;
  category: string;
  zendesk_id?: number;
  zendesk_url?: string;
  requester_name?: string;
  requester_email?: string;
}

const TicketSystem = ({ onBack }: TicketSystemProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTicket, setNewTicket] = useState({ title: "", description: "", priority: "normal" });
  
  // Filtros e paginação
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [requesterFilter, setRequesterFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"status" | "date">("status");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [schoolInfo, setSchoolInfo] = useState<{
    schoolName?: string;
    schoolId?: string;
    userWithoutSchool?: boolean;
    organizationNotConfigured?: boolean;
    searchInfo?: any;
  }>({});
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    email?: string;
    role?: string;
    school_id?: string;
  }>({});
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadTickets();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, role, school_id')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        
        // Load school name if user has school_id
        if (profile.school_id) {
          const { data: schoolCustomization } = await supabase
            .from('school_customizations')
            .select('school_name')
            .eq('school_id', profile.school_id)
            .single();
          
          setSchoolInfo({
            schoolName: schoolCustomization?.school_name,
            schoolId: profile.school_id,
            userWithoutSchool: false
          });
        } else {
          setSchoolInfo({
            userWithoutSchool: profile.role !== 'admin',
            schoolId: undefined
          });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      console.log('📨 TicketSystem: Carregando tickets...');
      
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-tickets', {
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        console.error('❌ TicketSystem: Erro na chamada da função:', error);
        toast({
          title: "Erro ao carregar tickets",
          description: "Não foi possível conectar com o sistema de tickets. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Handle specific error cases from the function
      if (data?.error) {
        console.error('❌ TicketSystem: Erro retornado pela função:', data);
        
        const errorId = data.error_id ? ` (ID: ${data.error_id})` : '';
        
        switch (data.error) {
          case 'user_without_school':
            setSchoolInfo(prev => ({ 
              ...prev, 
              userWithoutSchool: true 
            }));
            toast({
              title: "Usuário sem escola associada",
              description: `Entre em contato com o administrador para associar sua conta a uma escola.${errorId}`,
              variant: "destructive",
            });
            break;
            
          case 'organization_id_not_configured':
            setSchoolInfo(prev => ({ 
              ...prev, 
              organizationNotConfigured: true 
            }));
            toast({
              title: "Organização Zendesk não configurada",
              description: `O ID da organização no Zendesk não foi configurado para esta escola.${errorId}`,
              variant: "destructive",
            });
            break;
            
          case 'missing_api_token':
          case 'missing_subdomain':
          case 'missing_email':
            toast({
              title: "Configuração incompleta",
              description: `As credenciais do Zendesk não estão configuradas. Entre em contato com o suporte técnico.${errorId}`,
              variant: "destructive",
            });
            break;
            
          case 'zendesk_api_error':
            toast({
              title: "Erro na API do Zendesk",
              description: `${data.message || "Erro ao consultar a API do Zendesk. Tente novamente mais tarde."}${errorId}`,
              variant: "destructive",
            });
            break;
            
          case 'fetch_failed':
            toast({
              title: "Erro de conexão",
              description: `Não foi possível conectar com o Zendesk. Verifique sua conexão.${errorId}`,
              variant: "destructive",
            });
            break;
            
          case 'internal_server_error':
            toast({
              title: "Erro interno do servidor",
              description: `${data.details || "Erro interno do servidor."}${errorId}`,
              variant: "destructive",
            });
            break;
            
          default:
            toast({
              title: "Erro desconhecido",
              description: `${data.message || "Erro inesperado ao carregar tickets."}${errorId}`,
              variant: "destructive",
            });
        }
        
        setTickets([]);
        return;
      }

      // Success case
      console.log('✅ TicketSystem: Tickets carregados com sucesso:', data?.tickets?.length || 0);
      const loadedTickets = data?.tickets || [];
      setAllTickets(loadedTickets);
      setTickets(loadedTickets);
      
      // Set school info from response
      if (data?.organization_id || data?.school_name || data?.user_role) {
        setSchoolInfo(prev => ({ 
          ...prev, 
          searchInfo: {
            organization_id: data.organization_id,
            school_name: data.school_name,
            user_role: data.user_role,
            total_results: data?.total_count || data?.tickets?.length || 0
          }
        }));
      }
      
    } catch (error) {
      console.error('💥 TicketSystem: Erro inesperado:', error);
      toast({
        title: "Erro interno",
        description: "Erro na comunicação com o sistema de tickets. Tente recarregar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e descrição do ticket.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      
      // Enviar email diretamente para contato@proesc.com
      const { data, error } = await supabase.functions.invoke('send-ticket-email', {
        body: { 
          title: newTicket.title,
          description: newTicket.description,
          priority: newTicket.priority,
          userEmail: userProfile.email,
          userName: userProfile.name,
          schoolName: schoolInfo.schoolName
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Ticket enviado",
        description: "Seu ticket foi enviado por email para nossa equipe de suporte.",
      });

      setNewTicket({ title: "", description: "", priority: "normal" });
      setShowNewTicket(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Erro ao enviar ticket",
        description: "Não foi possível enviar o ticket. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const [allTickets, setAllTickets] = useState<Ticket[]>([]);

  // Função para ordenar tickets por status e data
  const sortTickets = (ticketsList: Ticket[]) => {
    const statusOrder = {
      "Em Andamento": 1, // Aberto
      "Pendente": 2,
      "Resolvido": 3  // Fechado
    };

    return [...ticketsList].sort((a, b) => {
      if (sortBy === "status") {
        // Primeiro por status
        const statusA = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] || 999;
        
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        // Depois por data (mais recente primeiro)
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      } else {
        // Ordenação apenas por data
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      }
    });
  };

  // Função para filtrar e paginar tickets
  const getFilteredAndPaginatedTickets = () => {
    let filtered = allTickets;

    // Aplicar busca por texto
    if (searchQuery.trim()) {
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.id.includes(searchQuery) ||
        ticket.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requester_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requester_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Filtrar por solicitante
    if (requesterFilter !== "all") {
      filtered = filtered.filter(ticket => 
        ticket.requester_name === requesterFilter || 
        ticket.requester_email === requesterFilter
      );
    }

    // Filtrar por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.category === typeFilter);
    }

    // Ordenar
    const sorted = sortTickets(filtered);

    // Paginar
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = sorted.slice(startIndex, endIndex);

    return {
      tickets: paginated,
      totalTickets: sorted.length,
      totalPages: Math.ceil(sorted.length / itemsPerPage)
    };
  };

  // Obter listas únicas para filtros
  const getUniqueRequesters = () => {
    const requesters = new Set<string>();
    allTickets.forEach(ticket => {
      if (ticket.requester_name) requesters.add(ticket.requester_name);
      if (ticket.requester_email) requesters.add(ticket.requester_email);
    });
    return Array.from(requesters).sort();
  };

  const getUniqueTypes = () => {
    const types = new Set(allTickets.map(ticket => ticket.category));
    return Array.from(types).sort();
  };

  const getUniqueStatuses = () => {
    const statuses = new Set(allTickets.map(ticket => ticket.status));
    return Array.from(statuses).sort();
  };

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, requesterFilter, typeFilter, searchQuery, sortBy]);

  const searchTickets = () => {
    // A busca agora é feita automaticamente através dos filtros
    setCurrentPage(1);
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

  const openTicketDetails = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setShowTicketDetails(true);
  };

  const closeTicketDetails = () => {
    setSelectedTicketId(null);
    setShowTicketDetails(false);
  };



  // Se estiver mostrando detalhes, renderizar a página de detalhes
  if (showTicketDetails && selectedTicketId) {
    return (
      <TicketDetailsPage 
        ticketId={selectedTicketId} 
        onBack={closeTicketDetails}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#ca8619' }}>Sistema de Tickets</h2>
            <p className="text-gray-600">Acompanhe e gerencie seus tickets de suporte</p>
            
            {schoolInfo.schoolName && (
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-sm">
                  🏫 {schoolInfo.schoolName}
                </Badge>
                {userRole === 'admin' && (
                  <Badge variant="secondary" className="text-xs">
                    Administrador
                  </Badge>
                )}
              </div>
            )}
            {schoolInfo.userWithoutSchool && (
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="destructive" className="text-sm">
                  ⚠️ Usuário sem escola associada
                </Badge>
              </div>
            )}
            {schoolInfo.organizationNotConfigured && (
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="destructive" className="text-sm">
                  ⚠️ Organização Zendesk não configurada
                </Badge>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => setShowNewTicket(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Novo Ticket</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar tickets..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={searchTickets} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {getUniqueStatuses().map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={requesterFilter} onValueChange={setRequesterFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Solicitante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos solicitantes</SelectItem>
              {getUniqueRequesters().map(requester => (
                <SelectItem key={requester} value={requester}>
                  {requester.includes("@") ? requester.split("@")[0] : requester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {getUniqueTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: "status" | "date") => setSortBy(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status e Data</SelectItem>
              <SelectItem value="date">Data de criação</SelectItem>
            </SelectContent>
          </Select>
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
            <Input 
              placeholder="Título do ticket" 
              value={newTicket.title}
              onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
            />
            <Textarea 
              placeholder="Descreva detalhadamente sua solicitação..." 
              rows={4}
              value={newTicket.description}
              onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewTicket(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={createTicket} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando tickets...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const { tickets: paginatedTickets, totalTickets, totalPages } = getFilteredAndPaginatedTickets();
            
            return (
              <>
                {/* Header de resultados */}
                {totalTickets > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalTickets)} de {totalTickets} tickets
                    </p>
                  </div>
                )}

                {paginatedTickets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum ticket encontrado</p>
                
                {schoolInfo.userWithoutSchool ? (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      Sua conta não está associada a uma escola.
                    </p>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Próximos passos:</strong><br/>
                        Entre em contato com o administrador do sistema para:
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                        <li>• Associar sua conta à escola correta</li>
                        <li>• Configurar permissões de acesso</li>
                        <li>• Acessar tickets da sua instituição</li>
                      </ul>
                    </div>
                  </div>
                ) : schoolInfo.organizationNotConfigured ? (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      A integração com o Zendesk não foi configurada para esta escola.
                    </p>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>Próximos passos:</strong><br/>
                        Entre em contato com o administrador do sistema para:
                      </p>
                      <ul className="text-sm text-orange-700 mt-2 space-y-1">
                        <li>• Configurar o ID da organização no Zendesk</li>
                        <li>• Associar a escola à organização correta no Zendesk</li>
                        <li>• Habilitar a integração para acessar tickets</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Tente uma busca diferente ou' : ''} Crie seu primeiro ticket de suporte.
                    </p>
                    {schoolInfo.searchInfo && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Filtros aplicados:</strong><br/>
                          {schoolInfo.searchInfo.organization_id ? (
                            <>Organização: <code className="bg-blue-100 px-1 rounded">{schoolInfo.searchInfo.organization_id}</code><br/></>
                          ) : (
                            <>Busca global (admin)<br/></>
                          )}
                          Papel: {schoolInfo.searchInfo.user_role}<br/>
                          {schoolInfo.searchInfo.total_results !== undefined && (
                            <>Total encontrado: {schoolInfo.searchInfo.total_results}</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
                ) : (
                  <div className="space-y-4">
                    {paginatedTickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openTicketDetails(ticket.id)}
              >
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
                      {(ticket.requester_name || ticket.requester_email) && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2">
                          <User className="h-4 w-4" />
                          <span>
                            Solicitado por: {ticket.requester_name || 'Usuário'}
                            {ticket.requester_email && ` (${ticket.requester_email})`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-sm text-gray-500">
                        <p>Criado em</p>
                        <p>{new Date(ticket.created).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
                    ))}

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center space-x-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
         </div>
       )}


     </div>
  );
};

export default TicketSystem;
