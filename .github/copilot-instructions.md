# Copilot Instructions — ClimaTrak System (Monorepo)

Plataforma multi-tenant para **CMMS** (manutenção), **Monitoramento IoT/HVAC** e **Finance** (Orçamento Vivo).

## Arquitetura Principal

```
backend/          Django 5 + DRF + Celery + django-tenants
frontend/         React 19 + Vite 6 + TypeScript + Tailwind + shadcn/ui
infra/            Docker Compose (PostgreSQL+TimescaleDB, Redis, EMQX, MinIO)
docs/             Especificações (MVP, ERD, APIs, eventos)
```

**Multi-tenancy**: Cada tenant = schema PostgreSQL isolado via `django-tenants`. Apps em `backend/apps/` são tenant-specific (exceto `tenants`, `ops`, `public_identity`).

**Fluxo IoT**: MQTT → EMQX → webhook HTTP → `POST /ingest` → normaliza em hypertable TimescaleDB.

## Documentação de Referência (obrigatória)
- Specs gerais: `docs/README.md` → `docs/backend/`, `docs/frontend/`
- Finance: `docs/backend/finance/` (MVP, ERD, regras-negocio)
- Eventos: `docs/backend/events/` (contrato Outbox)
- Design System: `docs/design/DESIGN_SYSTEM.md` (UI/UX obrigatório)

## Comandos Essenciais

```bash
# Backend (Docker)
make dev          # Sobe infraestrutura (docker compose)
make migrate      # migrate_schemas (multi-tenant)
make seed         # Tenant dev: umc.localhost / owner@umc.localhost / Dev@123456
make test         # pytest apps/ -v
make fmt          # black + ruff

# Frontend
cd frontend && npm run dev    # localhost:5173 (proxy → backend)
npm test                      # vitest
npm run cy:open               # cypress e2e
```

## Padrões Backend (Django/DRF)

**Service Layer**: Regras de negócio em services, não em views/serializers.
```python
# backend/apps/cmms/services.py
class WorkOrderService:
    @classmethod
    def close_work_order(cls, work_order, tenant_id, ...):
        with transaction.atomic():
            # lógica + EventPublisher.publish(...)
```

**Eventos (Outbox)**: Gravar evento na mesma transação do agregado.
```python
from apps.core_events.services import EventPublisher
EventPublisher.publish(
    tenant_id=tenant_id,
    event_name='work_order.closed',
    aggregate_type='work_order',
    aggregate_id=work_order.id,
    data={...}
)
```

**Idempotência Finance**: `idempotency_key` unique por tenant (ex: `wo:{id}:labor`).

## Padrões Frontend (React/TypeScript)

**Services tipados**: `frontend/src/services/` (um por domínio).

**React Query com query keys factories**:
```typescript
// frontend/src/hooks/useAssetTypesQuery.ts
export const assetTypeKeys = {
  all: ['assetTypes'] as const,
  list: () => [...assetTypeKeys.all, 'list'] as const,
};
export function useAssetTypes() {
  return useQuery({ queryKey: assetTypeKeys.list(), queryFn: ... });
}
```

**UI**: shadcn/ui + Radix, ícones Lucide, gráficos Recharts. Reutilizar componentes existentes.

**Platform-first**: Viewport fixo (100vh), densidade alta, desktop-first. Seguir `DESIGN_SYSTEM.md`.

## Regras Críticas

1. **Multi-tenant**: Nunca vazar dados entre tenants. Queries operam no schema correto automaticamente via middleware.
2. **Eventos**: Consumidores Celery idempotentes com retry/backoff.
3. **Finance**: Ledger (CostTransaction) é fonte da verdade. Mês locked → apenas adjustments.
4. **Models**: Sempre gerar migration + testes.
5. **PRs**: Pequenos, 1 issue por PR.

## Workflow de Implementação

1. Consultar spec em `docs/`
2. Listar arquivos a alterar/criar
3. Implementar (código + migration + testes)
4. Testar: `make test` (backend), `npm test` (frontend)
5. Atualizar docs se mudar contrato de API/eventos
