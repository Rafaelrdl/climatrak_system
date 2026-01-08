---
name: trakservice-scaffold-backend
description: Scaffolding do backend do TrakService (Django/DRF) com feature gating, migrations e testes.
argument-hint: Informe quais sub-features (dispatch/tracking/routing/km/quotes) e entidades principais
---

Objetivo: criar/estruturar o backend do módulo TrakService no ClimaTrak.

Requisitos obrigatórios:
- App Django em backend/apps/trakservice/ (ou seguir o padrão existente do repo).
- DRF endpoints para a sub-feature solicitada.
- Permission/guard: FeatureRequired("trakservice.<feature>") (não confiar só no frontend).
- Multi-tenant seguro (schema atual), sem acesso cross-tenant.
- Eventos via Outbox (se aplicável).
- Testes: pelo menos 1 teste garantindo que feature OFF retorna 403/404.

Entregáveis:
1) Estrutura de pastas/arquivos do app
2) Models/serializers/views/urls/services
3) Migrações
4) Testes
5) Atualização de docs/api e docs/events (se criar endpoints/eventos)

Agora gere o scaffold para a sub-feature descrita pelo usuário.
