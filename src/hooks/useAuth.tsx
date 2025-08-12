import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'user' | 'gestor' | null;
  mustChangePassword: boolean;
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const { toast } = useToast();
  const expiryTimeout = useRef<number | undefined>(undefined);
  const REMEMBER_KEY = 'auth_remember';
  const EXPIRY_KEY = 'auth_expiry';

  const clearExpiryTimer = () => {
    if (expiryTimeout.current) {
      window.clearTimeout(expiryTimeout.current);
      expiryTimeout.current = undefined;
    }
  };

  const scheduleExpiry = (sess: Session | null) => {
    clearExpiryTimer();
    if (!sess) {
      localStorage.removeItem(EXPIRY_KEY);
      return;
    }

    const remember = localStorage.getItem(REMEMBER_KEY) === 'true';
    if (remember) {
      localStorage.removeItem(EXPIRY_KEY);
      return;
    }

    const now = Date.now();
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    let target = Number(localStorage.getItem(EXPIRY_KEY));
    if (!target || isNaN(target) || target < now) {
      target = now + FORTY_EIGHT_HOURS;
      localStorage.setItem(EXPIRY_KEY, String(target));
    }
    const delay = Math.max(0, target - now);
    expiryTimeout.current = window.setTimeout(() => {
      // Safe to call outside of auth callback
      supabase.auth.signOut();
    }, delay);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setTimeout(() => scheduleExpiry(session ?? null), 0);
        if (session?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(async () => {
            try {
              const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('role, must_change_password')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              setUserRole(profile?.role || 'user');
              setMustChangePassword(Boolean(profile?.must_change_password));
            } catch (error) {
              console.error('Error fetching user role:', error);
              setUserRole('user');
            }
            setLoading(false);
          }, 0);
        } else {
          setUserRole(null);
          setMustChangePassword(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setTimeout(() => scheduleExpiry(session ?? null), 0);
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: profile } = await (supabase as any)
              .from('profiles')
              .select('role, must_change_password')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            setUserRole(profile?.role || 'user');
            setMustChangePassword(Boolean(profile?.must_change_password));
          } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRole('user');
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
        setMustChangePassword(false);
      }
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
    clearExpiryTimer();
    localStorage.removeItem(EXPIRY_KEY);
    // não removemos REMEMBER_KEY para manter a preferência do usuário
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      mustChangePassword,
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