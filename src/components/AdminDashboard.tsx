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
import { Plus, Users, Settings, Trash2, School, Edit3, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import BannersManager from '@/components/BannersManager';
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
  theme_color: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_photo_url?: string;
  consultant_calendar_url?: string;
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSchoolDialogOpen, setEditSchoolDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolCustomization | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as 'admin' | 'user' | 'gestor',
    environmentName: '',
    themeColor: '#3b82f6',
    schoolId: ''
  });
  const [newSchool, setNewSchool] = useState({
    school_name: '',
    primary_color: '#3b82f6',
    secondary_color: '#64748b',
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
  const {
    toast
  } = useToast();
  const {
    userRole
  } = useAuth();
  const [minimized, setMinimized] = useState(false);

  // Reautenticação para exclusão de escola (sem trocar a sessão atual)
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
  const [uploadingConsultantNew, setUploadingConsultantNew] = useState(false);
  const [uploadingLogoEdit, setUploadingLogoEdit] = useState(false);
  const [uploadingConsultantEdit, setUploadingConsultantEdit] = useState(false);

  // Banner upload dialog state
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerScope, setBannerScope] = useState<'global' | 'school'>('global');
  const [bannerSchoolId, setBannerSchoolId] = useState<string>('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannersReloadKey, setBannersReloadKey] = useState(0);

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

  const handleBannerUpload = async () => {
    try {
      console.log('🚀 Iniciando upload de banner');
      
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
      
      // Verificar usuário atual e role
      const { data: userData } = await supabase.auth.getUser();
      console.log('👤 Usuário atual:', userData.user?.id);
      
      // Verificar role do usuário
      const { data: roleData, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userData.user?.id)
        .single();
      
      console.log('🔑 Role do usuário:', roleData, 'Erro:', roleError);
      
      const imageUrl = await uploadImage(bannerFile, 'banners');
      if (!imageUrl) return;

      const bannerData = {
        image_url: imageUrl,
        is_global: bannerScope === 'global',
        school_id: bannerScope === 'school' ? bannerSchoolId : null,
        created_by: userData.user?.id ?? null,
      };
      
      console.log('📝 Dados do banner a serem inseridos:', bannerData);
      
      const { data: insertResult, error } = await supabase
        .from('school_banners')
        .insert([bannerData])
        .select();
        
      console.log('💾 Resultado da inserção:', insertResult, 'Erro:', error);
      
      if (error) throw error;

      toast({ title: 'Banner enviado com sucesso' });
      setBannersReloadKey((k) => k + 1);
      setBannerDialogOpen(false);
      setBannerFile(null);
      setBannerSchoolId('');
      setBannerScope('global');
    } catch (e: any) {
      console.error('❌ Erro completo no upload:', e);
      toast({ title: 'Erro', description: e.message || 'Falha ao enviar banner', variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const [usersResponse, environmentsResponse, schoolsResponse] = await Promise.all([supabase.from('profiles').select('*').order('created_at', {
        ascending: false
      }), supabase.from('environments').select('*').order('created_at', {
        ascending: false
      }), supabase.from('school_customizations').select('*').order('created_at', {
        ascending: false
      })]);
      if (usersResponse.data) setUsers(usersResponse.data);
      if (environmentsResponse.data) setEnvironments(environmentsResponse.data);
      if (schoolsResponse.data) setSchools(schoolsResponse.data);
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
    try {
      const {
        data,
        error
      } = await supabase.from('school_customizations').insert([{
        ...newSchool,
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
        theme_color: '#3b82f6',
        logo_url: '',
        consultant_name: '',
        consultant_photo_url: '',
        consultant_calendar_url: '',
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

      // Create user in Supabase Auth
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
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

      // If it's a gestor, link to school
      if (authData.user && newUser.role === 'gestor' && newUser.schoolId) {
        await supabase.from('profiles').update({
          school_id: newUser.schoolId
        }).eq('user_id', authData.user.id);
      }

      // Update environment name and theme if needed
      if (authData.user) {
        await supabase.from('environments').update({
          name: newUser.environmentName || 'Meu Ambiente',
          theme_color: newUser.themeColor
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
        role: 'user' as 'admin' | 'user' | 'gestor',
        environmentName: '',
        themeColor: '#3b82f6',
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
      const {
        error
      } = await supabase.from('profiles').update({
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
      const {
        data,
        error
      } = await supabase.functions.invoke('delete-auth-user', {
        body: {
          user_id: userId
        }
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
      const {
        data: signInData,
        error: signInError
      } = await tempClient.auth.signInWithPassword({
        email: confirmEmail,
        password: confirmPassword
      });
      if (signInError || !signInData?.user) throw new Error('Credenciais inválidas');
      const {
        error: delError
      } = await tempClient.from('school_customizations').delete().eq('id', schoolToDelete.id);
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
      const {
        error
      } = await supabase.from('profiles').update({
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
      const {
        error
      } = await supabase.from('school_customizations').update({
        school_name: editingSchool.school_name,
        theme_color: editingSchool.theme_color,
        logo_url: editingSchool.logo_url,
        consultant_name: editingSchool.consultant_name,
        consultant_photo_url: editingSchool.consultant_photo_url,
        consultant_calendar_url: editingSchool.consultant_calendar_url,
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
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>;
  }
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários e escolas do sistema</p>
        </div>
        {userRole === 'admin'}
      </div>

      {!minimized && <Tabs defaultValue="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="schools">Instituições</TabsTrigger>
              <TabsTrigger value="banners">Novidades</TabsTrigger>
            </TabsList>
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
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" value={newUser.name} onChange={e => setNewUser({
                    ...newUser,
                    name: e.target.value
                  })} placeholder="Nome do usuário" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={newUser.email} onChange={e => setNewUser({
                    ...newUser,
                    email: e.target.value
                  })} placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" type="password" value={newUser.password} onChange={e => setNewUser({
                    ...newUser,
                    password: e.target.value
                  })} placeholder="Senha" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Tipo de Usuário</Label>
                      <Select value={newUser.role} onValueChange={(value: 'admin' | 'user' | 'gestor') => setNewUser({
                    ...newUser,
                    role: value
                  })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newUser.role === 'gestor' && <div className="space-y-2">
                        <Label htmlFor="school">Escola</Label>
                        <Select value={newUser.schoolId} onValueChange={value => setNewUser({
                    ...newUser,
                    schoolId: value
                  })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a escola" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map(school => <SelectItem key={school.id} value={school.id}>
                                {school.school_name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>}
                    
                    <div className="space-y-2">
                      <Label htmlFor="environmentName">Nome do Ambiente</Label>
                      <Input id="environmentName" value={newUser.environmentName} onChange={e => setNewUser({
                    ...newUser,
                    environmentName: e.target.value
                  })} placeholder="Meu Ambiente" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="themeColor">Cor do Tema</Label>
                      <Input id="themeColor" type="color" value={newUser.themeColor} onChange={e => setNewUser({
                    ...newUser,
                    themeColor: e.target.value
                  })} />
                    </div>
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
                {/* Busca de Usuários */}
                <div className="flex gap-2 items-center mb-4">
                  <Input placeholder="Procurar usuários (nome, email, função, escola)" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  <Button type="button">Procurar</Button>
                </div>

                <div className="space-y-4">
                  {users.filter(u => {
                const q = userSearch.trim().toLowerCase();
                if (!q) return true;
                const roleLabel = u.role;
                const schoolName = u.role === 'gestor' && u.school_id ? getSchoolName(u.school_id).toLowerCase() : '';
                return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || roleLabel.toLowerCase().includes(q) || schoolName.includes(q);
              }).map(user => {
                const environment = getUserEnvironment(user.user_id);
                return <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{
                      backgroundColor: environment?.theme_color || '#3b82f6'
                    }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
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
                              {user.role === 'gestor' && user.school_id && <p className="text-xs text-muted-foreground">
                                  Escola: {getSchoolName(user.school_id)}
                                </p>}
                              {environment && <p className="text-xs text-muted-foreground">
                                  Ambiente: {environment.name}
                                </p>}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => editUser(user)}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Switch checked={user.is_active} onCheckedChange={() => toggleUserStatus(user.user_id, user.is_active)} disabled={user.role === 'admin'} />
                            {user.role !== 'admin' && <Button variant="destructive" size="sm" onClick={() => deleteUser(user.user_id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>}
                          </div>
                        </div>;
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
                    <DialogTitle>Personalizar Nova Escola</DialogTitle>
                    <DialogDescription>
                      Configure as personalizações da escola para os gestores
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Nome da Escola</Label>
                      <Input id="schoolName" value={newSchool.school_name} onChange={e => setNewSchool({
                    ...newSchool,
                    school_name: e.target.value
                  })} placeholder="Nome da escola" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolThemeColor">Cor do Tema</Label>
                      <Input id="schoolThemeColor" type="color" value={newSchool.theme_color} onChange={e => setNewSchool({
                    ...newSchool,
                    theme_color: e.target.value
                  })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoFile">Logo da Escola</Label>
                      <Input id="logoFile" type="file" accept="image/*" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingLogoNew(true);
                    const url = await uploadImage(file, 'logos');
                    setUploadingLogoNew(false);
                    if (url) setNewSchool({
                      ...newSchool,
                      logo_url: url
                    });
                  }} />
                      {uploadingLogoNew && <p className="text-sm text-muted-foreground">Enviando...</p>}
                      {newSchool.logo_url && <img src={newSchool.logo_url} alt="Logo da escola" className="h-12 rounded" />}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultantName">Nome do Consultor</Label>
                      <Input id="consultantName" value={newSchool.consultant_name} onChange={e => setNewSchool({
                    ...newSchool,
                    consultant_name: e.target.value
                  })} placeholder="Nome do consultor" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultantPhotoFile">Foto do Consultor</Label>
                      <Input id="consultantPhotoFile" type="file" accept="image/*" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingConsultantNew(true);
                    const url = await uploadImage(file, 'consultants');
                    setUploadingConsultantNew(false);
                    if (url) setNewSchool({
                      ...newSchool,
                      consultant_photo_url: url
                    });
                  }} />
                      {uploadingConsultantNew && <p className="text-sm text-muted-foreground">Enviando...</p>}
                      {newSchool.consultant_photo_url && <img src={newSchool.consultant_photo_url} alt="Foto do consultor" className="h-12 rounded" />}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calendarUrl">Link de incorporação do Google Calendar</Label>
                      <Input id="calendarUrl" value={newSchool.consultant_calendar_url || ''} onChange={e => setNewSchool({
                    ...newSchool,
                    consultant_calendar_url: e.target.value
                  })} placeholder="https://calendar.google.com/calendar/embed?..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zendeskUrl">URL Integração Zendesk</Label>
                      <Input id="zendeskUrl" value={newSchool.zendesk_integration_url} onChange={e => setNewSchool({
                    ...newSchool,
                    zendesk_integration_url: e.target.value
                  })} placeholder="https://escola.zendesk.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metabaseUrl">URL Integração Metabase</Label>
                      <Input id="metabaseUrl" value={newSchool.metabase_integration_url} onChange={e => setNewSchool({
                    ...newSchool,
                    metabase_integration_url: e.target.value
                  })} placeholder="https://metabase.escola.com" />
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
                  Personalizações configuradas para as escolas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Busca de Escolas */}
                <div className="flex gap-2 items-center mb-4">
                  <Input placeholder="Procurar escolas (nome, consultor, integrações)" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)} />
                  <Button type="button">Procurar</Button>
                </div>

                <div className="grid gap-4">
                  {schools.filter(s => {
                const q = schoolSearch.trim().toLowerCase();
                if (!q) return true;
                const integrations = `${s.zendesk_integration_url ? 'zendesk' : ''} ${s.metabase_integration_url ? 'metabase' : ''}`;
                return s.school_name.toLowerCase().includes(q) || (s.consultant_name || '').toLowerCase().includes(q) || integrations.includes(q);
              }).map(school => <div key={school.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold" style={{
                      backgroundColor: school.theme_color
                    }}>
                              {school.school_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold">{school.school_name}</h3>
                              {school.consultant_name && <p className="text-sm text-muted-foreground">
                                  Consultor: {school.consultant_name}
                                </p>}
                              <div className="flex gap-2 mt-2">
                                {school.zendesk_integration_url && <Badge variant="outline">Zendesk</Badge>}
                                {school.metabase_integration_url && <Badge variant="outline">Metabase</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => editSchool(school)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openDeleteSchoolDialog(school)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="banners" className="space-y-4">
            <BannersManager key={bannersReloadKey} />
          </TabsContent>
        </Tabs>}


      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Edite as informações do usuário
            </DialogDescription>
          </DialogHeader>
          {editingUser && <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input id="edit-name" value={editingUser.name} onChange={e => setEditingUser({
              ...editingUser,
              name: e.target.value
            })} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editingUser.email} onChange={e => setEditingUser({
              ...editingUser,
              email: e.target.value
            })} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Tipo de Usuário</Label>
                <Select value={editingUser.role} onValueChange={(value: 'admin' | 'user' | 'gestor') => setEditingUser({
              ...editingUser,
              role: value
            })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editingUser.role === 'gestor' && <div className="space-y-2">
                  <Label htmlFor="edit-school">Escola</Label>
                  <Select value={editingUser.school_id || ''} onValueChange={value => setEditingUser({
              ...editingUser,
              school_id: value
            })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a escola" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map(school => <SelectItem key={school.id} value={school.id}>
                          {school.school_name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>}
              
              <Button onClick={updateUser} className="w-full">
                Atualizar Usuário
              </Button>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={editSchoolDialogOpen} onOpenChange={setEditSchoolDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>
              Edite as configurações da escola
            </DialogDescription>
          </DialogHeader>
          {editingSchool && <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-school-name">Nome da Escola</Label>
                <Input id="edit-school-name" value={editingSchool.school_name} onChange={e => setEditingSchool({
              ...editingSchool,
              school_name: e.target.value
            })} placeholder="Nome da escola" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-school-theme">Cor do Tema</Label>
                <Input id="edit-school-theme" type="color" value={editingSchool.theme_color} onChange={e => setEditingSchool({
              ...editingSchool,
              theme_color: e.target.value
            })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logo-file">Logo da Escola</Label>
                <Input id="edit-logo-file" type="file" accept="image/*" onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadingLogoEdit(true);
              const url = await uploadImage(file, 'logos');
              setUploadingLogoEdit(false);
              if (url && editingSchool) setEditingSchool({
                ...editingSchool,
                logo_url: url
              });
            }} />
                {uploadingLogoEdit && <p className="text-sm text-muted-foreground">Enviando...</p>}
                {editingSchool.logo_url && <img src={editingSchool.logo_url} alt="Logo da escola" className="h-12 rounded" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-consultant-name">Nome do Consultor</Label>
                <Input id="edit-consultant-name" value={editingSchool.consultant_name || ''} onChange={e => setEditingSchool({
              ...editingSchool,
              consultant_name: e.target.value
            })} placeholder="Nome do consultor" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-consultant-photo-file">Foto do Consultor</Label>
                <Input id="edit-consultant-photo-file" type="file" accept="image/*" onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadingConsultantEdit(true);
              const url = await uploadImage(file, 'consultants');
              setUploadingConsultantEdit(false);
              if (url && editingSchool) setEditingSchool({
                ...editingSchool,
                consultant_photo_url: url
              });
            }} />
                {uploadingConsultantEdit && <p className="text-sm text-muted-foreground">Enviando...</p>}
                {editingSchool.consultant_photo_url && <img src={editingSchool.consultant_photo_url} alt="Foto do consultor" className="h-12 rounded" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-calendar-url">Link de incorporação do Google Calendar</Label>
                <Input id="edit-calendar-url" value={editingSchool.consultant_calendar_url || ''} onChange={e => setEditingSchool({
              ...editingSchool,
              consultant_calendar_url: e.target.value
            })} placeholder="https://calendar.google.com/calendar/embed?..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zendesk-url">URL Integração Zendesk</Label>
                <Input id="edit-zendesk-url" value={editingSchool.zendesk_integration_url || ''} onChange={e => setEditingSchool({
              ...editingSchool,
              zendesk_integration_url: e.target.value
            })} placeholder="https://escola.zendesk.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-metabase-url">URL Integração Metabase</Label>
                <Input id="edit-metabase-url" value={editingSchool.metabase_integration_url || ''} onChange={e => setEditingSchool({
              ...editingSchool,
              metabase_integration_url: e.target.value
            })} placeholder="https://metabase.escola.com" />
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Links dos Dashboards (Metabase)</h4>
                <div className="space-y-2">
                  <Label htmlFor="edit-dash-financeiro">Dashboard Financeiro</Label>
                  <Input 
                    id="edit-dash-financeiro" 
                    value={editingSchool.dashboard_links?.financeiro || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        financeiro: e.target.value
                      }
                    })} 
                    placeholder="https://metabase.escola.com/public/dashboard/..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dash-agenda">Dashboard Agenda</Label>
                  <Input 
                    id="edit-dash-agenda" 
                    value={editingSchool.dashboard_links?.agenda || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        agenda: e.target.value
                      }
                    })} 
                    placeholder="https://metabase.escola.com/public/dashboard/..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dash-secretaria">Dashboard Secretaria</Label>
                  <Input 
                    id="edit-dash-secretaria" 
                    value={editingSchool.dashboard_links?.secretaria || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        secretaria: e.target.value
                      }
                    })} 
                    placeholder="https://metabase.escola.com/public/dashboard/..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dash-pedagogico">Dashboard Pedagógico</Label>
                  <Input 
                    id="edit-dash-pedagogico" 
                    value={editingSchool.dashboard_links?.pedagogico || ''} 
                    onChange={e => setEditingSchool({
                      ...editingSchool,
                      dashboard_links: {
                        ...editingSchool.dashboard_links,
                        pedagogico: e.target.value
                      }
                    })} 
                    placeholder="https://metabase.escola.com/public/dashboard/..." 
                  />
                </div>
              </div>
              <Button onClick={updateSchool} className="w-full">
                Atualizar Escola
              </Button>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Delete School Dialog */}
      <Dialog open={deleteSchoolDialogOpen} onOpenChange={setDeleteSchoolDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>Para excluir a escola, autentique-se novamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Email</Label>
              <Input id="confirm-email" type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Senha</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Sua senha" />
            </div>
            <Button onClick={confirmDeleteSchool} disabled={deletingSchool} variant="destructive" className="w-full">
              {deletingSchool ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>;
};
export default AdminDashboard;