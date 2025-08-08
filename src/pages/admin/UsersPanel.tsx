import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UsersPanel = () => {
  const seedAdmins = async () => {
    const res = await supabase.functions.invoke("seed-admins", { method: "POST" });
    if ((res as any).error) return toast.error("Falha ao criar admins");
    toast.success("Admins criados/atualizados");
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Crie e personalize os usuários do painel. Você pode usar o botão abaixo
            para criar/atualizar usuários administradores padrão.
          </p>
          <Button onClick={seedAdmins}>Criar usuários admin padrão</Button>
        </CardContent>
      </Card>
    </section>
  );
};

export default UsersPanel;
