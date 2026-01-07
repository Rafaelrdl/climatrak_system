# Documentação Frontend — ClimaTrak System

Este diretório descreve a arquitetura e o plano de entrega do frontend (React/Vite/TS/Tailwind) do ClimaTrak System.

## Referência crítica (Design System)
- ✅ **Design System (obrigatório):** [DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)

> Este documento deve ser consultado sempre que houver dúvidas sobre cores, componentes, espaçamentos,
> tipografia, padrões visuais, densidade de informação, responsividade (desktop/ultrawide) ou decisões de UX.
> Em caso de conflito entre implementações e padrões visuais/UX, priorize o **DESIGN_SYSTEM.md**.

---

## Comece por aqui (TrakLedger UI)
- [MVP UI Spec — TrakLedger](TrakLedger/00-mvp-spec-ui.md)
- [Roadmap UI — TrakLedger](TrakLedger/01-roadmap-ui.md)
- [IA (Info Architecture) e Rotas](TrakLedger/02-ia-rotas.md)
- [Componentes Base (UI kit TrakLedger)](TrakLedger/03-componentes-base.md)
- [Hooks/Services (React Query + API)](TrakLedger/04-hooks-services.md)
- [Telas e Fluxos (passo a passo)](TrakLedger/05-telas-fluxos.md)
- [RBAC (permissões)](TrakLedger/06-rbac-permissoes.md)
- [Testes E2E](TrakLedger/07-tests-e2e.md)

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
