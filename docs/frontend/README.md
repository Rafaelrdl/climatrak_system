# Documentação Frontend — ClimaTrak System

Este diretório descreve a arquitetura e o plano de entrega do frontend (React/Vite/TS/Tailwind) do ClimaTrak System.

## Referência crítica (Design System)
- ✅ **Design System (obrigatório):** [DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)

> Este documento deve ser consultado sempre que houver dúvidas sobre cores, componentes, espaçamentos,
> tipografia, padrões visuais, densidade de informação, responsividade (desktop/ultrawide) ou decisões de UX.
> Em caso de conflito entre implementações e padrões visuais/UX, priorize o **DESIGN_SYSTEM.md**.

---

## Comece por aqui (Finance UI)
- [MVP UI Spec — Finance](finance/00-mvp-spec-ui.md)
- [Roadmap UI — Finance](finance/01-roadmap-ui.md)
- [IA (Info Architecture) e Rotas](finance/02-ia-rotas.md)
- [Componentes Base (UI kit Finance)](finance/03-componentes-base.md)
- [Hooks/Services (React Query + API)](finance/04-hooks-services.md)
- [Telas e Fluxos (passo a passo)](finance/05-telas-fluxos.md)
- [RBAC (permissões)](finance/06-rbac-permissoes.md)
- [Testes E2E](finance/07-tests-e2e.md)

---

## Execução (GitHub)
- [Backlog de Issues — Frontend](delivery/01-backlog-issues-frontend.md)
- [Setup de labels/milestones](delivery/02-github-setup-frontend.md)

---

## Convenções gerais do Frontend
- Plataforma (não website): **viewport fixo**, contexto permanente e informação densa quando aplicável
- Desktop-first e ultrawide-ready
- Componentes: shadcn/ui + Radix + Tailwind
- Dados: React Query + services tipados + estados (loading/empty/error) padronizados
