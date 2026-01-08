# Copilot Instructions — ClimaTrak System (Monorepo)

Plataforma **multi-tenant** para:
- **TrakNor (CMMS)**: ativos, OS, planos, procedimentos, inventário, SLA
- **TrakSense (IoT/HVAC)**: ingest MQTT/HTTP, telemetria, alertas, dashboards
- **TrakLedger (Finance / Orçamento Vivo)**: ledger como fonte de verdade (custos/compromissos/ajustes)
- **TrakService (Field Service)**: despacho/agenda, rastreio com privacidade, roteirização + KM, orçamentos e ponte com Finance

## Arquitetura Principal

```
backend/          Django 5 + DRF + Celery + django-tenants
frontend/         React 19 + Vite 6 + TypeScript + Tailwind + shadcn/ui
mobile/           React Native/Expo + TypeScript + Expo Router + TanStack Query + Zustand
infra/            Docker Compose (PostgreSQL+TimescaleDB, Redis, EMQX, MinIO)
docs/             Especificações (MVP, ERD, APIs, eventos, delivery)
```

**Multi-tenancy**: cada tenant = schema PostgreSQL isolado via `django-tenants`.
Apps em `backend/apps/` são tenant-specific (exceto `tenants`, `ops`, `public_identity`).

**Fluxo IoT**: MQTT → EMQX → webhook HTTP → `POST /ingest` → normaliza em hypertable TimescaleDB.

## TrakService (Field Service) — regras base

O TrakService deve ser **plugável por tenant** (empresa com manutenção própria pode não ter TrakService).
Não basta esconder menu: é obrigatório **feature gating no frontend + bloqueio de endpoints no backend**.

### Feature gating (por tenant)

- Chaves de feature (mínimo): `trakservice.enabled`, `trakservice.dispatch`, `trakservice.tracking`, `trakservice.routing`, `trakservice.km`, `trakservice.quotes`
- **Frontend**: navbar/rotas só aparecem quando a feature está ON
- **Backend**: endpoints retornam 403/404 quando a feature está OFF

### Privacidade (tracking)

- Tracking deve respeitar **janela de trabalho** (por técnico/tenant) e não rastrear fora do permitido
- Persistir audit trail mínimo (device_id, recorded_at, accuracy/source). Evitar retenção excessiva (LGPD)

### Integração Finance (TrakLedger)

- Efeitos financeiros (ex.: quote aprovado → compromisso/lançamento) devem ser **idempotentes** via `idempotency_key` determinístico
- Respeitar **lock mensal**: não editar lançamentos locked → corrigir via adjustment

## Documentação de Referência (obrigatória)

- Specs gerais: `docs/README.md` → `docs/backend/`, `docs/frontend/`, `docs/delivery/`
- TrakLedger: `docs/backend/trakledger/` (MVP, ERD, regras de negócio)
- Eventos (Outbox): `docs/backend/events/` (contratos + versionamento)
- Design System (UI/UX obrigatório): `docs/design/DESIGN_SYSTEM.md`
- TrakService (manter atualizado): `docs/api/trakservice.md`, `docs/events/trakservice.md`

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

# Mobile
cd mobile && npm start        # Expo dev server
npm test                      # jest
```

## Padrões Backend (Django/DRF)

**Service Layer**: regras de negócio em services, não em views/serializers.
```python
# backend/apps/cmms/services.py
class WorkOrderService:
    @classmethod
    def close_work_order(cls, work_order, tenant_id, ...):
        with transaction.atomic():
            # lógica + EventPublisher.publish(...)
```

**Feature gating (obrigatório no TrakService)**: todo endpoint do TrakService deve exigir feature ON.
```python
# Exemplo conceitual (ajustar para o helper real do repo)
permission_classes = [IsAuthenticated, FeatureRequired("trakservice.tracking")]
```

**Eventos (Outbox)**: gravar evento na mesma transação do agregado.
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

**Idempotência TrakLedger**: `idempotency_key` unique por tenant (ex: `wo:{id}:labor`). Nunca duplicar efeito ao reprocessar consumer/outbox.

## Padrões Frontend (React/TypeScript)

**Services tipados**: `frontend/src/services/` (um por domínio).

**React Query com query keys factories**:
```typescript
export const assetTypeKeys = {
  all: ['assetTypes'] as const,
  list: () => [...assetTypeKeys.all, 'list'] as const,
};
```

**Feature gating (TrakService)**:
- Navbar: itens condicionais por tenant.features.trakservice.*
- Rotas: guard para bloquear acesso direto via URL
- Estado "feature disabled": tela padrão (403/Not available)

**UI (obrigatório)**: shadcn/ui + Radix, ícones Lucide, gráficos Recharts. Seguir `docs/design/DESIGN_SYSTEM.md` e reutilizar componentes existentes.

**Platform-first**: viewport fixo (100vh), densidade alta, desktop-first.

## Mobile (React Native/Expo)

**Stack**: Expo SDK 51 + React Native 0.74 + TypeScript + Expo Router + TanStack Query + Zustand.

**Estrutura**: `mobile/src/` (components, store, config, types), `mobile/app/` (file-based routing).

**Padrões**:
- Offline-first: operações críticas devem funcionar sem conexão (sync depois)
- Multi-tenant: API_URL configurável, auth via token SecureStore
- Scanner QR Code: `expo-camera` para localizar ativos
- Tracking (TrakService): throttle de pings (economia bateria/dados), respeitar janela de trabalho (privacidade), armazenar fila offline e re-enviar quando online

```typescript
// mobile/src/store/authStore.ts (Zustand)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      tenant: null,
      login: async (credentials) => { /* ... */ },
    }),
    { name: 'auth-storage', storage: createJSONStorage(() => SecureStore) }
  )
);
```

## Testes (Regras Críticas)

Ver `.github/instructions/testing.instructions.md` para detalhes completos.

**Obrigatórios**:
1. **Multi-tenant isolation**: testar com 2 tenants (A não vê dados de B)
2. **Idempotência**: mesma `idempotency_key` não duplica ledger
3. **Outbox reprocessamento**: reprocessar evento não duplica efeito
4. **Lock mensal**: transação locked → falha ao editar, correção via adjustment
5. **TrakService feature gating**: tenant sem feature → API 403/404 e UI bloqueada
6. **Tracking privacidade**: fora da janela de trabalho → não registrar (ou registrar como rejeitado, conforme spec)

## Regras Críticas

1. **Multi-tenant**: nunca vazar dados entre tenants. Queries operam no schema correto automaticamente via middleware.
2. **Eventos**: consumidores Celery idempotentes com retry/backoff.
3. **TrakLedger**: ledger é fonte da verdade. Mês locked → apenas adjustments.
4. **TrakService**: feature gating obrigatório (UI + backend) e privacidade no tracking.
5. **Models**: sempre migration + testes.
6. **PRs**: pequenos, 1 issue por PR.

## Workflow de Implementação

1. Consultar spec em `docs/`
2. Listar arquivos a alterar/criar (paths)
3. Implementar (código + migration + testes)
4. Testar: `make test` (backend), `npm test` (frontend), `npm test` (mobile quando aplicável)
5. Atualizar docs se mudar contrato de API/eventos
