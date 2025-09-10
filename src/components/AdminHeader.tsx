import { useState } from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import MobileActionsMenu from '@/components/MobileActionsMenu';
import ImageCropperDialog from '@/components/ImageCropperDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminHeader = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  // Complete admin profile states (matching AdminDashboard)
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
  
  // Image cropping states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const openProfile = async () => {
    if (!user) return;
    setProfileDialogOpen(true);
    setLoadingProfile(true);
    
    try {
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
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    return data;
  };

  const uploadCroppedAvatar = async (croppedImageBlob: Blob) => {
    if (!user) return;

    try {
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
      const file = new File([croppedImageBlob], fileName, { type: 'image/jpeg' });
      
      await uploadImage(file, fileName);
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAdminProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setCropperOpen(false);
      setSelectedFile(null);
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao atualizar avatar');
    }
  };

  const saveAdminProfile = async () => {
    if (!user) return;
    
    if (adminNewPassword && adminNewPassword !== adminConfirmPassword) {
      toast.error('Senhas não conferem');
      return;
    }
    
    setSavingProfile(true);
    try {
      // Update auth data if email or password changed
      const updates: { email?: string; password?: string } = {};
      if (adminProfile.email && adminProfile.email !== user.email) {
        updates.email = adminProfile.email;
      }
      if (adminNewPassword) {
        updates.password = adminNewPassword;
      }
      
      if (updates.email || updates.password) {
        const { error: authErr } = await supabase.auth.updateUser(updates);
        if (authErr) throw authErr;
      }
      
      // Update profile data
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
      
      toast.success('Perfil atualizado com sucesso!');
      setProfileDialogOpen(false);
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCropperOpen(true);
    }
  };

  const handleBackToSelection = () => {
    navigate('/admin');
  };

  const showBackButton = location.pathname.includes('/admin/school/') || location.pathname === '/admin/dashboard';

  return (
    <>
      <div className="grid grid-cols-3 items-center p-4 border-b border-border/30 bg-card/90 backdrop-blur-md shadow-elegant">
        <div className="justify-self-start">
          <h1 className="text-xl font-semibold text-gradient">Sistema de Controle - Admin</h1>
        </div>
        <div className="justify-self-center">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://app.proesc.com" target="_blank" rel="noopener noreferrer" aria-label="Retornar ao Proesc" className="inline-flex items-center justify-center rounded-md px-2 py-1 hover:opacity-80 transition-opacity cursor-pointer hover-scale">
                  <img src="/lovable-uploads/31be6a89-85b7-486f-b156-ebe5b3557c02.png" alt="Proesc Prime" className="h-10 mx-auto" loading="lazy" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">Retornar ao Proesc</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="justify-self-end flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {showBackButton && (
              <Button 
                variant="outline" 
                onClick={handleBackToSelection}
                className="hover-lift"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar à seleção
              </Button>
            )}
            <ThemeToggle />
            <Button onClick={openProfile} variant="outline" className="rounded-full w-12 h-12 p-0 btn-elegant hover-glow">
              <Avatar className="w-10 h-10">
                <AvatarImage src={adminProfile.avatar_url} alt="Foto do perfil" />
                <AvatarFallback className="bg-gradient-primary text-white">
                  {(adminProfile.name || user?.email || '').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button variant="outline" onClick={signOut} className="hover-lift">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          <div className="md:hidden">
            <MobileActionsMenu onOpenProfile={openProfile} showBackButton={showBackButton} onBack={handleBackToSelection} />
          </div>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg card-elegant">
          <DialogHeader>
            <DialogTitle className="text-gradient">Meu Perfil - Admin</DialogTitle>
          </DialogHeader>
          {loadingProfile ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 hover-scale">
                  <AvatarImage src={adminProfile.avatar_url} alt="Foto do perfil" />
                  <AvatarFallback className="bg-gradient-primary text-white">
                    {(adminProfile.name || user?.email || '').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar-upload">Foto do Perfil</Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                    disabled={loadingProfile}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nome de Exibição</Label>
                  <Input
                    id="profile-name"
                    value={adminProfile.name}
                    onChange={(e) => setAdminProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite seu nome"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profile-email">E-mail</Label>
                  <Input 
                    id="profile-email"
                    type="email"
                    value={adminProfile.email}
                    onChange={(e) => setAdminProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input 
                    id="whatsapp"
                    value={adminProfile.consultant_whatsapp}
                    onChange={(e) => setAdminProfile(prev => ({ ...prev, consultant_whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calendar">Link de Incorporação do Google Calendar</Label>
                  <Input 
                    id="calendar"
                    value={adminProfile.consultant_calendar_url}
                    onChange={(e) => setAdminProfile(prev => ({ ...prev, consultant_calendar_url: e.target.value }))}
                    placeholder="https://calendar.google.com/calendar/embed?..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input 
                      id="new-password"
                      type="password"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="Deixe em branco para não alterar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <Input 
                      id="confirm-password"
                      type="password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveAdminProfile} disabled={savingProfile} className="btn-elegant">
                  {savingProfile ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={selectedFile ? URL.createObjectURL(selectedFile) : ''}
        onConfirm={uploadCroppedAvatar}
      />
    </>
  );
};

export default AdminHeader;