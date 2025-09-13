import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Clock, Users, Target, BarChart3, Eye, MousePointer, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

interface AdvancedUsageAnalyticsProps {
  onBack?: () => void;
}

interface UsageEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_name: string;
  event_properties: any;
  created_at: string;
  duration?: number;
  user_role: string;
  school_id?: string;
}

interface FeatureEngagement {
  feature: string;
  totalTime: number;
  interactions: number;
  uniqueUsers: number;
  engagementScore: number;
  roi: number;
}

interface UserJourney {
  path: string[];
  frequency: number;
  avgDuration: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

const BUSINESS_VALUES = {
  'tickets': 80,
  'dash-financeiro': 100,
  'consultor-agenda': 70,
  'dash-pedagogico': 90,
  'dash-secretaria': 60,
  'market-analysis': 120
};

export default function AdvancedUsageAnalytics({ onBack }: AdvancedUsageAnalyticsProps) {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { toast } = useToast();

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, [dateRange]);

  const fetchAdvancedAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('usage_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar analytics avançados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Feature Engagement Analysis
  const featureEngagement = useMemo((): FeatureEngagement[] => {
    const featureMap = new Map<string, {
      totalTime: number;
      interactions: number;
      users: Set<string>;
    }>();

    events.forEach(event => {
      if (event.event_type === 'feature_interaction' || event.event_name.includes('_')) {
        const feature = event.event_properties?.feature || 
                      event.event_properties?.section || 
                      event.event_name.split('_')[0] || 'unknown';
        
        if (!featureMap.has(feature)) {
          featureMap.set(feature, { totalTime: 0, interactions: 0, users: new Set() });
        }
        
        const data = featureMap.get(feature)!;
        data.totalTime += event.duration || event.event_properties?.duration_seconds || 0;
        data.interactions += 1;
        data.users.add(event.user_id);
      }
    });

    return Array.from(featureMap.entries()).map(([feature, data]) => {
      const engagementScore = Math.min(
        (data.totalTime / 60) * 0.4 + // Time weight
        (data.interactions / 10) * 0.4 + // Interaction weight
        (data.users.size / 5) * 0.2, // User diversity weight
        100
      );
      
      const businessValue = BUSINESS_VALUES[feature as keyof typeof BUSINESS_VALUES] || 50;
      const roi = Math.round((data.totalTime / 60) * businessValue);

      return {
        feature,
        totalTime: data.totalTime,
        interactions: data.interactions,
        uniqueUsers: data.users.size,
        engagementScore: Math.round(engagementScore),
        roi
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  }, [events]);

  // User Journey Analysis
  const userJourneys = useMemo((): UserJourney[] => {
    const journeyMap = new Map<string, { count: number; durations: number[] }>();
    
    // Group events by user and session
    const userSessions = new Map<string, UsageEvent[]>();
    
    events.forEach(event => {
      const sessionKey = `${event.user_id}_${event.event_properties?.session_id || 'default'}`;
      if (!userSessions.has(sessionKey)) {
        userSessions.set(sessionKey, []);
      }
      userSessions.get(sessionKey)!.push(event);
    });

    // Analyze paths within sessions
    userSessions.forEach(sessionEvents => {
      const sortedEvents = sessionEvents.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const path = sortedEvents
        .filter(e => e.event_type === 'click' || e.event_type === 'page_view')
        .map(e => e.event_properties?.section || e.event_name)
        .filter(Boolean);
      
      if (path.length > 1) {
        const pathKey = path.join(' → ');
        const totalDuration = sortedEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
        
        if (!journeyMap.has(pathKey)) {
          journeyMap.set(pathKey, { count: 0, durations: [] });
        }
        
        const data = journeyMap.get(pathKey)!;
        data.count += 1;
        data.durations.push(totalDuration);
      }
    });

    return Array.from(journeyMap.entries())
      .map(([pathKey, data]) => ({
        path: pathKey.split(' → '),
        frequency: data.count,
        avgDuration: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }, [events]);

  // Time Distribution by Feature
  const timeDistribution = useMemo(() => {
    const distribution = featureEngagement.map(fe => ({
      name: fe.feature,
      value: fe.totalTime,
      percentage: (fe.totalTime / featureEngagement.reduce((sum, f) => sum + f.totalTime, 1)) * 100
    }));
    return distribution;
  }, [featureEngagement]);

  // Daily engagement trends
  const dailyTrends = useMemo(() => {
    const dailyMap = new Map<string, { interactions: number; timeSpent: number; users: Set<string> }>();
    
    events.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { interactions: 0, timeSpent: 0, users: new Set() });
      }
      
      const data = dailyMap.get(date)!;
      data.interactions += 1;
      data.timeSpent += event.duration || 0;
      data.users.add(event.user_id);
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        interactions: data.interactions,
        timeSpent: Math.round(data.timeSpent / 60), // Convert to minutes
        uniqueUsers: data.users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando analytics avançados...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Analytics Avançados</h1>
          <p className="text-muted-foreground">Insights detalhados de uso e valor de negócio</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d'] as const).map(range => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(range)}
          >
            {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : '90 dias'}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="journeys">Jornadas</TabsTrigger>
          <TabsTrigger value="business">ROI</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Total de Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{events.length.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(events.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários Únicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(events.map(e => e.user_id)).size}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Top Feature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {featureEngagement[0]?.feature || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Score: {featureEngagement[0]?.engagementScore || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Engagement Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ranking de Engajamento por Funcionalidade
              </CardTitle>
              <CardDescription>
                Baseado em tempo de uso, interações e usuários únicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureEngagement.slice(0, 8).map((feature, index) => (
                <div key={feature.feature} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium capitalize">{feature.feature}</span>
                    </div>
                    <div className="text-right text-sm">
                      <div>Score: {feature.engagementScore}/100</div>
                      <div className="text-muted-foreground">
                        {Math.round(feature.totalTime / 60)}min • {feature.interactions} interações
                      </div>
                    </div>
                  </div>
                  <Progress value={feature.engagementScore} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Time Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Tempo por Funcionalidade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={timeDistribution.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  >
                    {timeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journeys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Jornadas de Usuário Mais Comuns</CardTitle>
              <CardDescription>
                Sequência de navegação mais frequente entre funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userJourneys.slice(0, 10).map((journey, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{journey.frequency} usuários</div>
                      <div>{Math.round(journey.avgDuration / 60)} min médio</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {journey.path.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{step}</Badge>
                        {stepIndex < journey.path.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ROI por Funcionalidade
              </CardTitle>
              <CardDescription>
                Valor estimado gerado baseado no tempo de engajamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={featureEngagement.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'roi' ? `R$ ${value}` : value,
                      name === 'roi' ? 'ROI Estimado' : 'Score de Engajamento'
                    ]}
                  />
                  <Bar dataKey="roi" fill="hsl(var(--primary))" name="roi" />
                  <Bar dataKey="engagementScore" fill="hsl(var(--secondary))" name="engagementScore" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Business Impact Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ROI Total Estimado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {featureEngagement.reduce((sum, f) => sum + f.roi, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Baseado no engajamento dos últimos {dateRange}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Funcionalidade Mais Valiosa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold capitalize">
                  {featureEngagement.sort((a, b) => b.roi - a.roi)[0]?.feature || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ROI: R$ {featureEngagement.sort((a, b) => b.roi - a.roi)[0]?.roi || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Oportunidade de Melhoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold capitalize">
                  {featureEngagement.sort((a, b) => a.engagementScore - b.engagementScore)[0]?.feature || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Score baixo: {featureEngagement.sort((a, b) => a.engagementScore - b.engagementScore)[0]?.engagementScore || 0}/100
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Engajamento Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                    formatter={(value, name) => [
                      value,
                      name === 'interactions' ? 'Interações' : 
                      name === 'timeSpent' ? 'Tempo (min)' : 'Usuários Únicos'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interactions" 
                    stackId="1" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="timeSpent" 
                    stackId="2" 
                    stroke="hsl(var(--secondary))" 
                    fill="hsl(var(--secondary))" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}