---
applyTo: "backend/**"
---

## Backend — Django/DRF/Celery
- Use ViewSets e Routers (evite APIView).
- Sempre crie: serializer + filtros + testes.
- Service layer para regras (não “enterrar” regra no serializer/view).
- Multi-tenant: nunca faça acesso fora do schema do tenant.
- Ao criar model:
  - migration
  - índices essenciais (especialmente no ledger do finance)
  - testes

## Eventos
- Use Outbox (domain_event_outbox).
- Consumidores Celery: idempotentes + retry/backoff.
