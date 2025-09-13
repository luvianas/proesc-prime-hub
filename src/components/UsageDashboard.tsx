import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Prime Hub - Admin';
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
      }
      setLoading(false);
    };
    load();
  }, [range]);


  const byDay = useMemo(() => {
    const days = range === '7d' ? 7 : 30;
    const start = addDays(new Date(), -days + 1);
    const map: Record<string, number> = {};
    for (let i = 0; i < days; i++) map[dateKey(addDays(start, i))] = 0;
    for (const e of events) {
      const k = (e.created_at || '').slice(0, 10);
      if (k in map) map[k]++;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [events, range]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) map[e.event_type] = (map[e.event_type] || 0) + 1;
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dados de Uso</h2>
          <p className="text-muted-foreground">Eventos e métricas de utilização da plataforma</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
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

    </div>
  );
}
