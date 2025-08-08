import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'user' | 'gestor' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'gestor' | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 Auth useEffect iniciado');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 Buscando role do usuário:', session.user.id);
          // Fetch user profile to get role
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            console.log('👤 Role encontrado:', profile?.role);
            setUserRole(profile?.role || 'user');
          } catch (error) {
            console.error('❌ Erro ao buscar role:', error);
            setUserRole('user');
          }
        } else {
          console.log('🚪 Usuário deslogado');
          setUserRole(null);
        }
        
        console.log('✅ Finalizando loading');
        setLoading(false);
      }
    );

    // Check for existing session
    console.log('🔍 Verificando sessão existente');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Sessão existente:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('👤 Buscando role inicial:', session.user.id);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          console.log('👤 Role inicial encontrado:', profile?.role);
          setUserRole(profile?.role || 'user');
        } catch (error) {
          console.error('❌ Erro ao buscar role inicial:', error);
          setUserRole('user');
        }
      }
      
      console.log('✅ Finalizando loading inicial');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        }
      }
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado",
        description: "Verifique seu email para confirmar a conta.",
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};