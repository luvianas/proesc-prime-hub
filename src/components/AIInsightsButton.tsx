import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface AIInsightsButtonProps {
  label?: string;
  question?: string;
  cardId?: number;
  dashboardUrl?: string;
  dashboardType?: 'financeiro' | 'agenda' | 'secretaria' | 'pedagogico';
  school_id?: string;
}

const AIInsightsButton = ({ label = "IA: Explicar", question = "Explique os principais insights deste dashboard", cardId, dashboardUrl, dashboardType, school_id }: AIInsightsButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dataQuality, setDataQuality] = useState<{
    hasMetabaseData: boolean;
    confidence: number;
    metabaseStatus: string;
    issues: string[];
  } | null>(null);

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      // Find the iframe containing the dashboard
      const iframe = document.querySelector('iframe[src*="graficos.proesc.com"]') as HTMLIFrameElement;
      
      if (!iframe) {
        toast.error("Dashboard não encontrado para captura");
        return null;
      }

      // Capture the iframe container (since we can't access iframe content due to CORS)
      const canvas = await html2canvas(iframe, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        scale: 1, // Lower scale for faster processing
        windowWidth: iframe.offsetWidth,
        windowHeight: iframe.offsetHeight,
      });

      // Convert to base64
      return canvas.toDataURL("image/jpeg", 0.8); // JPEG with 80% quality for smaller size
    } catch (e: any) {
      console.error("Screenshot capture error:", e);
      toast.error("Erro ao capturar dashboard");
      return null;
    }
  };

  const runInsights = async () => {
    setLoading(true);
    setError("");
    setAnswer("");
    setDataQuality(null);
    
    try {
      // Capture screenshot of dashboard
      const screenshot = await captureScreenshot();
      
      if (!screenshot) {
        throw new Error('Falha ao capturar screenshot do dashboard');
      }

      // Use school_id prop (admin view) or fetch from user profile (gestor view)
      let targetSchoolId = school_id;
      
      if (!targetSchoolId) {
        // Get current user's school
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.school_id) {
          throw new Error('Escola não encontrada para o usuário');
        }
        
        targetSchoolId = profile.school_id;
      }

      // Get school customizations to get proesc_id
      const { data: schoolData } = await supabase
        .from('school_customizations')
        .select('proesc_id')
        .eq('school_id', targetSchoolId)
        .single();

      if (!schoolData?.proesc_id) {
        throw new Error('ID Proesc não encontrado para a escola');
      }

      const { data, error } = await supabase.functions.invoke('prime-metabase-insights', {
        body: { 
          question, 
          screenshot, // Send base64 screenshot
          dashboardType,
          params: {
            proesc_id: schoolData.proesc_id,
            proescId: schoolData.proesc_id
          }
        },
      });
      
      if (error) throw error;
      
      const responseData = data as any;
      setAnswer(responseData?.answer || "Sem resposta da IA.");
      setDataQuality(responseData?.dataQuality || null);
      
      console.log("AI Insights Response:", {
        hasAnswer: !!responseData?.answer,
        dataQuality: responseData?.dataQuality,
        metadata: responseData?.metadata
      });
    } catch (e: any) {
      setError(e?.message || 'Falha ao obter insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setOpen(true); runInsights(); }} className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💡 Insights da IA
              {dataQuality && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  dataQuality.confidence >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  dataQuality.confidence >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {dataQuality.confidence}% confiança
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Análise inteligente personalizada para esta dashboard
              {dataQuality && !dataQuality.hasMetabaseData && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Análise baseada em conhecimento geral - dados específicos não disponíveis
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {dataQuality && dataQuality.issues && dataQuality.issues.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">⚠️ Avisos técnicos:</p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                {dataQuality.issues.map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando dados e gerando insights personalizados...
              </div>
            )}
            {!loading && error && (
              <div className="text-destructive bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="font-semibold">Erro ao gerar insights:</p>
                <p>{error}</p>
              </div>
            )}
            {!loading && !error && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                {answer}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIInsightsButton;
