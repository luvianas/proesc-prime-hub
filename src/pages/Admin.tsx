import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SchoolsPanel from "./admin/SchoolsPanel";
import UsersPanel from "./admin/UsersPanel";

const Admin = () => {
  const { profile, loading, session } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [active, setActive] = useState<"usuarios" | "escolas">("escolas");

  useEffect(() => {
    document.title = "Admin - Portal Prime";
    const meta = document.querySelector("meta[name='description']");
    if (meta) meta.setAttribute("content", "Administração do Portal Prime para escolas e usuários.");
  }, []);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Acesso negado</h1>
          <p className="mt-2">Você precisa ser admin para acessar esta página.</p>
        </Card>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Administração do Portal</h1>
      </header>

      <div className="flex gap-6">
        <aside className="w-60 shrink-0">
          <nav aria-label="Administração" className="space-y-2">
            <Button
              variant={active === "usuarios" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setActive("usuarios")}
            >
              Usuários
            </Button>
            <Button
              variant={active === "escolas" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setActive("escolas")}
            >
              Escolas
            </Button>
          </nav>
        </aside>

        <section className="flex-1">
          {active === "usuarios" ? <UsersPanel /> : <SchoolsPanel />}
        </section>
      </div>
    </main>
  );
};

export default Admin;
