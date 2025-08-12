import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIInsightsButtonProps {
  label?: string;
  question?: string;
  cardId?: number;
  dashboardUrl?: string;
}

const AIInsightsButton = ({ label = "IA: Explicar", question = "Explique os principais insights deste dashboard", cardId, dashboardUrl }: AIInsightsButtonProps) => {
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
        body: { question, cardId, dashboardUrl },
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insights da IA</DialogTitle>
            <DialogDescription>Interpretação automática baseada nos dados do Metabase.</DialogDescription>
          </DialogHeader>
          <div className="min-h-[160px]">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando insights...
              </div>
            )}
            {!loading && error && (
              <div className="text-destructive">{error}</div>
            )}
            {!loading && !error && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{answer}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIInsightsButton;
