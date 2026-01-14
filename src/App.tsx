import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import AdminLayout from "@/components/layouts/AdminLayout";
import SchoolSelector from "@/components/SchoolSelector";
import SchoolViewer from "@/components/SchoolViewer";
import AdminDashboard from "@/components/AdminDashboard";
import { AdminSchoolProvider } from "@/hooks/useAdminSchoolContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <AdminSchoolProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Auth />} />
                
                {/* Gestor routes - all render Index.tsx */}
                <Route path="/inicio" element={<Index />} />
                <Route path="/acompanhar-tickets" element={<Index />} />
                <Route path="/acompanhar-tickets/:id" element={<Index />} />
                <Route path="/agenda-consultor" element={<Index />} />
                <Route path="/dashboard/financeiro" element={<Index />} />
                <Route path="/dashboard/agenda" element={<Index />} />
                <Route path="/dashboard/secretaria" element={<Index />} />
                <Route path="/dashboard/pedagogico" element={<Index />} />
                <Route path="/estudo-mercado" element={<Index />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminLayout><SchoolSelector /></AdminLayout>} />
                <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                <Route path="/admin/school/:schoolId" element={<AdminLayout><SchoolViewer /></AdminLayout>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AdminSchoolProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
