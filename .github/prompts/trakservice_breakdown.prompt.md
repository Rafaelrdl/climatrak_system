---
name: trakservice-breakdown
description: Quebra um EPIC do TrakService em issues pequenas (1 issue -> 1 PR -> 1 entrega verificável).
argument-hint: Selecione o texto do EPIC (markdown) e rode /trakservice-breakdown
---

Você é Tech Lead/PM do ClimaTrak (repo-first).
Use o texto selecionado abaixo como fonte do EPIC:

${selection}

Tarefa:
1) Gere uma lista de 6 a 10 issues, na ordem ideal de entrega.
2) Cada issue deve conter:
   - Título (prefixo [TrakService])
   - Objetivo (3 bullets)
   - Escopo / Fora de escopo
   - Contratos de API (request/response + erros) e Eventos (se aplicável)
   - Paths impactados (backend/frontend/mobile/docs)
   - Checklist DoD (migrações, testes, docs, comandos)
3) Garanta:
   - Feature gating (tenant features) em todas as rotas do TrakService
   - Multi-tenant seguro (sem vazamento cross-tenant)
   - Padrão Outbox + idempotência
   - UI aderente ao design_system.md

Formato de saída:
- Markdown pronto para colar no GitHub (uma seção por issue).
