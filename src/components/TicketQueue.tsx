import { ArrowLeft, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TicketQueueProps {
  onBack: () => void;
}

const mockQueue = [
  { id: "TCK-1042", title: "Erro no lançamento de notas", position: 1, waiting: "00:05" },
  { id: "TCK-1041", title: "Dúvida sobre matrícula 2025", position: 2, waiting: "00:12" },
  { id: "TCK-1039", title: "Acesso do professor bloqueado", position: 3, waiting: "00:24" },
];

export default function TicketQueue({ onBack }: TicketQueueProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ListChecks className="h-5 w-5" /> Fila de Tickets
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordem de Atendimento</CardTitle>
          <CardDescription>Visualize sua posição e tempo estimado de espera</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockQueue.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">Protocolo {t.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Posição #{t.position}</p>
                <p className="text-xs text-muted-foreground">Espera {t.waiting} min</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
