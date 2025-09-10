import { useState } from 'react';
import { LogOut } from 'lucide-react';
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
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const openProfile = () => {
    setProfileDialogOpen(true);
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

      const { error } = await supabase.from('profiles')
        .update({
          avatar_url: publicUrl,
          name: profileName || null
        })
        .eq('user_id', user.id);

      setAvatarUrl(publicUrl);
      setCropperOpen(false);
      setSelectedFile(null);
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao atualizar avatar');
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileName || null,
          avatar_url: avatarUrl
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      setProfileDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCropperOpen(true);
    }
  };

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
            <ThemeToggle />
            <Button onClick={openProfile} variant="outline" className="rounded-full w-12 h-12 p-0 btn-elegant hover-glow">
              <Avatar className="w-10 h-10">
                <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                <AvatarFallback className="bg-gradient-primary text-white">
                  {(profileName || user?.email || '').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button variant="outline" onClick={signOut} className="hover-lift">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
          <div className="md:hidden">
            <MobileActionsMenu onOpenProfile={openProfile} />
          </div>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg card-elegant">
          <DialogHeader>
            <DialogTitle className="text-gradient">Meu Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 hover-scale">
                <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                <AvatarFallback className="bg-gradient-primary text-white">
                  {(profileName || user?.email || '').charAt(0).toUpperCase()}
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
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome de Exibição</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Digite seu nome"
              />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email || ''} disabled />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveProfile} className="btn-elegant">
                Salvar
              </Button>
            </div>
          </div>
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