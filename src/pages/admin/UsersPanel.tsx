import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "admin" | "gestor";

interface SchoolOption {
  id: string;
  school_id: string | null;
  school_name: string;
}

const UsersPanel = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("gestor");
  const [schoolId, setSchoolId] = useState<string | undefined>();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("school_customizations")
        .select("id,school_id,school_name")
        .order("school_name", { ascending: true });
      if (error) {
        console.error(error);
        toast.error("Erro ao carregar escolas");
        return;
      }
      setSchools((data as any) ?? []);
    })();
  }, []);

  const seedAdmins = async () => {
    const res = await supabase.functions.invoke("seed-admins", { method: "POST" });
    if ((res as any).error) return toast.error("Falha ao criar admins");
    toast.success("Admins criados/atualizados");
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("gestor");
    setSchoolId(undefined);
  };

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("Preencha todos os campos obrigatórios");
    if (role === "gestor" && !schoolId) return toast.error("Selecione a escola do gestor");

    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke("create-user", {
        method: "POST",
        body: {
          name,
          email,
          password,
          role,
          school_id: role === "gestor" ? schoolId : null,
        },
      });
      if (error) {
        console.error(error);
        toast.error(error.message ?? "Falha ao criar usuário");
        return;
      }
      toast.success("Usuário criado com sucesso");
      setOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao criar usuário");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Crie e personalize os usuários do painel. Você pode usar os botões abaixo
            para criar novos usuários ou atualizar administradores padrão.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setOpen(true)}>+ Novo</Button>
            <Button variant="outline" onClick={seedAdmins}>Criar usuários admin padrão</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um usuário do tipo Admin ou Gestor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateUser} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label>Tipo de usuário</Label>
              <Select value={role} onValueChange={(v: Role) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "gestor" && (
              <div>
                <Label>Vincular à escola</Label>
                <Select value={schoolId} onValueChange={(v) => setSchoolId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a escola" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools
                      .filter((s) => !!s.school_id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.school_id as string}>
                          {s.school_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || (role === "gestor" && !schoolId)}>
                {submitting ? "Criando..." : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default UsersPanel;
