import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Settings, Trash2, School, Edit3, Minimize2, Maximize2, User, Key, FileText, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import BannersManager from '@/components/BannersManager';
import UsageDashboard from '@/components/UsageDashboard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import ImageCropperDialog from '@/components/ImageCropperDialog';
import { Sidebar, SidebarProvider, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

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
    schoolId: '',
    avatar_url: '',
    consultant_whatsapp: '',
    consultant_calendar_url: ''
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
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerUseDefault, setBannerUseDefault] = useState(true);
  const [bannerDuration, setBannerDuration] = useState<number>(6);
  
  // Additional states for consultant preview
  const [consultantPreview, setConsultantPreview] = useState<any>(null);

  // Avatar cropper state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>('');
  
  // Pagination states
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [currentSchoolPage, setCurrentSchoolPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Sidebar navigation
  const [activeView, setActiveView] = useState('users');

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
        title: bannerTitle || null,
        link_url: bannerLink || null,
        duration_seconds: bannerUseDefault ? null : bannerDuration,
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
      setBannerTitle('');
      setBannerLink('');
      setBannerUseDefault(true);
      setBannerDuration(6);
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
      .or(`id.eq.${consultantId},user_id.eq.${consultantId}`)
      .maybeSingle();
    
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
    document.title = 'Prime Hub - Admin';
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

      // Update additional user info if provided
      if (authData.user && (newUser.avatar_url || newUser.consultant_whatsapp || newUser.consultant_calendar_url)) {
        await supabase.from('profiles').update({
          avatar_url: newUser.avatar_url || null,
          consultant_whatsapp: newUser.consultant_whatsapp || null,
          consultant_calendar_url: newUser.consultant_calendar_url || null
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
        schoolId: '',
        avatar_url: '',
        consultant_whatsapp: '',
        consultant_calendar_url: ''
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
        description: error.message || "Erro ao alterar status do usuário",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const tempClient = createClient(TEMP_SUPABASE_URL, TEMP_SUPABASE_ANON_KEY);
      const { error } = await tempClient.functions.invoke('delete-auth-user', {
        body: { userId }
      });
      if (error) throw error;
      setUsers(users.filter(user => user.user_id !== userId));
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase.from('profiles').update({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        school_id: editingUser.school_id,
        avatar_url: editingUser.avatar_url,
        consultant_whatsapp: editingUser.consultant_whatsapp,
        consultant_calendar_url: editingUser.consultant_calendar_url
      }).eq('user_id', editingUser.user_id);
      if (error) throw error;
      setUsers(users.map(user => user.user_id === editingUser.user_id ? editingUser : user));
      setEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!"
      });
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
      setSchools(schools.map(school => school.id === editingSchool.id ? editingSchool : school));
      setEditSchoolDialogOpen(false);
      setEditingSchool(null);
      setConsultantPreview(null);
      toast({
        title: "Sucesso",
        description: "Escola atualizada com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar escola",
        variant: "destructive"
      });
    }
  };

  const confirmDeleteSchool = async () => {
    if (!schoolToDelete || deletingSchool) return;
    
    try {
      setDeletingSchool(true);
      
      const { error } = await supabase.from('school_customizations')
        .delete()
        .eq('id', schoolToDelete.id);
      
      if (error) throw error;
      
      setSchools(schools.filter(school => school.id !== schoolToDelete.id));
      setDeleteSchoolDialogOpen(false);
      setSchoolToDelete(null);
      setConfirmEmail('');
      setConfirmPassword('');
      
      toast({
        title: "Sucesso",
        description: "Escola excluída com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir escola",
        variant: "destructive"
      });
    } finally {
      setDeletingSchool(false);
    }
  };

  const resetUserPassword = async (userId: string) => {
    try {
      setResetting(true);
      const tempClient = createClient(TEMP_SUPABASE_URL, TEMP_SUPABASE_ANON_KEY);
      const { error } = await tempClient.functions.invoke('reset-user-password', {
        body: { userId }
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Email de reset de senha enviado!"
      });
      setResetDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar senha",
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para acessar esta página.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredSchools = schools.filter(school => 
    school.school_name?.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(
    (currentUserPage - 1) * ITEMS_PER_PAGE,
    currentUserPage * ITEMS_PER_PAGE
  );

  const paginatedSchools = filteredSchools.slice(
    (currentSchoolPage - 1) * ITEMS_PER_PAGE,
    currentSchoolPage * ITEMS_PER_PAGE
  );

  const totalUserPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const totalSchoolPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);

  const sidebarItems = [
    { id: 'users', title: 'Usuários', icon: Users },
    { id: 'schools', title: 'Instituições', icon: School },
    { id: 'banners', title: 'Novidades', icon: FileText },
    { id: 'usage', title: 'Dados de Uso', icon: BarChart3 },
  ];

  const AdminSidebar = () => {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    
    return (
      <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu Administrativo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveView(item.id)}
                      className={activeView === item.id ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!minimized && <AdminSidebar />}
        
        <main className="flex-1">
          {minimized && (
            <div className="flex justify-center p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMinimized(false)}
                className="w-auto"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Painel Admin
              </Button>
            </div>
          )}

          {!minimized && (
            <>
              <header className="sticky top-0 z-40 border-b bg-background">
                <div className="flex h-16 items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <div>
                      <h1 className="text-2xl font-bold">Sistema de Controle - Admin</h1>
                      <p className="text-sm text-muted-foreground">Gerenciar usuários, escolas e novidades</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="ghost" onClick={openAdminProfile}>
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMinimized(true)}
                      className="px-2"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-6">
                {activeView === 'users' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Gerenciar Usuários</h2>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Usuário
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Criar Novo Usuário</DialogTitle>
                            <DialogDescription>
                              Preencha as informações para criar um novo usuário.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="name">Nome</Label>
                              <Input
                                id="name"
                                type="text"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="Nome completo"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">E-mail</Label>
                              <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="usuario@escola.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="password">Senha</Label>
                              <Input
                                id="password"
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="Senha"
                              />
                            </div>
                            <div>
                              <Label htmlFor="role">Tipo de Usuário</Label>
                              <Select value={newUser.role} onValueChange={(value: 'admin' | 'gestor') => setNewUser({ ...newUser, role: value })}>
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
                              <div>
                                <Label htmlFor="school">Escola</Label>
                                <Select value={newUser.schoolId} onValueChange={(value) => setNewUser({ ...newUser, schoolId: value })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a escola" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {schools.map((school) => (
                                      <SelectItem key={school.id} value={school.id}>
                                        {school.school_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label htmlFor="avatar_url">URL do Avatar (opcional)</Label>
                              <Input
                                id="avatar_url"
                                type="url"
                                value={newUser.avatar_url}
                                onChange={(e) => setNewUser({ ...newUser, avatar_url: e.target.value })}
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="consultant_whatsapp">WhatsApp do Consultor (opcional)</Label>
                              <Input
                                id="consultant_whatsapp"
                                type="tel"
                                value={newUser.consultant_whatsapp}
                                onChange={(e) => setNewUser({ ...newUser, consultant_whatsapp: e.target.value })}
                                placeholder="(11) 99999-9999"
                              />
                            </div>
                            <div>
                              <Label htmlFor="consultant_calendar_url">URL da Agenda do Consultor (opcional)</Label>
                              <Input
                                id="consultant_calendar_url"
                                type="url"
                                value={newUser.consultant_calendar_url}
                                onChange={(e) => setNewUser({ ...newUser, consultant_calendar_url: e.target.value })}
                                placeholder="https://calendly.com/..."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={createUser} disabled={loading}>
                              {loading ? 'Criando...' : 'Criar Usuário'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="mb-4">
                      <Input
                        placeholder="Buscar usuários por nome ou email..."
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          setCurrentUserPage(1);
                        }}
                        className="max-w-sm"
                      />
                    </div>

                    <div className="grid gap-4">
                      {paginatedUsers.map((user) => (
                        <Card key={user.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-medium">{user.name}</h3>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                      {user.role}
                                    </Badge>
                                    <Badge variant={user.is_active ? 'default' : 'outline'}>
                                      {user.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setResetDialogOpen(true);
                                  }}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Switch
                                  checked={user.is_active}
                                  onCheckedChange={() => toggleUserStatus(user.user_id, user.is_active)}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteUser(user.user_id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {totalUserPages > 1 && (
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentUserPage(Math.max(1, currentUserPage - 1))}
                          disabled={currentUserPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-3">
                          Página {currentUserPage} de {totalUserPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentUserPage(Math.min(totalUserPages, currentUserPage + 1))}
                          disabled={currentUserPage === totalUserPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'schools' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Gerenciar Instituições</h2>
                      <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Escola
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Criar Nova Escola</DialogTitle>
                            <DialogDescription>
                              Configure uma nova escola com suas personalizações.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="school_name">Nome da Escola</Label>
                              <Input
                                id="school_name"
                                value={newSchool.school_name}
                                onChange={(e) => setNewSchool({ ...newSchool, school_name: e.target.value })}
                                placeholder="Nome da escola"
                              />
                            </div>
                            <div>
                              <Label htmlFor="logo_upload">Logo da Escola</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setUploadingLogoNew(true);
                                      const url = await uploadImage(file, 'logos');
                                      if (url) setNewSchool({ ...newSchool, logo_url: url });
                                      setUploadingLogoNew(false);
                                    }
                                  }}
                                  disabled={uploadingLogoNew}
                                />
                                {uploadingLogoNew && <span className="text-sm text-muted-foreground">Enviando...</span>}
                              </div>
                              {newSchool.logo_url && (
                                <div className="mt-2">
                                  <img src={newSchool.logo_url} alt="Logo preview" className="h-16 w-16 object-contain rounded border" />
                                </div>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="consultant">Consultor Responsável</Label>
                              <Select 
                                value={newSchool.consultant_id} 
                                onValueChange={(value) => {
                                  setNewSchool({ ...newSchool, consultant_id: value });
                                  fetchConsultantPreview(value);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um consultor" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Nenhum consultor</SelectItem>
                                  {adminUsers.map((admin) => (
                                    <SelectItem key={admin.user_id} value={admin.user_id}>
                                      {admin.name} ({admin.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="zendesk_url">URL Zendesk</Label>
                              <Input
                                id="zendesk_url"
                                value={newSchool.zendesk_integration_url}
                                onChange={(e) => setNewSchool({ ...newSchool, zendesk_integration_url: e.target.value })}
                                placeholder="https://escola.zendesk.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="metabase_url">URL Metabase</Label>
                              <Input
                                id="metabase_url"
                                value={newSchool.metabase_integration_url}
                                onChange={(e) => setNewSchool({ ...newSchool, metabase_integration_url: e.target.value })}
                                placeholder="https://metabase.escola.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Links dos Dashboards</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor="financeiro_link" className="text-sm">Financeiro</Label>
                                  <Input
                                    id="financeiro_link"
                                    value={newSchool.dashboard_links.financeiro}
                                    onChange={(e) => setNewSchool({
                                      ...newSchool,
                                      dashboard_links: { ...newSchool.dashboard_links, financeiro: e.target.value }
                                    })}
                                    placeholder="URL do dashboard financeiro"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="agenda_link" className="text-sm">Agenda</Label>
                                  <Input
                                    id="agenda_link"
                                    value={newSchool.dashboard_links.agenda}
                                    onChange={(e) => setNewSchool({
                                      ...newSchool,
                                      dashboard_links: { ...newSchool.dashboard_links, agenda: e.target.value }
                                    })}
                                    placeholder="URL do dashboard de agenda"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="secretaria_link" className="text-sm">Secretaria</Label>
                                  <Input
                                    id="secretaria_link"
                                    value={newSchool.dashboard_links.secretaria}
                                    onChange={(e) => setNewSchool({
                                      ...newSchool,
                                      dashboard_links: { ...newSchool.dashboard_links, secretaria: e.target.value }
                                    })}
                                    placeholder="URL do dashboard de secretaria"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="pedagogico_link" className="text-sm">Pedagógico</Label>
                                  <Input
                                    id="pedagogico_link"
                                    value={newSchool.dashboard_links.pedagogico}
                                    onChange={(e) => setNewSchool({
                                      ...newSchool,
                                      dashboard_links: { ...newSchool.dashboard_links, pedagogico: e.target.value }
                                    })}
                                    placeholder="URL do dashboard pedagógico"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" onClick={() => setSchoolDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={createSchool}>Criar Escola</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="mb-4">
                      <Input
                        placeholder="Buscar escolas..."
                        value={schoolSearch}
                        onChange={(e) => {
                          setSchoolSearch(e.target.value);
                          setCurrentSchoolPage(1);
                        }}
                        className="max-w-sm"
                      />
                    </div>

                    <div className="grid gap-4">
                      {paginatedSchools.map((school) => (
                        <Card key={school.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-3">
                                {school.logo_url && (
                                  <img 
                                    src={school.logo_url} 
                                    alt={`Logo ${school.school_name}`}
                                    className="h-12 w-12 object-contain rounded border"
                                  />
                                )}
                                <div>
                                  <h3 className="font-medium">{school.school_name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Criada em {new Date(school.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                  {school.consultant_id && (
                                    <p className="text-sm text-blue-600">
                                      Consultor: {adminUsers.find(u => u.user_id === school.consultant_id)?.name || 'N/A'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSchool(school);
                                    setEditSchoolDialogOpen(true);
                                  }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSchoolToDelete(school);
                                    setDeleteSchoolDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {totalSchoolPages > 1 && (
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentSchoolPage(Math.max(1, currentSchoolPage - 1))}
                          disabled={currentSchoolPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-3">
                          Página {currentSchoolPage} de {totalSchoolPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentSchoolPage(Math.min(totalSchoolPages, currentSchoolPage + 1))}
                          disabled={currentSchoolPage === totalSchoolPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'banners' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Gerenciar Novidades</h2>
                      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Banner
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Criar Novo Banner</DialogTitle>
                            <DialogDescription>
                              Envie uma imagem para criar um novo banner.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="banner_scope">Escopo</Label>
                              <Select value={bannerScope} onValueChange={(value: 'global' | 'school') => setBannerScope(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="global">Global (todas as escolas)</SelectItem>
                                  <SelectItem value="school">Específica da escola</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {bannerScope === 'school' && (
                              <div>
                                <Label htmlFor="banner_school">Escola</Label>
                                <Select value={bannerSchoolId} onValueChange={setBannerSchoolId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a escola" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {schools.map((school) => (
                                      <SelectItem key={school.id} value={school.id}>
                                        {school.school_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label htmlFor="banner_title">Título (opcional)</Label>
                              <Input
                                id="banner_title"
                                value={bannerTitle}
                                onChange={(e) => setBannerTitle(e.target.value)}
                                placeholder="Título do banner"
                              />
                            </div>
                            <div>
                              <Label htmlFor="banner_link">Link (opcional)</Label>
                              <Input
                                id="banner_link"
                                value={bannerLink}
                                onChange={(e) => setBannerLink(e.target.value)}
                                placeholder="https://..."
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="banner_use_default"
                                checked={bannerUseDefault}
                                onCheckedChange={setBannerUseDefault}
                              />
                              <Label htmlFor="banner_use_default">Usar duração padrão (6 segundos)</Label>
                            </div>
                            {!bannerUseDefault && (
                              <div>
                                <Label htmlFor="banner_duration">Duração (segundos)</Label>
                                <Input
                                  id="banner_duration"
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={bannerDuration}
                                  onChange={(e) => setBannerDuration(parseInt(e.target.value) || 6)}
                                />
                              </div>
                            )}
                            <div>
                              <Label htmlFor="banner_file">Imagem</Label>
                              <Input
                                id="banner_file"
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" onClick={() => setBannerDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleBannerUpload} disabled={uploadingBanner}>
                              {uploadingBanner ? 'Enviando...' : 'Enviar Banner'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <BannersManager key={bannersReloadKey} />
                  </div>
                )}

                {activeView === 'usage' && (
                  <div className="space-y-4">
                    <UsageDashboard />
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Admin Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil do Administrador</DialogTitle>
            <DialogDescription>
              Gerencie suas informações pessoais e configurações.
            </DialogDescription>
          </DialogHeader>
          {loadingProfile ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="h-20 w-20 cursor-pointer" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setCropSrc(reader.result as string);
                        setCropOpen(true);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}>
                  <AvatarImage src={adminProfile.avatar_url} />
                  <AvatarFallback>{adminProfile.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setCropSrc(reader.result as string);
                        setCropOpen(true);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}>
                  Alterar Foto
                </Button>
              </div>
              <div>
                <Label htmlFor="admin_name">Nome</Label>
                <Input
                  id="admin_name"
                  value={adminProfile.name}
                  onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="admin_email">E-mail</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={adminProfile.email}
                  onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="admin_whatsapp">WhatsApp</Label>
                <Input
                  id="admin_whatsapp"
                  value={adminProfile.consultant_whatsapp}
                  onChange={(e) => setAdminProfile({ ...adminProfile, consultant_whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="admin_calendar">URL da Agenda</Label>
                <Input
                  id="admin_calendar"
                  value={adminProfile.consultant_calendar_url}
                  onChange={(e) => setAdminProfile({ ...adminProfile, consultant_calendar_url: e.target.value })}
                  placeholder="https://calendly.com/..."
                />
              </div>
              <div>
                <Label htmlFor="admin_new_password">Nova Senha (opcional)</Label>
                <Input
                  id="admin_new_password"
                  type="password"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Digite nova senha"
                />
              </div>
              <div>
                <Label htmlFor="admin_confirm_password">Confirmar Nova Senha</Label>
                <Input
                  id="admin_confirm_password"
                  type="password"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveAdminProfile} disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="editZendeskUrl">ID da organização no Zendesk</Label>
                <Input 
                  id="editZendeskUrl" 
                  value={editingSchool.zendesk_integration_url || ''} 
                  onChange={e => setEditingSchool({
                    ...editingSchool,
                    zendesk_integration_url: e.target.value
                  })} 
                  placeholder="123456789"
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
    </SidebarProvider>
  );
};

export default AdminDashboard;
