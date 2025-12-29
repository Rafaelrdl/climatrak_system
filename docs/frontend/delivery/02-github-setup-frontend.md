# Setup GitHub — Frontend (ClimaTrak System)

Este documento define como organizar o trabalho do **frontend** no GitHub:
- labels, milestones e project board
- templates de issue e PR
- Definition of Done (DoD)
- regras de UI/UX obrigatórias (Design System)

> Fonte da verdade de UI/UX: `design_system.md` (prioridade CRÍTICA)
> Fonte da verdade de escopo Finance UI: `docs/frontend/finance/*`
> Backlog Finance UI: `docs/frontend/delivery/01-backlog-issues-frontend.md`

---

## 1) Labels recomendadas (Frontend)

### 1.1 Tipo
- `frontend`
- `feature`
- `bug`
- `refactor`
- `tech-debt`
- `performance`
- `a11y`
- `tests`
- `docs`

### 1.2 Domínio (capabilidades do sistema único)
- `finance`
- `cmms`
- `monitor`
- `shared-ui` (componentes/shared infra)

### 1.3 Design e UX
- `design-system` (mudança/ajuste que afeta padrões visuais)
- `ui-polish` (polimento, consistência, microinterações)
- `ux-flow` (fluxo: wizard, etapas, jornada de usuário)

### 1.4 Status (opcional, se não usar Project)
- `blocked`
- `needs-api`
- `needs-design`
- `ready`
- `in-review`

---

## 2) Milestones (Frontend)

Crie milestones alinhadas ao roadmap de UI (Finance) e reaproveite para CMMS/Monitor:

### Finance UI
- `FE-M0 - Fundação (Finance UI base)`
- `FE-M1 - Painel do mês`
- `FE-M2 - Orçamentos + Cadastros`
- `FE-M3 - Ledger + ajustes`
- `FE-M4 - Integração OS (Custos)`
- `FE-M5 - Compromissos + Economia`
- `FE-M6 - Polimento + E2E`
- `FE-M7 - Energia (v2)`

> Dica: Issues “FE-FIN-xxx” devem entrar nessas milestones.

---

## 3) Project (Kanban) recomendado

Crie um GitHub Project (Board) chamado:
**“ClimaTrak Frontend Delivery”**

### Colunas sugeridas
- Backlog
- Ready
- In Progress
- Blocked
- In Review
- Done

### Regras operacionais
- 1 issue = 1 PR (sempre que possível)
- PR pequeno (mudança focada)
- Movimentação:
  - “Ready” somente quando a issue tem escopo e aceite claros
  - “Blocked” precisa explicar o bloqueio no corpo da issue

---

## 4) Convenções para Issues (Frontend)

### 4.1 Prefixos de Issue
- Finance: `FE-FIN-###`
- CMMS: `FE-CMMS-###`
- Monitor: `FE-MON-###`
- Shared/UI Infra: `FE-UI-###`

### 4.2 Estrutura mínima da issue
Toda issue deve conter:
- Objetivo (1–2 frases)
- Escopo / fora de escopo
- Referências em docs (links/paths)
- Critérios de aceite
- Checklist técnico

### 4.3 Link obrigatório para Design System
Quando a issue envolve UI/UX/Componentes:
- adicionar em “Referências”:
  - `design_system.md`
  - e o doc específico (ex.: `docs/frontend/finance/03-componentes-base.md`)

---

## 5) Templates de Issue (recomendado)

Crie em `.github/ISSUE_TEMPLATE/`:

### 5.1 Feature (Frontend)
Arquivo: `.github/ISSUE_TEMPLATE/frontend_feature.md`

```md
---
name: Frontend Feature
about: Nova funcionalidade de UI/UX
title: "[FE-XXX] "
labels: ["frontend","feature"]
---

## Objetivo

## Escopo

## Fora de escopo

## Referências
- design_system.md
- docs/frontend/...

## Critérios de aceite
- [ ]

## Checklist técnico
- [ ] Rotas e navegação
- [ ] Componentes reutilizáveis (se aplicável)
- [ ] Hooks/Services + React Query keys
- [ ] Estados: loading/empty/error
- [ ] Permissões (RBAC)
- [ ] Testes (vitest/e2e quando necessário)
- [ ] Docs atualizados (se mudou contrato/fluxo)
