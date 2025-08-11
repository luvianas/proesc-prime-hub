import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Settings, Trash2, School, Edit3, Minimize2, Maximize2, User, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import BannersManager from '@/components/BannersManager';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import ImageCropperDialog from '@/components/ImageCropperDialog';
interface User {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'gestor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  school_id?: string;
  avatar_url?: string;
  consultant_calendar_url?: string;
  consultant_whatsapp?: string;
}

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

interface SchoolCustomization {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_id?: string;
  zendesk_integration_url?: string;
  metabase_integration_url?: string;
  dashboard_links?: any;
  created_at: string;
  updated_at: string;
  created_by: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [schools, setSchools] = useState<SchoolCustomization[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSchoolDialogOpen, setEditSchoolDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolCustomization | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'gestor' as 'admin' | 'gestor',
    schoolId: ''
  });
  const [newSchool, setNewSchool] = useState({
    school_name: '',
    logo_url: '',
    consultant_id: '',
    zendesk_integration_url: '',
    metabase_integration_url: '',
    dashboard_links: {
      financeiro: '',
      agenda: '',
      secretaria: '',
      pedagogico: ''
    }
  });

  // Admin profile states
  const [adminProfile, setAdminProfile] = useState({
    name: '',
    email: '',
    avatar_url: '',
    consultant_whatsapp: '',
    consultant_calendar_url: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Delete school states
  const [deleteSchoolDialogOpen, setDeleteSchoolDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolCustomization | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletingSchool, setDeletingSchool] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const TEMP_SUPABASE_URL = "https://yzlbtfhjohjhnqjbtmjn.supabase.co";
  const TEMP_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bGJ0Zmhqb2hqaG5xamJ0bWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjI4MzgsImV4cCI6MjA2OTk5ODgzOH0.wfdPLyebymkk34wW6GVm-fzq9zLO9-4xJQDSf3zEnTY";

  // Upload states for images
  const [uploadingLogoNew, setUploadingLogoNew] = useState(false);
  const [uploadingLogoEdit, setUploadingLogoEdit] = useState(false);

  // Banner upload dialog state
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerScope, setBannerScope] = useState<'global' | 'school'>('global');
  const [bannerSchoolId, setBannerSchoolId] = useState<string>('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannersReloadKey, setBannersReloadKey] = useState(0);
  
  // Additional states for consultant preview
  const [consultantPreview, setConsultantPreview] = useState<any>(null);

  // Avatar cropper state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>('');
  const uploadImage = async (file: File, folder: string) => {
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${folder}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('school-assets').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Falha no upload da imagem',
        variant: 'destructive',
      });
      return null;
    }
  };

  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!user || !blob) return;
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
    setAdminProfile(prev => ({ ...prev, avatar_url: url }));
    setLoadingProfile(false);
    toast({ title: "Foto atualizada" });
  };

  const openAdminProfile = async () => {
    if (!user) return;
    setProfileDialogOpen(true);
    setLoadingProfile(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("name,email,avatar_url,consultant_whatsapp,consultant_calendar_url")
      .eq("user_id", user.id)
      .single();
    setAdminProfile({
      name: profile?.name ?? "",
      email: profile?.email ?? user.email ?? "",
      avatar_url: profile?.avatar_url ?? "",
      consultant_whatsapp: profile?.consultant_whatsapp ?? "",
      consultant_calendar_url: profile?.consultant_calendar_url ?? ""
    });
    setLoadingProfile(false);
  };

  const saveAdminProfile = async () => {
    if (!user) return;
    if (adminNewPassword && adminNewPassword !== adminConfirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const updates: { email?: string; password?: string } = {};
      if (adminProfile.email && adminProfile.email !== user.email) updates.email = adminProfile.email;
      if (adminNewPassword) updates.password = adminNewPassword;
      if (updates.email || updates.password) {
        const { error: authErr } = await supabase.auth.updateUser(updates);
        if (authErr) throw authErr;
      }
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ 
          name: adminProfile.name, 
          email: adminProfile.email, 
          avatar_url: adminProfile.avatar_url,
          consultant_whatsapp: adminProfile.consultant_whatsapp,
          consultant_calendar_url: adminProfile.consultant_calendar_url
        })
        .eq("user_id", user.id);
      if (profErr) throw profErr;
      toast({ title: "Perfil atualizado com sucesso" });
      setProfileDialogOpen(false);
      setAdminNewPassword("");
      setAdminConfirmPassword("");
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

  const handleBannerUpload = async () => {
    try {
      if (!bannerFile) {
        toast({ title: 'Selecione uma imagem', variant: 'destructive' });
        return;
      }
      if (!['image/png', 'image/jpeg'].includes(bannerFile.type)) {
        toast({ title: 'Formato inválido', description: 'Envie JPG ou PNG.', variant: 'destructive' });
        return;
      }
      if (bannerScope === 'school' && !bannerSchoolId) {
        toast({ title: 'Selecione a escola', variant: 'destructive' });
        return;
      }

      setUploadingBanner(true);
      
      const { data: userData } = await supabase.auth.getUser();
      const imageUrl = await uploadImage(bannerFile, 'banners');
      if (!imageUrl) return;

      const bannerData = {
        image_url: imageUrl,
        is_global: bannerScope === 'global',
        school_id: bannerScope === 'school' ? bannerSchoolId : null,
        created_by: userData.user?.id ?? null,
      };
      
      const { data: insertResult, error } = await supabase
        .from('school_banners')
        .insert([bannerData])
        .select();
        
      if (error) throw error;

      toast({ title: 'Banner enviado com sucesso' });
      setBannersReloadKey((k) => k + 1);
      setBannerDialogOpen(false);
      setBannerFile(null);
      setBannerSchoolId('');
      setBannerScope('global');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao enviar banner', variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const fetchConsultantPreview = async (consultantId: string) => {
    if (!consultantId) {
      setConsultantPreview(null);
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('name, consultant_whatsapp, consultant_calendar_url, avatar_url')
      .eq('id', consultantId)
      .single();
    
    if (error) {
      console.error('Error fetching consultant:', error);
      setConsultantPreview(null);
      return;
    }
    
    setConsultantPreview(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editSchoolDialogOpen && editingSchool?.consultant_id) {
      fetchConsultantPreview(editingSchool.consultant_id);
    }
  }, [editSchoolDialogOpen, editingSchool?.consultant_id]);

  const fetchData = async () => {
    try {
      const [usersResponse, environmentsResponse, schoolsResponse, adminUsersResponse] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('environments').select('*').order('created_at', { ascending: false }),
        supabase.from('school_customizations').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, name, email').eq('role', 'admin').order('name')
      ]);
      if (usersResponse.data) setUsers(usersResponse.data);
      if (environmentsResponse.data) setEnvironments(environmentsResponse.data);
      if (schoolsResponse.data) setSchools(schoolsResponse.data);
      if (adminUsersResponse.data) setAdminUsers(adminUsersResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createSchool = async () => {
    if (!newSchool.school_name.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Nome da Escola é obrigatório.', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase.from('school_customizations').insert([{
        school_name: newSchool.school_name,
        logo_url: newSchool.logo_url,
        consultant_id: newSchool.consultant_id || null,
        zendesk_integration_url: newSchool.zendesk_integration_url,
        metabase_integration_url: newSchool.metabase_integration_url,
        dashboard_links: newSchool.dashboard_links,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }]).select().single();
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Escola criada com sucesso!"
      });
      setSchoolDialogOpen(false);
      setNewSchool({
        school_name: '',
        logo_url: '',
        consultant_id: '',
        zendesk_integration_url: '',
        metabase_integration_url: '',
        dashboard_links: {
          financeiro: '',
          agenda: '',
          secretaria: '',
          pedagogico: ''
        }
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar escola",
        variant: "destructive"
      });
    }
  };

  const createUser = async () => {
    try {
      setLoading(true);
      if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim() || !newUser.role) {
        toast({ title: 'Campos obrigatórios', description: 'Preencha Nome, E-mail, Senha e Tipo de Usuário.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role || 'user'
          }
        }
      });
      if (authError) throw authError;

      if (authData.user && newUser.role === 'gestor' && newUser.schoolId) {
        await supabase.from('profiles').update({
          school_id: newUser.schoolId
        }).eq('user_id', authData.user.id);
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!"
      });
      setDialogOpen(false);
      setNewUser({
        email: '',
        password: '',
        name: '',
        role: 'gestor',
        schoolId: ''
      });
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({
        is_active: !currentStatus
      }).eq('user_id', userId);
      if (error) throw error;
      setUsers(users.map(user => user.user_id === userId ? {
        ...user,
        is_active: !currentStatus
      } : user));
      toast({
        title: "Sucesso",
        description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('delete-auth-user', {
        body: { user_id: userId }
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const resetUserPassword = async (targetUserId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', { body: { user_id: targetUserId } });
      if (error) throw error;
      toast({ title: 'Senha redefinida', description: 'Senha padrão definida e troca obrigatória no próximo login.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao redefinir senha', variant: 'destructive' });
    }
  };

  const openDeleteSchoolDialog = (school: SchoolCustomization) => {
    setSchoolToDelete(school);
    setConfirmEmail('');
    setConfirmPassword('');
    setDeleteSchoolDialogOpen(true);
  };

  const confirmDeleteSchool = async () => {
    if (!schoolToDelete) return;
    try {
      setDeletingSchool(true);
      const tempClient = createClient(TEMP_SUPABASE_URL, TEMP_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({
        email: confirmEmail,
        password: confirmPassword
      });
      if (signInError || !signInData?.user) throw new Error('Credenciais inválidas');
      const { error: delError } = await tempClient.from('school_customizations').delete().eq('id', schoolToDelete.id);
      if (delError) throw delError;
      toast({
        title: 'Sucesso',
        description: 'Escola excluída com sucesso!'
      });
      setSchools(schools.filter(s => s.id !== schoolToDelete.id));
      setDeleteSchoolDialogOpen(false);
      setSchoolToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao excluir escola (verifique permissões).',
        variant: 'destructive'
      });
    } finally {
      setDeletingSchool(false);
    }
  };

  const getUserEnvironment = (userId: string) => {
    return environments.find(env => env.user_id === userId);
  };

  const getSchoolName = (schoolId: string | undefined) => {
    if (!schoolId) return '';
    const school = schools.find(s => s.id === schoolId);
    return school?.school_name || '';
  };

  const getConsultantName = (consultantId: string | undefined) => {
    if (!consultantId) return 'Não atribuído';
    const consultant = users.find(u => u.user_id === consultantId);
    return consultant?.name || 'Não encontrado';
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const editSchool = (school: SchoolCustomization) => {
    setEditingSchool(school);
    setEditSchoolDialogOpen(true);
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase.from('profiles').update({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        school_id: editingUser.role === 'gestor' ? editingUser.school_id : null
      }).eq('user_id', editingUser.user_id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!"
      });
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive"
      });
    }
  };

  const updateSchool = async () => {
    if (!editingSchool) return;
    try {
      const { error } = await supabase.from('school_customizations').update({
        school_name: editingSchool.school_name,
        logo_url: editingSchool.logo_url,
        consultant_id: editingSchool.consultant_id || null,
        zendesk_integration_url: editingSchool.zendesk_integration_url,
        metabase_integration_url: editingSchool.metabase_integration_url,
        dashboard_links: editingSchool.dashboard_links
      }).eq('id', editingSchool.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Escola atualizada com sucesso!"
      });
      setEditSchoolDialogOpen(false);
      setEditingSchool(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar escola",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários e escolas do sistema</p>
        </div>
        {/* Tema e perfil movidos para o cabeçalho global */}
      </div>

      {/* Admin Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Meu Perfil - Admin</DialogTitle>
            <DialogDescription>Gerencie suas informações pessoais e credenciais</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={adminProfile.avatar_url} alt="Foto do perfil" />
                <AvatarFallback>
                  {adminProfile.name?.charAt(0).toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
                <div>
                  <Label htmlFor="avatar">Foto do perfil</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setCropSrc(url);
                      setCropOpen(true);
                    }}
                    disabled={loadingProfile}
                  />
                </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={adminProfile.name} onChange={(e) => setAdminProfile(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={adminProfile.email} onChange={(e) => setAdminProfile(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={adminProfile.consultant_whatsapp} onChange={(e) => setAdminProfile(prev => ({ ...prev, consultant_whatsapp: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar">Link de incorporação da agenda</Label>
                <Input id="calendar" value={adminProfile.consultant_calendar_url} onChange={(e) => setAdminProfile(prev => ({ ...prev, consultant_calendar_url: e.target.value }))} placeholder="https://calendar.google.com/calendar/embed?..." />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input id="password" type="password" value={adminNewPassword} onChange={(e) => setAdminNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input id="confirmPassword" type="password" value={adminConfirmPassword} onChange={(e) => setAdminConfirmPassword(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveAdminProfile} disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>


      {!minimized && (
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="schools">Instituições</TabsTrigger>
              <TabsTrigger value="banners">Novidades</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gerenciar Usuários</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Crie um novo usuário e configure seu ambiente personalizado
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
                      <Input id="name" required value={newUser.name} onChange={e => setNewUser({
                        ...newUser,
                        name: e.target.value
                      })} placeholder="Nome do usuário" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                      <Input id="email" required type="email" value={newUser.email} onChange={e => setNewUser({
                        ...newUser,
                        email: e.target.value
                      })} placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha <span className="text-destructive">*</span></Label>
                      <Input id="password" required type="password" value={newUser.password} onChange={e => setNewUser({
                        ...newUser,
                        password: e.target.value
                      })} placeholder="Senha" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Tipo de Usuário <span className="text-destructive">*</span></Label>
                      <Select value={newUser.role} onValueChange={(value: 'admin' | 'gestor') => setNewUser({
                        ...newUser,
                        role: value
                      })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newUser.role === 'gestor' && (
                      <div className="space-y-2">
                        <Label htmlFor="school">Escola</Label>
                        <Select value={newUser.schoolId} onValueChange={value => setNewUser({
                          ...newUser,
                          schoolId: value
                        })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a escola" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map(school => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.school_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <Button onClick={createUser} className="w-full" disabled={loading}>
                      {loading ? 'Criando...' : 'Criar Usuário'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Usuários ({users.length})
                </CardTitle>
                <CardDescription>
                  Lista de todos os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center mb-4">
                  <Input 
                    placeholder="Procurar usuários (nome, email, função, escola)" 
                    value={userSearch} 
                    onChange={e => setUserSearch(e.target.value)} 
                  />
                </div>

                <div className="space-y-4">
                  {users.filter(u => {
                    const q = userSearch.trim().toLowerCase();
                    if (!q) return true;
                    const roleLabel = u.role;
                    const schoolName = u.role === 'gestor' && u.school_id ? getSchoolName(u.school_id).toLowerCase() : '';
                    return u.name.toLowerCase().includes(q) || 
                           u.email.toLowerCase().includes(q) || 
                           roleLabel.toLowerCase().includes(q) || 
                           schoolName.includes(q);
                  }).map(user => {
                    const environment = getUserEnvironment(user.user_id);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || ''} alt={`Foto de ${user.name}`} />
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.name}</p>
                              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'gestor' ? 'secondary' : 'outline'}>
                                {user.role === 'admin' ? 'Admin' : user.role === 'gestor' ? 'Gestor' : 'Usuário'}
                              </Badge>
                              <Badge variant={user.is_active ? 'default' : 'destructive'}>
                                {user.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.role === 'gestor' && user.school_id && (
                              <p className="text-xs text-muted-foreground">
                                Escola: {getSchoolName(user.school_id)}
                              </p>
                            )}
                            {environment && (
                              <p className="text-xs text-muted-foreground">
                                Ambiente: {environment.name}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => editUser(user)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Switch 
                            checked={user.is_active} 
                            onCheckedChange={() => toggleUserStatus(user.user_id, user.is_active)} 
                            disabled={user.role === 'admin'} 
                          />
                          <Button variant="secondary" size="sm" onClick={() => resetUserPassword(user.user_id)} title="Redefinir senha">
                            <Key className="w-4 h-4" />
                          </Button>
                          {user.role !== 'admin' && (
                            <Button variant="destructive" size="sm" onClick={() => deleteUser(user.user_id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schools" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gerenciar Escolas</h2>
              <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Escola
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Escola</DialogTitle>
                    <DialogDescription>
                      Configure as personalizações da escola para os gestores
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Nome da Escola <span className="text-destructive">*</span></Label>
                      <Input 
                        id="schoolName" 
                        required
                        value={newSchool.school_name} 
                        onChange={e => setNewSchool({
                          ...newSchool,
                          school_name: e.target.value
                        })} 
                        placeholder="Nome da escola" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoFile">Logo da Escola</Label>
                      <Input 
                        id="logoFile" 
                        type="file" 
                        accept="image/*" 
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingLogoNew(true);
                          const url = await uploadImage(file, 'logos');
                          setUploadingLogoNew(false);
                          if (url) setNewSchool({
                            ...newSchool,
                            logo_url: url
                          });
                        }} 
                      />
                      {uploadingLogoNew && <p className="text-sm text-muted-foreground">Enviando...</p>}
                      {newSchool.logo_url && <img src={newSchool.logo_url} alt="Logo da escola" className="h-12 rounded" />}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultant_id">Consultor Responsável</Label>
                      <Select
                        value={newSchool.consultant_id}
                        onValueChange={(value) => setNewSchool(prev => ({ ...prev, consultant_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um consultor" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminUsers.map((admin) => (
                            <SelectItem key={admin.user_id} value={admin.user_id}>
                              {admin.name} ({admin.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zendeskUrl">URL Integração Zendesk</Label>
                      <Input 
                        id="zendeskUrl" 
                        value={newSchool.zendesk_integration_url} 
                        onChange={e => setNewSchool({
                          ...newSchool,
                          zendesk_integration_url: e.target.value
                        })} 
                        placeholder="https://escola.zendesk.com" 
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Links dos Dashboards (Metabase)</h4>
                      <div className="space-y-2">
                        <Label htmlFor="dashFinanceiro">Dashboard Financeiro</Label>
                        <Input 
                          id="dashFinanceiro" 
                          value={newSchool.dashboard_links?.financeiro || ''} 
                          onChange={e => setNewSchool({
                            ...newSchool,
                            dashboard_links: {
                              ...newSchool.dashboard_links,
                              financeiro: e.target.value
                            }
                          })} 
                          placeholder="https://metabase.escola.com/public/dashboard/..." 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dashAgenda">Dashboard Agenda</Label>
                        <Input 
                          id="dashAgenda" 
                          value={newSchool.dashboard_links?.agenda || ''} 
                          onChange={e => setNewSchool({
                            ...newSchool,
                            dashboard_links: {
                              ...newSchool.dashboard_links,
                              agenda: e.target.value
                            }
                          })} 
                          placeholder="https://metabase.escola.com/public/dashboard/..." 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dashSecretaria">Dashboard Secretaria</Label>
                        <Input 
                          id="dashSecretaria" 
                          value={newSchool.dashboard_links?.secretaria || ''} 
                          onChange={e => setNewSchool({
                            ...newSchool,
                            dashboard_links: {
                              ...newSchool.dashboard_links,
                              secretaria: e.target.value
                            }
                          })} 
                          placeholder="https://metabase.escola.com/public/dashboard/..." 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dashPedagogico">Dashboard Pedagógico</Label>
                        <Input 
                          id="dashPedagogico" 
                          value={newSchool.dashboard_links?.pedagogico || ''} 
                          onChange={e => setNewSchool({
                            ...newSchool,
                            dashboard_links: {
                              ...newSchool.dashboard_links,
                              pedagogico: e.target.value
                            }
                          })} 
                          placeholder="https://metabase.escola.com/public/dashboard/..." 
                        />
                      </div>
                    </div>
                    <Button onClick={createSchool} className="w-full">
                      Criar Escola
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  Escolas ({schools.length})
                </CardTitle>
                <CardDescription>
                  Lista de todas as escolas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center mb-4">
                  <Input 
                    placeholder="Procurar escolas (nome)" 
                    value={schoolSearch} 
                    onChange={e => setSchoolSearch(e.target.value)} 
                  />
                </div>

                <div className="space-y-4">
                  {schools.filter(s => {
                    const q = schoolSearch.trim().toLowerCase();
                    if (!q) return true;
                    return s.school_name.toLowerCase().includes(q);
                  }).map(school => (
                    <div key={school.id} className="flex items-center justify-between p-4 border rounded-lg">
                       <div className="flex items-center space-x-4">
                         <Avatar className="h-10 w-10">
                           <AvatarImage src={school.logo_url || ''} alt={`Logo ${school.school_name}`} />
                           <AvatarFallback className="bg-primary text-primary-foreground">
                             {school.school_name.charAt(0).toUpperCase()}
                           </AvatarFallback>
                         </Avatar>
                         <div>
                           <p className="font-medium">{school.school_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Consultor: {school.consultant_name || 'Não informado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criado em: {new Date(school.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => editSchool(school)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteSchoolDialog(school)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Enviar Banner</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Enviar Banner</DialogTitle>
                    <DialogDescription>Envie imagens JPG ou PNG e defina o escopo.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Imagem (JPG ou PNG)</Label>
                      <Input type="file" accept="image/png, image/jpeg" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Escopo</Label>
                      <Select value={bannerScope} onValueChange={(v: 'global' | 'school') => setBannerScope(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o escopo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global (todas as escolas)</SelectItem>
                          <SelectItem value="school">Por escola</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bannerScope === 'school' && (
                      <div className="space-y-2">
                        <Label>Escolha a escola</Label>
                        <Select value={bannerSchoolId} onValueChange={(v) => setBannerSchoolId(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a escola" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.school_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setBannerDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleBannerUpload} disabled={uploadingBanner || (bannerScope==='school' && !bannerSchoolId)}>
                        {uploadingBanner ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <BannersManager key={bannersReloadKey} />
          </TabsContent>
        </Tabs>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Modificar informações do usuário selecionado</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nome</Label>
                <Input 
                  id="editName" 
                  value={editingUser.name} 
                  onChange={e => setEditingUser({
                    ...editingUser,
                    name: e.target.value
                  })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input 
                  id="editEmail" 
                  value={editingUser.email} 
                  onChange={e => setEditingUser({
                    ...editingUser,
                    email: e.target.value
                  })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Tipo de Usuário</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value: 'admin' | 'gestor') => setEditingUser({
                    ...editingUser,
                    role: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editingUser.role === 'gestor' && (
                <div className="space-y-2">
                  <Label htmlFor="editSchool">Escola</Label>
                  <Select 
                    value={editingUser.school_id || ''} 
                    onValueChange={value => setEditingUser({
                      ...editingUser,
                      school_id: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a escola" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map(school => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.school_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={updateUser}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={editSchoolDialogOpen} onOpenChange={setEditSchoolDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>Modificar configurações da escola selecionada</DialogDescription>
          </DialogHeader>
          {editingSchool && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editSchoolName">Nome da Escola</Label>
                <Input 
                  id="editSchoolName" 
                  value={editingSchool.school_name} 
                  onChange={e => setEditingSchool({
                    ...editingSchool,
                    school_name: e.target.value
                  })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLogoFile">Logo da Escola</Label>
                <Input 
                  id="editLogoFile" 
                  type="file" 
                  accept="image/*" 
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingLogoEdit(true);
                    const url = await uploadImage(file, 'logos');
                    setUploadingLogoEdit(false);
                    if (url) setEditingSchool({
                      ...editingSchool,
                      logo_url: url
                    });
                  }} 
                />
                {uploadingLogoEdit && <p className="text-sm text-muted-foreground">Enviando...</p>}
                {editingSchool.logo_url && <img src={editingSchool.logo_url} alt="Logo da escola" className="h-12 rounded" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editConsultantId">Consultor Responsável</Label>
                <Select
                  value={editingSchool.consultant_id || ''}
                  onValueChange={(value) => { setEditingSchool(prev => ({ ...prev, consultant_id: value })); fetchConsultantPreview(value); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUsers.map((admin) => (
                      <SelectItem key={admin.user_id} value={admin.user_id}>
                        {admin.name} ({admin.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {consultantPreview && (
                  <div className="mt-3 p-3 border rounded-md text-sm">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={consultantPreview.avatar_url} />
                        <AvatarFallback>{consultantPreview.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{consultantPreview.name}</div>
                        <div className="text-muted-foreground">WhatsApp: {consultantPreview.consultant_whatsapp || '—'}</div>
                        <div className="text-muted-foreground truncate">Agenda: {consultantPreview.consultant_calendar_url || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editZendeskUrl">URL Integração Zendesk</Label>
                <Input 
                  id="editZendeskUrl" 
                  value={editingSchool.zendesk_integration_url || ''} 
                  onChange={e => setEditingSchool({
                    ...editingSchool,
                    zendesk_integration_url: e.target.value
                  })} 
                />
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Links dos Dashboards (Metabase)</h4>
                <div className="space-y-2">
                  <Label htmlFor="editDashFinanceiro">Dashboard Financeiro</Label>
                  <Input 
                    id="editDashFinanceiro" 
                    value={editingSchool.dashboard_links?.financeiro || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        financeiro: e.target.value
                      }
                    })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDashAgenda">Dashboard Agenda</Label>
                  <Input 
                    id="editDashAgenda" 
                    value={editingSchool.dashboard_links?.agenda || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        agenda: e.target.value
                      }
                    })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDashSecretaria">Dashboard Secretaria</Label>
                  <Input 
                    id="editDashSecretaria" 
                    value={editingSchool.dashboard_links?.secretaria || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        secretaria: e.target.value
                      }
                    })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDashPedagogico">Dashboard Pedagógico</Label>
                  <Input 
                    id="editDashPedagogico" 
                    value={editingSchool.dashboard_links?.pedagogico || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        pedagogico: e.target.value
                      }
                    })} 
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditSchoolDialogOpen(false)}>Cancelar</Button>
                <Button onClick={updateSchool}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete School Dialog */}
      <Dialog open={deleteSchoolDialogOpen} onOpenChange={setDeleteSchoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Digite suas credenciais para confirmar a exclusão da escola "{schoolToDelete?.school_name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Email</Label>
              <Input 
                id="confirmEmail" 
                type="email" 
                value={confirmEmail} 
                onChange={e => setConfirmEmail(e.target.value)} 
                placeholder="Seu email" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Senha</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Sua senha" 
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteSchoolDialogOpen(false)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteSchool} 
                disabled={deletingSchool || !confirmEmail || !confirmPassword}
              >
                {deletingSchool ? 'Excluindo...' : 'Excluir Escola'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ImageCropperDialog open={cropOpen} onOpenChange={setCropOpen} imageSrc={cropSrc} onConfirm={uploadCroppedAvatar} />
    </div>
  );
};

export default AdminDashboard;