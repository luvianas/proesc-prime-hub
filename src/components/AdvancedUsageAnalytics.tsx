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

interface SchoolAnalytics {
  school_id: string;
  school_name: string;
  totalEvents: number;
  uniqueUsers: number;
  totalTime: number;
  engagementScore: number;
  topFeatures: { feature: string; count: number }[];
  lastActivity: string;
}

// Features to exclude from metrics (basic navigation, not actual features)
const EXCLUDED_FEATURES = ['gestor', 'admin', 'user', 'home', 'dashboard', 'unknown', 'auth', 'login', 'logout'];

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
  const [schoolsMap, setSchoolsMap] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  // Helper function to extract duration from events
  const getEventDuration = (event: UsageEvent): number => {
    return event.duration || 
           event.event_properties?.time_spent_seconds || 
           event.event_properties?.duration_seconds ||
           event.event_properties?.time_on_previous_section ||
           0;
  };

  // Helper function to extract feature name from events
  const getFeatureName = (event: UsageEvent): string => {
    // Priority order for feature name extraction
    if (event.event_properties?.to_section && 
        event.event_properties.to_section.startsWith('dash-')) {
      return event.event_properties.to_section;
    }
    
    if (event.event_properties?.section && 
        event.event_properties.section.startsWith('dash-')) {
      return event.event_properties.section;
    }
    
    if (event.event_properties?.feature) {
      return event.event_properties.feature;
    }
    
    if (event.event_properties?.section) {
      return event.event_properties.section;
    }
    
    if (event.event_name.includes('_')) {
      return event.event_name.split('_')[0];
    }
    
    return event.event_name || 'unknown';
  };

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, [dateRange]);

  const fetchAdvancedAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch schools data first
      const { data: schools, error: schoolsError } = await supabase
        .from('school_customizations')
        .select('school_id, school_name');

      if (schoolsError) throw schoolsError;

      // Create schools lookup map
      const schoolsLookup = new Map(
        (schools || []).map(s => [s.school_id, s.school_name])
      );
      setSchoolsMap(schoolsLookup);

      // Fetch usage events
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
      // Include more event types that represent actual feature usage
      if (event.event_type === 'feature_interaction' || 
          event.event_type === 'time_tracking' ||
          event.event_type === 'page_exit' ||
          event.event_name.includes('_') ||
          (event.event_type === 'click' && event.event_properties?.section)) {
        
        const feature = getFeatureName(event);
        
        // Exclude basic navigation features
        if (EXCLUDED_FEATURES.includes(feature.toLowerCase())) {
          return;
        }
        
        if (!featureMap.has(feature)) {
          featureMap.set(feature, { totalTime: 0, interactions: 0, users: new Set() });
        }
        
        const data = featureMap.get(feature)!;
        data.totalTime += getEventDuration(event);
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
      data.timeSpent += getEventDuration(event);
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

  // School Analytics
  const schoolAnalytics = useMemo((): SchoolAnalytics[] => {
    const schoolMap = new Map<string, {
      events: UsageEvent[];
      users: Set<string>;
      features: Map<string, number>;
    }>();

    events.forEach(event => {
      if (!event.school_id) return;
      
      if (!schoolMap.has(event.school_id)) {
        schoolMap.set(event.school_id, {
          events: [],
          users: new Set(),
          features: new Map()
        });
      }
      
      const data = schoolMap.get(event.school_id)!;
      data.events.push(event);
      data.users.add(event.user_id);
      
      const feature = getFeatureName(event);
      
      // Only count non-excluded features
      if (!EXCLUDED_FEATURES.includes(feature.toLowerCase())) {
        data.features.set(feature, (data.features.get(feature) || 0) + 1);
      }
    });

    return Array.from(schoolMap.entries()).map(([school_id, data]) => {
      const totalTime = data.events.reduce((sum, e) => sum + getEventDuration(e), 0);
      const engagementScore = Math.min(
        (totalTime / 3600) * 30 + // Time weight (hours)
        (data.events.length / 100) * 40 + // Event count weight
        (data.users.size / 10) * 30, // User diversity weight
        100
      );

      const topFeatures = Array.from(data.features.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([feature, count]) => ({ feature, count }));

      const lastActivity = data.events.length > 0 
        ? data.events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : '';

      return {
        school_id,
        school_name: schoolsMap.get(school_id) || `Escola ${school_id.slice(-8)}`,
        totalEvents: data.events.length,
        uniqueUsers: data.users.size,
        totalTime,
        engagementScore: Math.round(engagementScore),
        topFeatures,
        lastActivity
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  }, [events, schoolsMap]);

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="journeys">Jornadas</TabsTrigger>
          <TabsTrigger value="business">ROI</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="schools">Escolas</TabsTrigger>
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
                  {Math.round(events.reduce((sum, e) => sum + getEventDuration(e), 0) / 3600)}h
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

        {/* Nova aba de Escolas */}
        <TabsContent value="schools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Escolas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schoolAnalytics.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Escola Mais Ativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {schoolAnalytics[0]?.school_name || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Score: {schoolAnalytics[0]?.engagementScore || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schoolAnalytics.reduce((sum, s) => sum + s.uniqueUsers, 0)}
                </div>
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
                  {Math.round(schoolAnalytics.reduce((sum, s) => sum + s.totalTime, 0) / 3600)}h
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Escolas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ranking de Escolas por Engajamento
              </CardTitle>
              <CardDescription>
                Baseado em eventos, usuários únicos e tempo de uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {schoolAnalytics.slice(0, 10).map((school, index) => (
                <div key={school.school_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{school.school_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {school.uniqueUsers} usuários • {school.totalEvents} eventos
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">Score: {school.engagementScore}/100</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(school.totalTime / 60)} min totais
                      </div>
                    </div>
                  </div>
                  
                  <Progress value={school.engagementScore} className="h-2 mb-3" />
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Top funcionalidades:</span>
                    {school.topFeatures.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature.feature} ({feature.count})
                      </Badge>
                    ))}
                  </div>
                  
                  {school.lastActivity && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Última atividade: {new Date(school.lastActivity).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Gráfico comparativo de escolas */}
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Eventos por Escola</CardTitle>
              <CardDescription>
                Distribuição de atividade entre as escolas mais ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={schoolAnalytics.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="school_name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      value,
                      name === 'totalEvents' ? 'Total de Eventos' : 
                      name === 'uniqueUsers' ? 'Usuários Únicos' : 'Score de Engajamento'
                    ]}
                  />
                  <Bar dataKey="totalEvents" fill="hsl(var(--primary))" name="totalEvents" />
                  <Bar dataKey="uniqueUsers" fill="hsl(var(--secondary))" name="uniqueUsers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por escolas - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Uso por Escola</CardTitle>
              <CardDescription>
                Percentual de eventos por escola
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={schoolAnalytics.slice(0, 6).map(school => ({
                      name: school.school_name,
                      value: school.totalEvents,
                      percentage: (school.totalEvents / schoolAnalytics.reduce((sum, s) => sum + s.totalEvents, 1)) * 100
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  >
                    {schoolAnalytics.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}