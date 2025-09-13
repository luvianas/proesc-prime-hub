import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface GestorLayoutProps {
  children: ReactNode;
}

export default function GestorLayout({ children }: GestorLayoutProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'gestor') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}