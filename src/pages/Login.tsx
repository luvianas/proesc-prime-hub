import { useEffect, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Login - Portal Prime";
    const meta = document.querySelector("meta[name='description']");
    if (meta) meta.setAttribute("content", "Faça login para acessar o Portal Prime.");
  }, []);

  if (session) return <Navigate to="/admin" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas. Tente novamente.");
      return;
    }
    toast.success("Login realizado com sucesso");
    navigate("/admin", { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white to-red-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acessar o Portal Prime</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex.: lucasviana@proesc.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Use as credenciais: lucasviana@proesc.com / proesc123 ou marcos.souza@proesc.com / proesc123
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <Link to="/">Voltar para a página inicial</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
