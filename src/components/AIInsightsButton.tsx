import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIInsightsButtonProps {
  label?: string;
  question?: string;
  cardId?: number;
  dashboardUrl?: string;
  dashboardType?: 'financeiro' | 'agenda' | 'secretaria' | 'pedagogico';
}

const AIInsightsButton = ({ label = "IA: Explicar", question = "Explique os principais insights deste dashboard", cardId, dashboardUrl, dashboardType }: AIInsightsButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string>("");

  const runInsights = async () => {
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const { data, error } = await supabase.functions.invoke('prime-metabase-insights', {
        body: { question, cardId, dashboardUrl, dashboardType },
      });
      if (error) throw error;
      setAnswer((data as any)?.answer || "Sem resposta da IA.");
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
            <DialogTitle>💡 Insights da IA</DialogTitle>
            <DialogDescription>Análise inteligente personalizada para esta dashboard</DialogDescription>
          </DialogHeader>
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
