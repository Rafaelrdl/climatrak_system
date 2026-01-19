# Documentação — ClimaTrak System

## Comece por aqui
- ✅ **Visão Geral do Produto (empresa + módulos):** [visao-geral.md](visao-geral.md)
- ✅ **Backend (Django / multi-tenant / ingest / eventos):** [backend/README.md](backend/README.md)
- ✅ **Observabilidade (logs, métricas, tracing):** [observability/README.md](observability/README.md)
- ✅ **Operações (admin, EMQX, sensores):** [operations/admin.md](operations/admin.md)

## Frontend
- ✅ **Documentação Frontend:** [development/frontend/README.md](development/frontend/README.md)
- ✅ **Design System (obrigatório):** [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)
- 🔐 **Política de Storage (XSS / multi-tenant):** [security/storage-policy.md](security/storage-policy.md)

## APIs (contratos)
- **Ingest (MQTT → HTTP / EMQX → Django):** [api/ingest.md](api/ingest.md)
- **Inventário:** [api/inventory.md](api/inventory.md)
- **Finance (TrakLedger):** [api/finance.md](api/finance.md)
- **TrakService:** [api/trakservice.md](api/trakservice.md)

## Eventos (Outbox)
- **Contrato de eventos:** [events/01-contrato-eventos.md](events/01-contrato-eventos.md)
- **Eventos do MVP:** [events/02-eventos-mvp.md](events/02-eventos-mvp.md)
- **Eventos TrakService:** [events/03-eventos-trakservice.md](events/03-eventos-trakservice.md)

## Finance (Orçamento Vivo / TrakLedger)
- **MVP Spec:** [finance/00-mvp-spec.md](finance/00-mvp-spec.md)
- **ERD:** [finance/01-erd.md](finance/01-erd.md)
- **Regras de negócio:** [finance/02-regras-negocio.md](finance/02-regras-negocio.md)
- **Visão do Produto (TrakLedger):** [backend/product/01-visao-produto.md](backend/product/01-visao-produto.md)
- **Personas e histórias (TrakLedger):** [backend/product/02-personas-e-historias.md](backend/product/02-personas-e-historias.md)

## Delivery
- **Roadmap:** [delivery/01-roadmap.md](delivery/01-roadmap.md)
- **Backlog (issues):** [delivery/02-backlog-issues.md](delivery/02-backlog-issues.md)
- **GitHub setup:** [delivery/03-github-setup.md](delivery/03-github-setup.md)
