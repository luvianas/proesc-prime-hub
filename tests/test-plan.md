# Plano de Teste Completo - Sistema Proesc Prime

## 1. Visão Geral do Sistema

### Arquitetura Identificada:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Auth + Database + Edge Functions)
- **Tipos de Usuário**: Admin, Gestor, User
- **Entidades**: Escolas (school_id como entidade_id)
- **Integrações**: Zendesk, Metabase, WhatsApp

### Fluxos Críticos Identificados:
1. Autenticação e autorização por role
2. Gestão de escolas (entidades)
3. Sistema de tickets Zendesk
4. Dashboards específicos por escola
5. Agenda do consultor
6. Upload de banners
7. Perfis de usuário

## 2. Validação de Entidade ID (Regra de Negócio Principal)

### Pontos de Validação Identificados:
- **school_id** é usado como entidade_id principal
- Componentes que requerem school_id:
  - NovidadesCarousel
  - TicketSystem 
  - ConsultorAgenda
  - Todos os dashboards
  - BannersManager

### Endpoints que devem validar entidade_id:
- `/zendesk-integration` (Edge Function)
- Queries em `school_customizations`
- Queries em `school_banners`
- Perfis de usuário (profiles)

## 3. Escopo de Teste por Categoria

### 3.1 Testes de UI (Varredura Completa)
- [ ] Todas as rotas: `/`, `/auth`, `/404`
- [ ] Dashboards por tipo de usuário (Admin, Gestor)
- [ ] Modais e dialogs
- [ ] Formulários de criação/edição
- [ ] Componentes interativos (carrosséis, dropdowns)

### 3.2 Testes de Formulários
- [ ] Login/Registro
- [ ] Criação de usuários
- [ ] Criação de escolas
- [ ] Upload de imagens/banners
- [ ] Edição de perfis

### 3.3 CRUD de Usuários
- [ ] Criar 50 usuários (admin, gestor)
- [ ] Vinculação a escolas
- [ ] Ativação/desativação
- [ ] Exclusão
- [ ] Validação de permissões

### 3.4 CRUD de Escolas/Entidades
- [ ] Criar 20 escolas com school_id único
- [ ] Associação de usuários
- [ ] Configurações específicas
- [ ] Isolamento por entidade

### 3.5 Fluxos Críticos
- [ ] Jornada do gestor (dashboard → tickets → agenda)
- [ ] Jornada do admin (gestão de usuários/escolas)
- [ ] Sistema de tickets Zendesk
- [ ] Visualização de dashboards Metabase

### 3.6 Testes de Concorrência
- [ ] Edição simultânea de perfis
- [ ] Upload simultâneo de banners
- [ ] Criação simultânea de usuários

### 3.7 Performance
- [ ] Carga de 50 req/s por 10 minutos
- [ ] Latência p50/p95/p99
- [ ] Taxa de erro < 1%

## 4. Critérios de Aceite

### Funcionais:
- [ ] Zero erros de console em fluxos principais
- [ ] 100% das chamadas incluem school_id quando necessário
- [ ] Isolamento correto por entidade
- [ ] Autorização funcional por role

### Performance:
- [ ] p95 ≤ 1.5s em rotas críticas
- [ ] Taxa de erro < 1% sob carga
- [ ] Sem memory leaks detectados

### Segurança:
- [ ] RLS funcionando corretamente
- [ ] Validação de entidade_id em todas as queries
- [ ] Não exposição de dados sensíveis

## 5. Ferramentas de Teste

### Automatização:
- Playwright para E2E
- Jest para unit tests
- Lighthouse para performance
- axe-core para acessibilidade

### Monitoramento:
- Console logs
- Network requests
- Supabase analytics
- Edge function logs

## 6. Matriz de Responsabilidades

| Componente | school_id obrigatório | Validação implementada | Status |
|------------|----------------------|------------------------|--------|
| GestorDashboard | ✅ | ✅ | OK |
| TicketSystem | ✅ | ✅ | OK |
| NovidadesCarousel | ✅ | ✅ | OK |
| ConsultorAgenda | ✅ | ✅ | OK |
| BannersManager | ✅ | ✅ | OK |
| AdminDashboard | ✅ | ✅ | OK |
| Edge Functions | ✅ | ⚠️ | VERIFICAR |

## 7. Cronograma de Execução

### Fase 1: Setup e Preparação (1h)
- [ ] Configurar ambiente de teste
- [ ] Preparar dados de teste
- [ ] Verificar credenciais

### Fase 2: Testes Funcionais (3h)
- [ ] Varredura de UI
- [ ] Testes de formulários
- [ ] CRUD completo

### Fase 3: Testes de Integração (2h)
- [ ] Fluxos end-to-end
- [ ] Validação de entidade_id
- [ ] Integrações externas

### Fase 4: Testes de Performance (2h)
- [ ] Carga e stress
- [ ] Métricas de performance
- [ ] Identificação de gargalos

### Fase 5: Correções e Regressão (2h)
- [ ] Implementar correções
- [ ] Executar regressão
- [ ] Validar critérios

## 8. Entregáveis

### Artefatos:
- [ ] Relatório de testes executados
- [ ] Lista de bugs encontrados e corrigidos
- [ ] Métricas de performance
- [ ] Recomendações de melhoria
- [ ] Suite de testes automatizados
- [ ] Documentação de validação de entidade_id

### Evidências:
- [ ] Screenshots de bugs
- [ ] Logs de console e network
- [ ] Vídeos de reprodução
- [ ] Relatórios de performance