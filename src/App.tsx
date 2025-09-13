import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import AdminLayout from "@/components/layouts/AdminLayout";
import GestorLayout from "@/components/layouts/GestorLayout";
import SchoolSelector from "@/components/SchoolSelector";
import SchoolViewer from "@/components/SchoolViewer";
import AdminDashboard from "@/components/AdminDashboard";
import { AdminSchoolProvider } from "@/hooks/useAdminSchoolContext";

// Gestor Pages
import GestorHomePage from "./pages/gestor/GestorHomePage";
import GestorTicketsPage from "./pages/gestor/GestorTicketsPage";
import GestorAgendaPage from "./pages/gestor/GestorAgendaPage";
import GestorDashboardPages, { GestorMarketAnalysisPage } from "./pages/gestor/GestorDashboardPages";
import GestorTicketDetailsPage from "./pages/gestor/TicketDetailsPage";

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
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminLayout><SchoolSelector /></AdminLayout>} />
                <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                <Route path="/admin/school/:schoolId" element={<AdminLayout><SchoolViewer /></AdminLayout>} />
                
                {/* Gestor routes */}
                <Route path="/inicio" element={<GestorLayout><GestorHomePage /></GestorLayout>} />
                <Route path="/acompanhar-tickets" element={<GestorLayout><GestorTicketsPage /></GestorLayout>} />
                <Route path="/acompanhar-tickets/:ticketId" element={<GestorLayout><GestorTicketDetailsPage /></GestorLayout>} />
                <Route path="/agenda-consultor" element={<GestorLayout><GestorAgendaPage /></GestorLayout>} />
                <Route path="/dashboard/:type" element={<GestorLayout><GestorDashboardPages /></GestorLayout>} />
                <Route path="/estudo-mercado" element={<GestorLayout><GestorMarketAnalysisPage /></GestorLayout>} />
                
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
