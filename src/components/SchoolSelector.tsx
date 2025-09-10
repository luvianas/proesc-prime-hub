import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Settings, School, LogOut, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import ImageCropperDialog from '@/components/ImageCropperDialog';
import MobileActionsMenu from '@/components/MobileActionsMenu';
import AdminDashboard from '@/components/AdminDashboard';

interface SchoolData {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_name?: string;
  proesc_id?: string;
  organization_id?: number;
  created_at: string;
}

const SchoolSelector = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const { selectSchool } = useSchool();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Profile dialog state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>("");
  const [adminCalendarUrl, setAdminCalendarUrl] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar cropper state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");

  useEffect(() => {
    fetchSchools();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("name,email,avatar_url,consultant_whatsapp,consultant_calendar_url")
      .eq("user_id", user.id)
      .single();
      
    if (profile) {
      setProfileName(profile.name ?? "");
      setProfileEmail(profile.email ?? user.email ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setAdminWhatsApp(profile.consultant_whatsapp ?? "");
      setAdminCalendarUrl(profile.consultant_calendar_url ?? "");
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = schools.filter(school =>
        school.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.proesc_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.consultant_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [searchTerm, schools]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('school_customizations')
        .select('*')
        .order('school_name');
      
      if (error) throw error;
      
      setSchools(data || []);
      setFilteredSchools(data || []);
    } catch (error: any) {
      console.error('Error fetching schools:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de escolas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolSelect = (school: SchoolData) => {
    selectSchool({
      id: school.id,
      school_name: school.school_name,
      logo_url: school.logo_url,
      consultant_name: school.consultant_name,
      proesc_id: school.proesc_id,
      organization_id: school.organization_id,
    });
  };

  const openProfile = async () => {
    if (!user) return;
    setProfileDialogOpen(true);
    setLoadingProfile(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("name,email,avatar_url,consultant_whatsapp,consultant_calendar_url")
      .eq("user_id", user.id)
      .single();
    setProfileName(profile?.name ?? "");
    setProfileEmail(profile?.email ?? user.email ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
    setAdminWhatsApp(profile?.consultant_whatsapp ?? "");
    setAdminCalendarUrl(profile?.consultant_calendar_url ?? "");
    setLoadingProfile(false);
  };

  const handleAvatarChange = async (file: File) => {
    if (!user || !file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
  };

  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!user) return;
    setLoadingProfile(true);
    const path = `${user.id}/${Date.now()}-avatar.png`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: 'image/png' });
    if (uploadError) {
      toast({ title: "Erro ao enviar imagem", description: uploadError.message, variant: "destructive" });
      setLoadingProfile(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = publicUrlData.publicUrl;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setLoadingProfile(false);
    toast({ title: "Foto atualizada" });
  };

  const saveProfile = async () => {
    if (!user) return;
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const updates: { email?: string; password?: string } = {};
      if (profileEmail && profileEmail !== user.email) updates.email = profileEmail;
      if (newPassword) updates.password = newPassword;
      if (updates.email || updates.password) {
        const { error: authErr } = await supabase.auth.updateUser(updates);
        if (authErr) throw authErr;
      }
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ 
          name: profileName, 
          email: profileEmail, 
          avatar_url: avatarUrl, 
          consultant_whatsapp: adminWhatsApp, 
          consultant_calendar_url: adminCalendarUrl 
        })
        .eq("user_id", user.id);
      if (profErr) throw profErr;
      toast({ title: "Perfil atualizado com sucesso" });
      setProfileDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (showAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen auth-background">
      {/* Admin Header */}
      <div className="grid grid-cols-3 items-center p-6 border-b border-border/30 bg-card/90 backdrop-blur-md shadow-elegant">
        <div className="flex items-center gap-6 justify-self-start">
          <div className="w-16 h-16 rounded bg-gradient-primary text-white flex items-center justify-center font-bold hover-scale">
            <Settings className="w-8 h-8" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-gradient">Sistema de Controle</h1>
            <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive border-destructive/20">Administrador</Badge>
          </div>
        </div>
        <div className="justify-self-center">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://app.proesc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Retornar ao Proesc"
                  className="inline-flex items-center justify-center rounded-md px-2 py-1 hover:opacity-80 transition-opacity cursor-pointer hover-scale"
                >
                  <img 
                    src="/lovable-uploads/31be6a89-85b7-486f-b156-ebe5b3557c02.png" 
                    alt="Proesc Prime" 
                    className="h-10 mx-auto"
                    loading="lazy"
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">Retornar ao Proesc</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="justify-self-end flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={openProfile} variant="outline" 
                    className="rounded-full w-12 h-12 p-0 btn-elegant hover-glow">
              <Avatar className="w-10 h-10">
                <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                <AvatarFallback className="bg-gradient-primary text-white">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button onClick={signOut} className="btn-elegant shadow-elegant">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          <div className="md:hidden">
            <MobileActionsMenu onOpenProfile={openProfile} />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/lovable-uploads/31be6a89-85b7-486f-b156-ebe5b3557c02.png"
              alt="Proesc Prime"
              className="h-12"
            />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Seleção de Instituição
          </h1>
          <p className="text-xl text-muted-foreground">
            Escolha uma escola para gerenciar ou acesse o painel administrativo
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => setShowAdmin(true)}
            variant="outline"
            size="lg"
            className="flex-1 h-16 text-lg hover-lift"
          >
            <Settings className="w-6 h-6 mr-3" />
            Painel Administrativo
          </Button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Buscar por escola, ID Proesc ou consultor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-16 text-lg border-glow"
            />
          </div>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-lg">Carregando escolas...</div>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-16">
            <School className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Tente ajustar os termos de busca'
                : 'Aguarde o cadastro das primeiras escolas no sistema'
              }
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <Card
                key={school.id}
                className="card-elegant card-interactive cursor-pointer hover-lift"
                onClick={() => handleSchoolSelect(school)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={`Logo ${school.school_name}`}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight text-gradient line-clamp-2">
                        {school.school_name}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {school.proesc_id && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          ID: {school.proesc_id}
                        </Badge>
                      </div>
                    )}
                    
                    {school.consultant_name && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Consultor:</span> {school.consultant_name}
                      </div>
                    )}
                    
                    {school.organization_id && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Org ID:</span> {school.organization_id}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Cadastrado em: {new Date(school.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Meu Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar">Foto do perfil</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && handleAvatarChange(e.target.files[0])}
                  disabled={loadingProfile}
                />
                <p className="text-xs text-muted-foreground mt-1">Use uma imagem quadrada (PNG ou JPG).</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={adminWhatsApp} onChange={(e) => setAdminWhatsApp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar">URL do Calendário</Label>
                <Input id="calendar" value={adminCalendarUrl} onChange={(e) => setAdminCalendarUrl(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropperDialog open={cropOpen} onOpenChange={setCropOpen} imageSrc={cropSrc} onConfirm={uploadCroppedAvatar} />
    </div>
  );
};

export default SchoolSelector;