import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/components/AdminDashboard";
import UserDashboard from "@/components/UserDashboard";
import GestorDashboard from "@/components/GestorDashboard";
import AIAssistant from "@/components/AIAssistant";
import TicketSystem from "@/components/TicketSystem";
import FinancialDashboard from "@/components/FinancialDashboard";
import SecretariaDashboard from "@/components/SecretariaDashboard";
import AgendaDashboard from "@/components/AgendaDashboard";
import PedagogicoDashboard from "@/components/PedagogicoDashboard";
import MatriculaDashboard from "@/components/MatriculaDashboard";
import ConsultorAgenda from "@/components/ConsultorAgenda";
import ConsultantInfo from "@/components/ConsultantInfo";
import ProjectPlan from "@/components/ProjectPlan";
import Header from "@/components/Header";
import WelcomeSection from "@/components/WelcomeSection";
import CarouselSection from "@/components/CarouselSection";
import QuickActions from "@/components/QuickActions";
import DashboardGrid from "@/components/DashboardGrid";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import ImageCropperDialog from "@/components/ImageCropperDialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import MobileActionsMenu from "@/components/MobileActionsMenu";
import Footer from "@/components/Footer";
const Index = () => {
  const [showAI, setShowAI] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedDashboard, setExpandedDashboard] = useState<string | null>(null);
  const {
    user,
    userRole,
    loading,
    signOut,
    mustChangePassword,
  } = useAuth();
  const [schoolHeader, setSchoolHeader] = useState<{
    schoolName: string;
    logoUrl?: string;
    consultantName?: string;
    userName?: string;
  } | null>(null);

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
  const [forceNewPassword, setForceNewPassword] = useState("");
  const [forceConfirmPassword, setForceConfirmPassword] = useState("");
  const [forcingChange, setForcingChange] = useState(false);
  const [forceDismissed, setForceDismissed] = useState(false);

  // Avatar cropper state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");

  const { toast } = useToast();

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
        .update({ name: profileName, email: profileEmail, avatar_url: avatarUrl, ...(userRole === 'admin' ? { consultant_whatsapp: adminWhatsApp, consultant_calendar_url: adminCalendarUrl } : {}) })
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
  // Load user profile data on component mount
  useEffect(() => {
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
    
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userRole !== 'gestor' || !user) return;
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('school_id, name').eq('user_id', user.id).single();
      if (!profile?.school_id) return;
      const { data: school } = await supabase.from('school_customizations').select('school_name, logo_url').eq('school_id', profile.school_id).maybeSingle();
      if (school) {
        setSchoolHeader({
          schoolName: school.school_name,
          logoUrl: school.logo_url || undefined,
          consultantName: undefined,
          userName: profile.name || undefined
        });
      }
    };
    load();
  }, [userRole, user]);

  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>;
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render admin dashboard for admin users
  if (userRole === 'admin') {
    return <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <div className="grid grid-cols-3 items-center p-4 border-b">
          <div className="justify-self-start">
            <h1 className="text-xl font-semibold">Sistema de Controle - Admin</h1>
          </div>
          <div className="justify-self-center">
<TooltipProvider delayDuration={150}>
  <Tooltip>
    <TooltipTrigger asChild>
      <a
        href="https://app.proesc.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir Proesc em nova aba"
        className="inline-flex items-center justify-center rounded-md px-2 py-1 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition hover-scale cursor-pointer"
      >
        <img
          src="/lovable-uploads/31be6a89-85b7-486f-b156-ebe5b3557c02.png"
          alt="Proesc Prime"
          className="h-10 mx-auto select-none pointer-events-none"
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
              <Button onClick={openProfile} variant="outline" className="rounded-full w-12 h-12 p-0 btn-elegant hover-glow">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {(profileName || user.email || '').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
              <Button variant="outline" onClick={signOut}>
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Meu Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                  <AvatarFallback>
                    {(profileName || user.email || '').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-admin">Foto do perfil</Label>
                  <Input
                    id="avatar-admin"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleAvatarChange(e.target.files[0])}
                    disabled={loadingProfile}
                    className="file:border file:border-input file:rounded-md file:px-3 file:py-1 file:text-sm file:font-medium file:bg-background file:text-foreground hover:file:bg-accent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use uma imagem quadrada (PNG ou JPG).</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name-admin">Nome</Label>
                  <Input id="name-admin" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-admin">E-mail</Label>
                  <Input id="email-admin" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                </div>

                {userRole === 'admin' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wa-admin">WhatsApp do Consultor</Label>
                      <Input id="wa-admin" placeholder="5599999999999" value={adminWhatsApp} onChange={(e)=>setAdminWhatsApp(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cal-admin">Link de incorporação do Google Calendar</Label>
                      <Input id="cal-admin" placeholder="<iframe ...> ou URL" value={adminCalendarUrl} onChange={(e)=>setAdminCalendarUrl(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password-admin">Nova senha</Label>
                    <Input id="password-admin" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword-admin">Confirmar senha</Label>
                    <Input id="confirmPassword-admin" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
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
        {/* Force password change dialog */}
        {mustChangePassword && !forceDismissed && (
          <Dialog open onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Defina uma nova senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newpass-admin">Nova senha</Label>
                  <Input id="newpass-admin" type="password" value={forceNewPassword} onChange={(e)=>setForceNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="confpass-admin">Confirmar senha</Label>
                  <Input id="confpass-admin" type="password" value={forceConfirmPassword} onChange={(e)=>setForceConfirmPassword(e.target.value)} />
                </div>
                <Button disabled={forcingChange} onClick={async ()=>{
                  if (forceNewPassword.length < 8 || !/[A-Z]/.test(forceNewPassword) || !/[a-z]/.test(forceNewPassword) || !/\d/.test(forceNewPassword)) {
                    toast({ title: 'Senha fraca', description: 'Use 8+ caracteres com maiúscula, minúscula e número.', variant: 'destructive' });
                    return;
                  }
                  if (forceNewPassword !== forceConfirmPassword) {
                    toast({ title: 'Senhas não conferem', variant: 'destructive' });
                    return;
                  }
                  try {
                    setForcingChange(true);
                    const { error: authErr } = await supabase.auth.updateUser({ password: forceNewPassword });
                    if (authErr) throw authErr;
                    await supabase.from('profiles').update({ must_change_password: false } as any).eq('user_id', user!.id);
                    toast({ title: 'Senha alterada com sucesso' });
                    setForceDismissed(true);
                  } catch (e:any) {
                    toast({ title: 'Erro ao alterar senha', description: e.message, variant: 'destructive' });
                  } finally { setForcingChange(false); }
                }}>{forcingChange ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <AdminDashboard />
        <Footer />
      </div>;
  }

  // Render gestor dashboard for gestor users
  if (userRole === 'gestor') {
    return <div className="min-h-screen bg-hero">
        <div className="grid grid-cols-3 items-center p-6 border-b bg-card/80 backdrop-blur-lg shadow-medium">
          <div className="flex items-center gap-6 justify-self-start">
            {schoolHeader?.logoUrl ? (
              <img
                src={schoolHeader.logoUrl}
                alt={`Logo ${schoolHeader.schoolName}`}
                className="w-16 h-16 object-contain rounded"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {schoolHeader?.schoolName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-primary">{schoolHeader?.schoolName}</h1>
              <Badge variant="secondary" className="text-xs">Portal Prime</Badge>
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
        aria-label="Abrir Proesc em nova aba"
        className="inline-flex items-center justify-center rounded-md px-2 py-1 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition hover-scale cursor-pointer"
      >
        <img 
          src="/lovable-uploads/31be6a89-85b7-486f-b156-ebe5b3557c02.png" 
          alt="Proesc Prime" 
          className="h-10 mx-auto select-none pointer-events-none"
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
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {schoolHeader?.schoolName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
              <Button onClick={signOut} className="btn-elegant shadow-medium">
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Meu Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl} alt="Foto do perfil" />
                  <AvatarFallback>
                    {schoolHeader?.schoolName?.charAt(0).toUpperCase()}
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
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        <ImageCropperDialog open={cropOpen} onOpenChange={setCropOpen} imageSrc={cropSrc} onConfirm={uploadCroppedAvatar} />
        {/* Force password change dialog */}
        {mustChangePassword && !forceDismissed && (
          <Dialog open onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Defina uma nova senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newpass-gestor">Nova senha</Label>
                  <Input id="newpass-gestor" type="password" value={forceNewPassword} onChange={(e)=>setForceNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="confpass-gestor">Confirmar senha</Label>
                  <Input id="confpass-gestor" type="password" value={forceConfirmPassword} onChange={(e)=>setForceConfirmPassword(e.target.value)} />
                </div>
                <Button disabled={forcingChange} onClick={async ()=>{
                  if (forceNewPassword.length < 8 || !/[A-Z]/.test(forceNewPassword) || !/[a-z]/.test(forceNewPassword) || !/\d/.test(forceNewPassword)) {
                    toast({ title: 'Senha fraca', description: 'Use 8+ caracteres com maiúscula, minúscula e número.', variant: 'destructive' });
                    return;
                  }
                  if (forceNewPassword !== forceConfirmPassword) {
                    toast({ title: 'Senhas não conferem', variant: 'destructive' });
                    return;
                  }
                  try {
                    setForcingChange(true);
                    const { error: authErr } = await supabase.auth.updateUser({ password: forceNewPassword });
                    if (authErr) throw authErr;
                    await supabase.from('profiles').update({ must_change_password: false } as any).eq('user_id', user!.id);
                    toast({ title: 'Senha alterada com sucesso' });
                    setForceDismissed(true);
                  } catch (e:any) {
                    toast({ title: 'Erro ao alterar senha', description: e.message, variant: 'destructive' });
                  } finally { setForcingChange(false); }
                }}>{forcingChange ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <GestorDashboard />
        <Footer />
      </div>;
    }

  // Render user dashboard for regular users
  if (userRole === 'user') {
    return <div className="min-h-screen">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" onClick={signOut} className="bg-white/90 backdrop-blur">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        {/* Force password change dialog */}
        {mustChangePassword && !forceDismissed && (
          <Dialog open onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Defina uma nova senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newpass-user">Nova senha</Label>
                  <Input id="newpass-user" type="password" value={forceNewPassword} onChange={(e)=>setForceNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="confpass-user">Confirmar senha</Label>
                  <Input id="confpass-user" type="password" value={forceConfirmPassword} onChange={(e)=>setForceConfirmPassword(e.target.value)} />
                </div>
                <Button disabled={forcingChange} onClick={async ()=>{
                  if (forceNewPassword.length < 8 || !/[A-Z]/.test(forceNewPassword) || !/[a-z]/.test(forceNewPassword) || !/\d/.test(forceNewPassword)) {
                    toast({ title: 'Senha fraca', description: 'Use 8+ caracteres com maiúscula, minúscula e número.', variant: 'destructive' });
                    return;
                  }
                  if (forceNewPassword !== forceConfirmPassword) {
                    toast({ title: 'Senhas não conferem', variant: 'destructive' });
                    return;
                  }
                  try {
                    setForcingChange(true);
                    const { error: authErr } = await supabase.auth.updateUser({ password: forceNewPassword });
                    if (authErr) throw authErr;
                    await supabase.from('profiles').update({ must_change_password: false } as any).eq('user_id', user!.id);
                    toast({ title: 'Senha alterada com sucesso' });
                    setForceDismissed(true);
                  } catch (e:any) {
                    toast({ title: 'Erro ao alterar senha', description: e.message, variant: 'destructive' });
                  } finally { setForcingChange(false); }
                }}>{forcingChange ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <UserDashboard />
        <Footer />
      </div>;
  }

  // Fallback - show original dashboard for users without specific roles
  const dashboards = [{
    id: "matricula",
    component: <MatriculaDashboard onBack={() => setExpandedDashboard(null)} />
  }, {
    id: "pedagogico",
    component: <PedagogicoDashboard onBack={() => setExpandedDashboard(null)} />
  }, {
    id: "secretaria",
    component: <SecretariaDashboard onBack={() => setExpandedDashboard(null)} />
  }, {
    id: "agenda",
    component: <ConsultorAgenda onBack={() => setExpandedDashboard(null)} />
  }];

  // Handle expanded dashboard display
  if (expandedDashboard) {
    const dashboard = dashboards.find(d => d.id === expandedDashboard);
    return dashboard ? dashboard.component : null;
  }
  return <div className="min-h-screen bg-gradient-to-br from-white to-red-50">
      <div className="flex items-center justify-between p-4">
        <Header showAI={showAI} setShowAI={setShowAI} schoolName={schoolHeader?.schoolName} />
        <div className="flex items-center space-x-4">
          <Link to="/auth">
            <Button variant="outline">Entrar no Sistema</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "dashboard" && <>
            <WelcomeSection />
            <CarouselSection />
            <QuickActions setActiveSection={setActiveSection} />
            <Separator className="my-8" />
            <DashboardGrid setExpandedDashboard={setExpandedDashboard} />
          </>}

        {activeSection === "tickets" && <TicketSystem onBack={() => setActiveSection("dashboard")} />}

        {activeSection === "agenda" && <ConsultantInfo onBack={() => setActiveSection("dashboard")} />}

        {activeSection === "plan" && <ProjectPlan onBack={() => setActiveSection("dashboard")} />}

        {/* AI Assistant */}
        {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
      </div>
      <Footer />
    </div>;
};
export default Index;