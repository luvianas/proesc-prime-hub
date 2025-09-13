import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface UsageEvent {
  id: string;
  user_id: string;
  user_role: 'admin' | 'user' | 'gestor';
  school_id: string | null;
  session_id?: string | null;
  event_type: string;
  event_name: string;
  event_properties?: any;
  page?: string | null;
  referrer?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  created_at: string;
}

interface EventsTableProps {
  range: '7d' | '30d';
}

export default function EventsTable({ range }: EventsTableProps) {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [schoolNames, setSchoolNames] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const EVENTS_PER_PAGE = 20;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const days = range === '7d' ? 7 : 30;
      const fromISO = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('usage_events')
        .select('*')
        .gte('created_at', fromISO)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setEvents(data as any);
        // Buscar nomes dos usuários na tabela profiles
        const ids = Array.from(new Set((data as any[]).map((e) => e.user_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: profiles } = await (supabase as any)
            .from('profiles')
            .select('user_id, name')
            .in('user_id', ids);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p: any) => { if (p.user_id) map[p.user_id] = p.name; });
          setUserNames(map);
        } else {
          setUserNames({});
        }
        
        // Buscar nomes das escolas
        const schoolIds = Array.from(new Set((data as any[]).map((e) => e.school_id).filter(Boolean)));
        if (schoolIds.length > 0) {
          const { data: schools } = await supabase
            .from('school_customizations')
            .select('id, school_name')
            .in('id', schoolIds);
          const schoolMap: Record<string, string> = {};
          (schools || []).forEach((s: any) => { if (s.id) schoolMap[s.id] = s.school_name; });
          setSchoolNames(schoolMap);
        } else {
          setSchoolNames({});
        }
      }
      setLoading(false);
    };
    load();
  }, [range]);

  const filtered = useMemo(() => {
    let filteredEvents = events;
    
    // Filtro de texto geral
    const q = filter.trim().toLowerCase();
    if (q) {
      filteredEvents = filteredEvents.filter(e =>
        e.event_type.toLowerCase().includes(q) ||
        e.event_name.toLowerCase().includes(q) ||
        (e.page || '').toLowerCase().includes(q) ||
        (userNames[e.user_id] || '').toLowerCase().includes(q) ||
        (schoolNames[e.school_id || ''] || '').toLowerCase().includes(q)
      );
    }
    
    // Filtro por perfil
    if (profileFilter && profileFilter !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.user_role === profileFilter);
    }
    
    // Filtro por tipo
    if (typeFilter && typeFilter !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.event_type === typeFilter);
    }
    
    // Filtro por escola
    if (schoolFilter && schoolFilter !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.school_id === schoolFilter);
    }
    
    return filteredEvents;
  }, [events, filter, profileFilter, typeFilter, schoolFilter, userNames, schoolNames]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos (mais recentes)</CardTitle>
        <CardDescription>Lista consolidada com identificação do usuário e tipo</CardDescription>
        
        {/* Filtros específicos */}
        <div className="flex flex-wrap gap-3 pt-4">
          <Input 
            placeholder="Buscar eventos..." 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="w-48"
          />
          
          <Select value={profileFilter} onValueChange={setProfileFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Array.from(new Set(events.map(e => e.event_type))).map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Escola" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as escolas</SelectItem>
              {Object.entries(schoolNames).map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(profileFilter && profileFilter !== 'all' || typeFilter && typeFilter !== 'all' || schoolFilter && schoolFilter !== 'all' || filter) && (
            <Button 
              variant="outline" 
              onClick={() => {
                setProfileFilter('all');
                setTypeFilter('all');
                setSchoolFilter('all');
                setFilter('');
                setCurrentPage(1);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Escola</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{userNames[e.user_id] || '—'}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{e.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={e.user_role === 'admin' ? 'default' : e.user_role === 'gestor' ? 'secondary' : 'outline'}>{e.user_role}</Badge></TableCell>
                      <TableCell>{e.event_type}</TableCell>
                      <TableCell className="max-w-[240px] truncate" title={e.event_name}>{e.event_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={e.page || ''}>{e.page}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">{schoolNames[e.school_id || ''] || '-'}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{e.school_id || '-'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Nenhum evento encontrado.</div>
              )}
            </div>
            
            {filtered.length > EVENTS_PER_PAGE && (
              <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Página {currentPage} de {Math.ceil(filtered.length / EVENTS_PER_PAGE)} 
                  ({filtered.length} eventos)
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= Math.ceil(filtered.length / EVENTS_PER_PAGE)}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}