
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Search, Clock, CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

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
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-integration', {
        body: { action: 'list_tickets' },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        console.error('Error loading tickets:', error);
        toast({
          title: "Erro ao carregar tickets",
          description: "Não foi possível carregar os tickets do Zendesk. Verifique a configuração.",
          variant: "destructive",
        });
        return;
      }

      // Handle special cases: user without school or organization not configured
      if (data?.error === 'user_without_school') {
        setSchoolInfo(prev => ({ 
          ...prev, 
          userWithoutSchool: true 
        }));
        toast({
          title: "Usuário sem escola associada",
          description: "Entre em contato com o administrador para associar sua conta a uma escola.",
          variant: "destructive",
        });
        setTickets([]);
        return;
      }

      if (data?.error === 'organization_not_configured') {
        setSchoolInfo(prev => ({ 
          ...prev, 
          organizationNotConfigured: true 
        }));
        toast({
          title: "Organização Zendesk não configurada",
          description: "O ID da organização no Zendesk não foi configurado para esta escola.",
          variant: "destructive",
        });
        setTickets([]);
        return;
      }

      setTickets(data?.tickets || []);
      if (data?.search_info) {
        setSchoolInfo(prev => ({ 
          ...prev, 
          searchInfo: data.search_info 
        }));
      }
      
      // Store debug info for troubleshooting
      if (data?.debug_info) {
        setDebugInfo(data.debug_info);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Erro ao carregar tickets",
        description: "Erro na comunicação com o sistema de tickets.",
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
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-integration', {
        body: { 
          action: 'create_ticket',
          subject: newTicket.title,
          description: newTicket.description,
          priority: newTicket.priority
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Ticket criado",
        description: "Seu ticket foi criado com sucesso no Zendesk.",
      });

      setNewTicket({ title: "", description: "", priority: "normal" });
      setShowNewTicket(false);
      loadTickets(); // Reload tickets
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Erro ao criar ticket",
        description: "Não foi possível criar o ticket. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const searchTickets = async () => {
    if (!searchQuery.trim()) {
      loadTickets();
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-integration', {
        body: { 
          action: 'search_tickets',
          query: searchQuery
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      setTickets(data?.tickets || []);
      if (data?.search_info) {
        setSchoolInfo(prev => ({ 
          ...prev, 
          searchInfo: data.search_info 
        }));
      }
    } catch (error) {
      console.error('Error searching tickets:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar os tickets.",
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

  const testTicketAccess = async () => {
    try {
      setIsTesting(true);
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-integration', {
        body: { 
          action: 'test_ticket_access',
          test_ticket_id: '134449'
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      setTestResults(data);
      toast({
        title: "Teste de acesso concluído",
        description: "Verifique os resultados do teste nas informações de debug.",
      });
    } catch (error) {
      console.error('Error testing ticket access:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível executar o teste de acesso.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getSpecificTicket = async () => {
    try {
      setIsTesting(true);
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zendesk-integration', {
        body: { 
          action: 'get_ticket',
          ticket_id: '134449'
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      if (data?.ticket) {
        toast({
          title: "Ticket 134449 encontrado!",
          description: `"${data.ticket.title}" - Status: ${data.ticket.status}`,
        });
        console.log('Ticket 134449 details:', data.ticket);
      } else {
        toast({
          title: "Ticket não encontrado",
          description: "O ticket 134449 não foi encontrado ou não é acessível.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error getting specific ticket:', error);
      toast({
        title: "Erro ao buscar ticket",
        description: "Não foi possível buscar o ticket específico.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testWithUlbraData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🧪 Testando com dados da Ulbra...');
      
      const { data, error } = await supabase.functions.invoke('zendesk-integration', {
        body: { 
          action: 'list_tickets',
          test_organization_id: '7388230589207',
          test_domain: 'Ulbra.br',
          test_entity: '3487'
        }
      });

      if (error) throw error;
      
      console.log('🧪 Resultado do teste com Ulbra:', data);
      setTickets(data.tickets || []);
      
      toast({
        title: "Teste com Ulbra realizado",
        description: `${data.tickets?.length || 0} tickets encontrados`,
      });
    } catch (error) {
      console.error('❌ Erro no teste com Ulbra:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar com os dados da Ulbra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            
            {/* Teste com dados da Ulbra */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <h3 className="font-medium mb-2">🧪 Teste com Ulbra</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Org ID:</span> 7388230589207
                </div>
                <div>
                  <span className="font-medium">Domínio:</span> Ulbra.br
                </div>
                <div>
                  <span className="font-medium">Entidade:</span> 3487
                </div>
              </div>
              <Button 
                onClick={testWithUlbraData} 
                className="mt-3"
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Testar com dados da Ulbra
              </Button>
            </div>
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
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar tickets..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchTickets()}
          />
        </div>
        <Button onClick={searchTickets} variant="outline">
          <Search className="h-4 w-4" />
        </Button>
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
        <div className="space-y-4">
          {tickets.length === 0 ? (
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
            tickets.map((ticket) => (
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
                        {ticket.zendesk_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(ticket.zendesk_url, '_blank')}
                            className="text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver no Zendesk
                          </Button>
                        )}
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
            ))
          )}
        </div>
      )}

      {/* Debug Section */}
      {(debugInfo || testResults) && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <span>🔧 Informações de Debug</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testTicketAccess}
                  disabled={isTesting}
                >
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Testar Acesso
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={getSpecificTicket}
                  disabled={isTesting}
                >
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buscar Ticket 134449
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? 'Ocultar' : 'Mostrar'} Detalhes
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showDebug && (
            <CardContent className="space-y-4">
              {debugInfo && (
                <div>
                  <h4 className="font-semibold mb-2">🔍 Estratégias de Busca Utilizadas:</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p><strong>Estratégia Bem-sucedida:</strong> {debugInfo.successful_strategy || 'Nenhuma'}</p>
                    <p><strong>Total de Tickets:</strong> {tickets.length}</p>
                    <p><strong>Organização ID:</strong> {debugInfo.organization_id || 'Não definido'}</p>
                    <p><strong>Escola:</strong> {debugInfo.school_name || 'Não definida'}</p>
                    <p><strong>Papel do Usuário:</strong> {debugInfo.user_role}</p>
                    <p><strong>Método de Auth:</strong> {debugInfo.auth_method}</p>
                  </div>
                  
                  {debugInfo.all_attempts && (
                    <div>
                      <h5 className="font-medium mb-2">📋 Tentativas de Busca:</h5>
                      <div className="space-y-2">
                        {debugInfo.all_attempts.map((attempt: any, index: number) => (
                          <div 
                            key={index} 
                            className={`p-2 rounded border-l-4 ${
                              attempt.success 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-orange-500 bg-orange-50'
                            }`}
                          >
                            <p className="font-medium">{attempt.strategy}</p>
                            <p className="text-sm">Status: {attempt.status}</p>
                            <p className="text-sm">Tickets: {attempt.ticket_count || 0}</p>
                            {attempt.error && (
                              <p className="text-sm text-red-600">Erro: {attempt.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {testResults && (
                <div>
                  <h4 className="font-semibold mb-2">🧪 Resultados do Teste (Ticket {testResults.test_ticket_id}):</h4>
                  <div className="space-y-2">
                    {testResults.test_results?.map((result: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded border-l-4 ${
                          result.success 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-red-500 bg-red-50'
                        }`}
                      >
                        <p className="font-medium">{result.test}</p>
                        <p className="text-sm">Status: {result.status}</p>
                        {result.has_ticket && (
                          <p className="text-sm text-green-600">✅ Ticket encontrado!</p>
                        )}
                        {result.found_ticket && (
                          <p className="text-sm text-green-600">✅ Encontrado via busca!</p>
                        )}
                        {result.has_test_ticket && (
                          <p className="text-sm text-green-600">✅ Presente na organização!</p>
                        )}
                        {result.error && (
                          <p className="text-sm text-red-600">Erro: {result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default TicketSystem;
