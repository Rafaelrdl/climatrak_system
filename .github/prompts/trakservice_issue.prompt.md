---
name: trakservice-issue
description: Gera uma issue completa do TrakService a partir de uma descrição curta.
argument-hint: Descreva a feature (ex: "KM rodado diário por técnico com relatório")
---

Crie uma issue GitHub para a feature do TrakService descrita pelo usuário.
Regras:
- 1 issue -> 1 PR -> 1 entrega verificável
- Incluir feature gating por tenant + bloqueio no backend
- Multi-tenant seguro (django-tenants)
- Seguir design_system.md nas telas
- Se houver efeitos financeiros, integrar com Finance via ledger (idempotente) e documentar

Saída obrigatória (Markdown):
- Título
- Contexto
- Objetivo
- Escopo / Fora de escopo
- Contratos (API/Eventos)
- Plano de execução com paths impactados
- Checklist DoD
- Plano de testes (unit/integration/e2e quando aplicável)

Pergunta do usuário (feature):
