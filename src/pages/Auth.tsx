import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
const Auth = () => {
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const {
    signIn,
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const { theme } = useTheme();
  useEffect(() => {
    document.title = "Prime Hub - Login";
    const desc = document.querySelector('meta[name="description"]');
    const content = "Faça login para acessar o Sistema de Controle.";
    if (desc) {
      desc.setAttribute("content", content);
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);
  if (user) {
    return <Navigate to="/" replace />;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem('auth_remember', rememberMe ? 'true' : 'false');
    const { error } = await signIn(loginData.email, loginData.password);
    setLoading(false);
  };
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao entrar com Google",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast({
        title: "Email necessário",
        description: "Digite seu email para recuperar a senha",
        variant: "destructive"
      });
      return;
    }
    try {
      setLoading(true);
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir a senha"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar email de recuperação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center auth-background p-4 select-none">
      <div className="w-full max-w-3xl mb-8 flex items-center justify-center animate-fade-up pointer-events-none">
        <img
          src={theme === 'dark' ? '/lovable-uploads/4fdb5121-3424-463f-8412-5c406b323a94.png' : '/lovable-uploads/0626a168-f24c-4b7a-b03d-5aa945b1314a.png'}
          alt="Logomarca Proesc Prime"
          className="h-20 md:h-24 object-contain"
          loading="eager"
          width={512}
          height={128}
          draggable={false}
        />
      </div>
      
      <Card className="w-full max-w-md auth-card animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gradient">Proesc Prime Hub</h1>
          <CardDescription className="text-base">Entre para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
              <Input 
                id="login-email" 
                type="email" 
                value={loginData.email} 
                onChange={e => setLoginData({
                  ...loginData,
                  email: e.target.value
                })} 
                required 
                className="border-glow transition-all duration-300 focus:shadow-glow"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={e => setLoginData({
                  ...loginData,
                  password: e.target.value
                })}
                required
                className="border-glow transition-all duration-300 focus:shadow-glow"
              />
              
              <div className="flex items-center justify-between pt-2 text-sm">
                <label htmlFor="show-password" className="flex items-center gap-2 cursor-pointer hover-scale">
                  <Checkbox 
                    id="show-password" 
                    checked={showPassword} 
                    onCheckedChange={(v) => setShowPassword(Boolean(v))} 
                    className="border-glow"
                  />
                  <span>Mostrar senha</span>
                </label>
                
                <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer hover-scale">
                  <Checkbox 
                    id="remember-me" 
                    checked={rememberMe} 
                    onCheckedChange={(v) => setRememberMe(Boolean(v))} 
                    className="border-glow"
                  />
                  <span>Permanecer logado</span>
                </label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full btn-elegant text-white font-medium py-3" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            
            <Button 
              type="button" 
              variant="link" 
              className="w-full text-sm hover:text-primary transition-colors" 
              onClick={handleForgotPassword} 
              disabled={loading}
            >
              Esqueci minha senha
            </Button>
            
            <div className="relative my-6">
              <Separator className="bg-border/40" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground border border-border/20 rounded-full">
                ou
              </span>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full hover-lift border-glow py-3" 
              onClick={handleGoogleLogin} 
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-medium">Entrar com Google</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default Auth;