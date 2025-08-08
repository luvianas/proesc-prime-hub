import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface ProjectPlanProps {
  onBack: () => void;
}

const ProjectPlan = ({ onBack }: ProjectPlanProps) => {
  const phases = [
    {
      phase: "Fase 1 - Infraestrutura Base",
      priority: "Alta",
      duration: "3-4 semanas",
      color: "destructive",
      tasks: [
        {
          title: "Login personalizado para cada gestor",
          description: "Implementar sistema de autenticação individualizado",
          details: [
            "Implementar autenticação com JWT/Session-based",
            "Criar middleware de autorização por entidade",
            "Desenvolver telas de login/logout personalizadas",
            "Implementar recuperação de senha",
            "Configurar políticas de segurança (rate limiting, HTTPS)"
          ],
          technologies: ["Supabase Auth", "Row Level Security (RLS)", "JWT", "bcrypt"],
          estimated: "2 semanas"
        },
        {
          title: "Incorporação de dashboards bloqueadas por entidade",
          description: "Dashboards segmentados por organização",
          details: [
            "Implementar filtros de dados por entidade no backend",
            "Criar componentes de dashboard com segurança por linha (RLS)",
            "Desenvolver carregamento automático baseado no perfil",
            "Implementar cache de dashboards por usuário",
            "Adicionar validação de permissões em tempo real"
          ],
          technologies: ["Supabase RLS", "React Query", "Chart.js/Recharts", "Redis Cache"],
          estimated: "2 semanas"
        }
      ]
    },
    {
      phase: "Fase 2 - Administração e Personalização",
      priority: "Alta",
      duration: "2-3 semanas",
      color: "default",
      tasks: [
        {
          title: "Página de administração para personalizações",
          description: "Interface administrativa completa",
          details: [
            "Criar painel administrativo com RBAC (Role-Based Access Control)",
            "Implementar upload e gerenciamento de logotipos",
            "Desenvolver editor de cores/temas em tempo real",
            "Criar sistema de permissões granulares",
            "Implementar preview de mudanças antes da aplicação",
            "Adicionar versionamento de configurações"
          ],
          technologies: ["React Hook Form", "Zod", "Color Picker", "File Upload", "Preview Mode"],
          estimated: "3 semanas"
        }
      ]
    },
    {
      phase: "Fase 3 - Integrações Externas",
      priority: "Média",
      duration: "2-3 semanas",
      color: "secondary",
      tasks: [
        {
          title: "Integração com Zendesk",
          description: "Sistema de suporte integrado",
          details: [
            "Configurar API do Zendesk com OAuth 2.0",
            "Implementar abertura de tickets diretamente do portal",
            "Criar interface para consulta de chamados existentes",
            "Implementar notificações de status de tickets",
            "Adicionar histórico de interações",
            "Configurar webhooks para atualizações em tempo real"
          ],
          technologies: ["Zendesk API", "OAuth 2.0", "Webhooks", "WebSocket", "Supabase Functions"],
          estimated: "2 semanas"
        },
        {
          title: "Acesso ao sistema Proesc",
          description: "Integração com sistema legado",
          details: [
            "Implementar SSO (Single Sign-On) com sistema Proesc",
            "Criar redirecionamento seguro com token de sessão",
            "Desenvolver iframe seguro ou popup para acesso",
            "Implementar logout coordenado entre sistemas",
            "Adicionar fallback para acesso direto caso necessário"
          ],
          technologies: ["SSO/SAML", "JWT Token Exchange", "Secure Redirect", "PostMessage API"],
          estimated: "1 semana"
        }
      ]
    }
  ];

  const technologies = [
    { name: "Frontend", items: ["React 18+", "TypeScript", "Tailwind CSS", "Shadcn/ui", "React Query"] },
    { name: "Backend", items: ["Supabase", "PostgreSQL", "Row Level Security", "Edge Functions"] },
    { name: "Autenticação", items: ["Supabase Auth", "JWT", "OAuth 2.0", "RBAC"] },
    { name: "Integrações", items: ["Zendesk API", "Webhooks", "SSO/SAML", "REST APIs"] },
    { name: "DevOps", items: ["Vercel", "GitHub Actions", "Environment Variables", "SSL/HTTPS"] }
  ];

  const testingStrategy = [
    "Testes unitários com Jest/Vitest para componentes críticos",
    "Testes de integração para APIs e autenticação",
    "Testes E2E com Playwright para fluxos principais",
    "Testes de segurança para validação de permissões",
    "Testes de performance para dashboards com grandes volumes de dados"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 hover:bg-primary/10"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Plano de Execução - Portal v1.2
          </h1>
          <p className="text-muted-foreground text-lg">
            Roadmap técnico detalhado para implementação das novas funcionalidades
          </p>
        </div>

        {/* Cronograma Geral */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cronograma Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <h3 className="font-semibold text-destructive">Fase 1</h3>
                <p className="text-sm text-muted-foreground">3-4 semanas</p>
                <p className="text-xs">Infraestrutura Base</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-primary">Fase 2</h3>
                <p className="text-sm text-muted-foreground">2-3 semanas</p>
                <p className="text-xs">Administração</p>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <h3 className="font-semibold text-secondary-foreground">Fase 3</h3>
                <p className="text-sm text-muted-foreground">2-3 semanas</p>
                <p className="text-xs">Integrações</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm"><strong>Duração Total Estimada:</strong> 7-10 semanas</p>
              <p className="text-sm"><strong>Entregas Incrementais:</strong> A cada 2 semanas</p>
            </div>
          </CardContent>
        </Card>

        {/* Fases do Projeto */}
        <div className="space-y-6 mb-8">
          {phases.map((phase, phaseIndex) => (
            <Card key={phaseIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{phase.phase}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={phase.color as any}>
                      Prioridade {phase.priority}
                    </Badge>
                    <Badge variant="outline">{phase.duration}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {phase.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{task.title}</h4>
                          <p className="text-muted-foreground">{task.description}</p>
                        </div>
                        <Badge variant="secondary">{task.estimated}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium mb-2">Tarefas Técnicas:</h5>
                          <ul className="space-y-1">
                            {task.details.map((detail, detailIndex) => (
                              <li key={detailIndex} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Tecnologias:</h5>
                          <div className="flex flex-wrap gap-1">
                            {task.technologies.map((tech, techIndex) => (
                              <Badge key={techIndex} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stack Tecnológico */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Stack Tecnológico Recomendado</CardTitle>
            <CardDescription>
              Tecnologias e ferramentas para otimizar o desenvolvimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technologies.map((category, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-semibold text-primary">{category.name}</h4>
                  <div className="space-y-1">
                    {category.items.map((item, itemIndex) => (
                      <Badge key={itemIndex} variant="secondary" className="mr-1 mb-1">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estratégia de Testes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Estratégia de Testes e Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testingStrategy.map((strategy, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">{strategy}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium mb-2">Critérios de Aceite:</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 100% das funcionalidades testadas</li>
                  <li>• Cobertura de código &gt; 80%</li>
                  <li>• Performance &lt; 3s carregamento</li>
                  <li>• Compatibilidade cross-browser</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">Entregas Incrementais:</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Sprint reviews a cada 2 semanas</li>
                  <li>• Deploy em ambiente de staging</li>
                  <li>• Validação com usuários piloto</li>
                  <li>• Documentação técnica atualizada</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectPlan;