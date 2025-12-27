# Copilot Instructions - ClimaTrak/TrakSense

## Arquitetura Geral

Este é um sistema **multi-tenant** para CMMS (gestão de manutenção) e monitoramento IoT/HVAC, composto por:

- **Backend**: Django 5 + DRF + django-tenants (PostgreSQL schema isolation)
- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS 4
- **Database**: PostgreSQL 16 + TimescaleDB para séries temporais
- **Mensageria**: EMQX (MQTT) → HTTP webhook → Django `/ingest`

### Estrutura Multi-Tenant

Cada tenant tem schema PostgreSQL isolado. O roteamento é por subdomínio:
- `umc.localhost:8000` → tenant "umc" (schema `uberlandia_medical_center`)
- Frontend em dev usa proxy Vite: `/api` → `http://umc.localhost:8000`

## Backend (Django)

### Convenções de Apps

Apps tenant-specific ficam em `backend/apps/`:
- `accounts` - Usuários, TenantMembership (roles: owner/admin/operator/technician/viewer)
- `assets` - Hierarquia Site → Asset → Device → Sensor
- `alerts` - Rules com RuleParameters, avaliação de alertas
- `ingest` - Telemetry (raw MQTT) e Reading (normalizado para TimescaleDB)
- `cmms` - WorkOrders, Requests, MaintenancePlans, Procedures
- `inventory` - Categories, Items, Movements
- `locations` - Company → Sector → Subsection

### Padrões de Código

```python
# ViewSets são o padrão - evite APIView direto
class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    filterset_class = AssetFilter
    # Tenant isolation é AUTOMÁTICO via django-tenants
```

### Comandos Essenciais

```bash
make dev          # Sobe todos os containers Docker
make migrate      # migrate_schemas (multi-tenant)
make seed         # Cria tenant dev + usuário owner@umc.localhost
make fmt          # black + isort
make lint         # ruff
```

### Autenticação

- JWT em cookies HttpOnly (não Authorization header)
- `withCredentials: true` no frontend para enviar cookies
- Refresh automático via interceptor Axios

## Frontend (React)

### Estrutura de Módulos

A plataforma tem dois módulos principais em `src/apps/`:
- `/cmms/*` - TrakNor (manutenção): WorkOrders, Plans, Inventory
- `/monitor/*` - TrakSense (IoT): Dashboard tempo real, Sensores, Alertas

### Padrões de Query

Use React Query com factory pattern para keys:

```typescript
// src/hooks/useEquipmentQuery.ts
export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (filters?: EquipmentFilters) => [...equipmentKeys.lists(), filters] as const,
  detail: (id: string) => [...equipmentKeys.details(), id] as const,
};

export function useEquipments(filters?: EquipmentFilters) {
  return useQuery({
    queryKey: equipmentKeys.list(filters),
    queryFn: () => equipmentService.getAll(filters),
    enabled: isUserAuthenticated(), // Sempre verificar auth
  });
}
```

### Componentes UI

- Componentes base em `src/components/ui/` (shadcn/ui + Radix)
- Use `cn()` de `@/lib/utils` para merge de classes
- Variantes via `cva()` (class-variance-authority)

```tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

### Services e API

- Cliente centralizado em `src/lib/api.ts` (Axios)
- Services por domínio em `src/services/` (equipmentService, workOrdersService, etc.)
- Path alias `@/` aponta para `src/`

### ACL (Controle de Acesso)

Roles definidas em `src/acl/abilities.ts`:
- `admin` - Acesso total
- `technician` - View + edit workorders/inventory
- `requester` - View + create/edit solicitações

## Fluxo de Dados IoT

```
MQTT (device) → EMQX → HTTP POST /api/telemetry/ingest → Django
                        ↓
              Telemetry (raw) + Reading (normalizado)
                        ↓
              Celery Task → Alert evaluation → Notifications
```

Topics MQTT seguem padrão: `tenants/{slug}/sites/{site}/assets/{asset}/...`

## Desenvolvimento Local

1. **Backend**: `make dev` (Docker Compose)
2. **Frontend**: `npm run dev` (Vite em localhost:5173)
3. **Acesso**: http://umc.localhost:5173 (proxy para backend)
4. **Credenciais dev**: owner@umc.localhost / Dev@123456

## Testes

- **Frontend**: Vitest (`npm test`) + Cypress E2E (`npm run cy:open`)
- **Backend**: pytest (via `make test` - em implementação)
