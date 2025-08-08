import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Palette, Settings, User, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Environment {
  id: string;
  user_id: string;
  name: string;
  theme_color: string;
  background_image?: string;
  avatar_url?: string;
  settings: any;
  is_active: boolean;
}

const UserDashboard = () => {
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEnvironment();
    }
  }, [user]);

  const fetchEnvironment = async () => {
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setEnvironment(data);
    } catch (error) {
      console.error('Error fetching environment:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ambiente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEnvironment = async () => {
    if (!environment) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('environments')
        .update({
          name: environment.name,
          theme_color: environment.theme_color,
          background_image: environment.background_image,
          avatar_url: environment.avatar_url,
          settings: environment.settings
        })
        .eq('id', environment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ambiente atualizado com sucesso!",
      });
      
      setEditMode(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar ambiente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando seu ambiente...</div>
      </div>
    );
  }

  if (!environment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Ambiente não encontrado</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: environment.background_image 
          ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${environment.background_image})`
          : `linear-gradient(135deg, ${environment.theme_color}20, ${environment.theme_color}10)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{ backgroundColor: environment.theme_color }}
            >
              {environment.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{environment.name}</h1>
              <p className="text-muted-foreground">Bem-vindo ao seu ambiente personalizado</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              <User className="w-4 h-4 mr-1" />
              Usuário
            </Badge>
            <Button
              variant={editMode ? "default" : "outline"}
              onClick={() => setEditMode(!editMode)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {editMode ? 'Cancelar' : 'Configurações'}
            </Button>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de configurações */}
          {editMode && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Personalização
                </CardTitle>
                <CardDescription>
                  Customize seu ambiente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Ambiente</Label>
                  <Input
                    id="name"
                    value={environment.name}
                    onChange={(e) => setEnvironment({
                      ...environment,
                      name: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Cor do Tema</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="theme"
                      type="color"
                      value={environment.theme_color}
                      onChange={(e) => setEnvironment({
                        ...environment,
                        theme_color: e.target.value
                      })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={environment.theme_color}
                      onChange={(e) => setEnvironment({
                        ...environment,
                        theme_color: e.target.value
                      })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="background">URL da Imagem de Fundo</Label>
                  <Input
                    id="background"
                    value={environment.background_image || ''}
                    onChange={(e) => setEnvironment({
                      ...environment,
                      background_image: e.target.value
                    })}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="avatar">URL do Avatar</Label>
                  <Input
                    id="avatar"
                    value={environment.avatar_url || ''}
                    onChange={(e) => setEnvironment({
                      ...environment,
                      avatar_url: e.target.value
                    })}
                    placeholder="https://exemplo.com/avatar.jpg"
                  />
                </div>
                
                <Button 
                  onClick={updateEnvironment} 
                  className="w-full"
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Área principal do usuário */}
          <div className={`${editMode ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bem-vindo ao {environment.name}!</CardTitle>
                  <CardDescription>
                    Este é seu ambiente personalizado. Aqui você pode visualizar e interagir com suas configurações exclusivas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Tema Atual</h3>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: environment.theme_color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {environment.theme_color}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Status</h3>
                      <Badge variant={environment.is_active ? 'default' : 'destructive'}>
                        {environment.is_active ? 'Ambiente Ativo' : 'Ambiente Inativo'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Funcionalidades do Ambiente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className="p-4 rounded-lg text-white"
                      style={{ backgroundColor: environment.theme_color }}
                    >
                      <h3 className="font-semibold mb-2">Personalização</h3>
                      <p className="text-sm opacity-90">
                        Customize cores, temas e aparência do seu ambiente
                      </p>
                    </div>
                    
                    <div 
                      className="p-4 rounded-lg text-white"
                      style={{ backgroundColor: `${environment.theme_color}dd` }}
                    >
                      <h3 className="font-semibold mb-2">Configurações</h3>
                      <p className="text-sm opacity-90">
                        Acesse e modifique suas preferências pessoais
                      </p>
                    </div>
                    
                    <div 
                      className="p-4 rounded-lg text-white"
                      style={{ backgroundColor: `${environment.theme_color}bb` }}
                    >
                      <h3 className="font-semibold mb-2">Isolamento</h3>
                      <p className="text-sm opacity-90">
                        Seu ambiente é completamente isolado e privado
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;