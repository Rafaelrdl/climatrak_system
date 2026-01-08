---
name: trakservice-scaffold-frontend
description: Scaffolding do frontend do TrakService (React/Vite/TS) com navbar gating e padrão visual.
argument-hint: Informe a tela/fluxo (ex: "Dispatch board semana", "Mapa de técnicos", "Quotes list")
---

Objetivo: criar telas/componentes do TrakService no frontend.

Requisitos:
- Seguir `design_system.md` (ou `docs/design_system.md`) e reutilizar componentes/padrões existentes.
- Rotas e itens de navbar devem respeitar tenant features (trakservice.*).
- Tratar estados: loading/empty/error, e 403/feature disabled com fallback adequado.
- Sem duplicar componentes que já existam no repo.

Entregáveis:
- Estrutura em frontend/src/modules/trakservice/
- Rotas + guards
- Componentes principais e serviços de API
- Atualizações na navbar
- Checklist de testes (mínimo smoke + unit onde fizer sentido)
