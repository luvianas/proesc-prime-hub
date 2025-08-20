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
import UsageDashboard from '@/components/UsageDashboard';
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
  zendesk_external_id?: string;
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
    zendesk_external_id: '',
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
        zendesk_external_id: newSchool.zendesk_external_id,
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
        zendesk_external_id: '',
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

  const updateSchool = async () => {
    if (!editingSchool) return;
    try {
      const { error } = await supabase.from('school_customizations').update({
        school_name: editingSchool.school_name,
        logo_url: editingSchool.logo_url,
        consultant_id: editingSchool.consultant_id || null,
        zendesk_external_id: editingSchool.zendesk_external_id,
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
      </div>

      {!minimized && (
        <Tabs defaultValue="schools" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="schools">Instituições</TabsTrigger>
              <TabsTrigger value="banners">Novidades</TabsTrigger>
              <TabsTrigger value="usage">Dados de Uso</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="schools" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Escolas</h2>
              <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Escola
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Escola</DialogTitle>
                    <DialogDescription>
                      Adicione uma nova escola ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Nome da escola *</Label>
                      <Input 
                        id="schoolName" 
                        value={newSchool.school_name} 
                        onChange={e => setNewSchool({...newSchool, school_name: e.target.value})} 
                        placeholder="Nome da escola" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zendeskExternalId">External ID do Zendesk (Preferido)</Label>
                      <Input 
                        id="zendeskExternalId" 
                        value={newSchool.zendesk_external_id} 
                        onChange={e => setNewSchool({
                          ...newSchool,
                          zendesk_external_id: e.target.value
                        })} 
                        placeholder="ARCADIA, ULBRA, SARAPIQUA, etc." 
                      />
                      <p className="text-sm text-muted-foreground">
                        Use o External ID configurado no Zendesk (método preferido)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zendeskUrl">ID da organização no Zendesk (Fallback)</Label>
                      <Input 
                        id="zendeskUrl" 
                        value={newSchool.zendesk_integration_url} 
                        onChange={e => setNewSchool({
                          ...newSchool,
                          zendesk_integration_url: e.target.value
                        })} 
                        placeholder="123456789" 
                      />
                      <p className="text-sm text-muted-foreground">
                        Usado apenas se External ID não estiver configurado
                      </p>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schools.map(school => (
                    <div key={school.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{school.school_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          External ID: {school.zendesk_external_id || 'Não configurado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Organization ID: {school.zendesk_integration_url || 'Não configurado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSchool(school);
                            setEditSchoolDialogOpen(true);
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners" className="space-y-4">
            <BannersManager key={bannersReloadKey} />
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <UsageDashboard />
          </TabsContent>
        </Tabs>
      )}

      {/* Edit School Dialog */}
      <Dialog open={editSchoolDialogOpen} onOpenChange={setEditSchoolDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>
              Atualize as informações da escola
            </DialogDescription>
          </DialogHeader>
          {editingSchool && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editSchoolName">Nome da escola *</Label>
                <Input 
                  id="editSchoolName" 
                  value={editingSchool.school_name} 
                  onChange={e => setEditingSchool({
                    ...editingSchool,
                    school_name: e.target.value
                  })} 
                  placeholder="Nome da escola" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editZendeskExternalId">External ID do Zendesk (Preferido)</Label>
                <Input 
                  id="editZendeskExternalId" 
                  value={editingSchool.zendesk_external_id || ''} 
                  onChange={e => setEditingSchool({
                    ...editingSchool,
                    zendesk_external_id: e.target.value
                  })} 
                  placeholder="ARCADIA, ULBRA, SARAPIQUA, etc."
                />
                <p className="text-sm text-muted-foreground">
                  Use o External ID configurado no Zendesk (método preferido)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editZendeskUrl">ID da organização no Zendesk (Fallback)</Label>
                <Input 
                  id="editZendeskUrl" 
                  value={editingSchool.zendesk_integration_url || ''} 
                  onChange={e => setEditingSchool({
                    ...editingSchool,
                    zendesk_integration_url: e.target.value
                  })} 
                  placeholder="123456789"
                />
                <p className="text-sm text-muted-foreground">
                  Usado apenas se External ID não estiver configurado
                </p>
              </div>
              <Button onClick={updateSchool} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageCropperDialog open={cropOpen} onOpenChange={setCropOpen} imageSrc={cropSrc} onConfirm={uploadCroppedAvatar} />
    </div>
  );
};

export default AdminDashboard;