import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

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

const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export default function UsageDashboard() {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Dados de Uso - Admin';
    const desc = 'Métricas e eventos de uso da plataforma (admin)';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', desc);
  }, []);

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
      }
      setLoading(false);
    };
    load();
  }, [range]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e =>
      e.event_type.toLowerCase().includes(q) ||
      e.event_name.toLowerCase().includes(q) ||
      (e.page || '').toLowerCase().includes(q) ||
      (e.user_role || '').toLowerCase().includes(q) ||
      (e.school_id || '').toLowerCase().includes(q)
    );
  }, [events, filter]);

  const byDay = useMemo(() => {
    const days = range === '7d' ? 7 : 30;
    const start = addDays(new Date(), -days + 1);
    const map: Record<string, number> = {};
    for (let i = 0; i < days; i++) map[dateKey(addDays(start, i))] = 0;
    for (const e of filtered) {
      const k = (e.created_at || '').slice(0, 10);
      if (k in map) map[k]++;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [filtered, range]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) map[e.event_type] = (map[e.event_type] || 0) + 1;
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dados de Uso</h2>
          <p className="text-muted-foreground">Eventos e métricas de utilização da plataforma</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Input placeholder="Filtrar por evento, página, perfil, escola" value={filter} onChange={(e)=>setFilter(e.target.value)} />
          <Select value={range} onValueChange={(v: '7d' | '30d') => setRange(v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eventos por dia</CardTitle>
            <CardDescription>Volume diário de eventos</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos por tipo</CardTitle>
            <CardDescription>Distribuição por event_type</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos (mais recentes)</CardTitle>
          <CardDescription>Lista consolidada com identificação do usuário e tipo</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : (
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
                  {filtered.map((e) => (
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
                      <TableCell className="font-mono text-xs">{e.school_id || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Nenhum evento no período selecionado.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
