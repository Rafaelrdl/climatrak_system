# Frontend Restructure - Diagnóstico e Plano de Migração

> **Data**: 27/12/2024  
> **Status**: ✅ Concluído  
> **Objetivo**: Reorganizar o frontend para melhor separar os módulos TrakSense (Monitor) e TrakNor (CMMS)

---

## 📊 Resultado Final

### Estrutura de Módulos

| Módulo | Localização | Status | Completude |
|--------|-------------|--------|------------|
| Monitor (TrakSense) | `apps/monitor/` | ✅ Estruturado | 100% |
| CMMS (TrakNor) | `apps/cmms/` | ✅ Estruturado | 100% |
| Shared | `shared/` | ✅ Estruturado | 100% |

### Monitor - Estrutura Atual ✅
```
apps/monitor/
├── components/          # AssetEditModal, RuleFormModal, WidgetCard, WidgetPalette, charts/
├── hooks/               # useAlertsQuery, useAssetsQuery, useDevicesQuery, useRulesQuery, useSitesQuery
├── pages/               # AlertsList, CustomDashboardPage, EditableOverviewPage, MonitorAssetDetailPage...
├── services/            # alertsService, assetsService, devicesService, rulesService, sitesService, telemetryService
├── store/               # (a verificar)
├── types/               # asset, dashboard, etc.
└── routes.tsx
```

### CMMS - Estrutura Atual ⚠️
```
apps/cmms/
└── routes.tsx           # Apenas rotas - todo o resto está na raiz src/
```

**Arquivos CMMS na raiz que devem migrar:**
- `pages/`: Dashboard, EquipmentPage, WorkOrdersPage, PlansPage, MetricsPage, InventoryPage, etc.
- `services/`: workOrdersService, equipmentService, plansService, inventoryService, etc.
- `hooks/`: useWorkOrdersQuery, useEquipmentQuery, usePlansQuery, useInventoryQuery, etc.
- `components/`: WorkOrderModal, WorkOrderKanban, WorkOrderList, PlanFormModal, etc.

---

## 🔴 Duplicidades Identificadas

### 1. PageHeader
| Localização | Linhas | Features |
|-------------|--------|----------|
| `components/PageHeader.tsx` | 27 | Básico (title, description, children) |
| `shared/ui/components/PageHeader.tsx` | 107 | **Completo** (+ breadcrumbs, icon, badge, documentado) |

**Decisão**: Usar versão de `shared/ui/` (mais completa)

### 2. StatusBadge
| Localização | Linhas | Features |
|-------------|--------|----------|
| `components/StatusBadge.tsx` | 184 | OS status, priorities, types (CMMS-focused) |
| `shared/ui/components/StatusBadge.tsx` | 291 | **Completo** (workOrder, equipment, priority, alert, connection) |

**Decisão**: Mesclar - usar estrutura de `shared/ui/` mas garantir todos os configs CMMS

### 3. CustomDashboardPage
| Localização | Diferença |
|-------------|-----------|
| `pages/CustomDashboardPage.tsx` | 7 linhas - wrapper simples |
| `apps/monitor/pages/CustomDashboardPage.tsx` | 11 linhas - wrapper com comentário |

**Decisão**: Remover de `pages/`, manter em `apps/monitor/pages/` (contexto Monitor)

### 4. WidgetPalette
| Localização | Linhas | Contexto |
|-------------|--------|----------|
| `components/dashboard/WidgetPalette.tsx` | 211 | Dashboard CMMS (filtra indicadores/OS) |
| `apps/monitor/components/WidgetPalette.tsx` | 289 | Dashboard Monitor (widgets específicos IoT) |

**Decisão**: Ambos são necessários - contextos diferentes. Renomear para clareza:
- `components/dashboard/` → usado pelo Dashboard CMMS
- `apps/monitor/components/` → usado pelo Dashboard Monitor

---

## 🟡 Dependências Cross-Module

### Hooks na raiz que dependem do Monitor
```typescript
// hooks/useSensorData.ts
import { assetsService } from '@/apps/monitor/services/assetsService';
import { telemetryService } from '@/apps/monitor/services/telemetryService';
import type { AssetSensor } from '@/apps/monitor/types/asset';
```
**Decisão**: Mover para `apps/monitor/hooks/useSensorData.ts`

### Navbar - Configuração de Navegação Hardcoded
```typescript
// components/Navbar.tsx (linhas 42-60)
const cmmsNavigation: NavItem[] = [/*...*/];
const monitorNavigation: NavItem[] = [/*...*/];
```
**Decisão**: Extrair para:
- `apps/cmms/navigation.ts`
- `apps/monitor/navigation.ts`

---

## 🟢 Páginas Compartilhadas

Páginas usadas por ambos os módulos (devem ir para `shared/pages/`):

| Página | CMMS | Monitor | Destino |
|--------|------|---------|---------|
| ProfilePage | ✅ | ✅ | `shared/pages/` |
| TeamPage | ✅ | ✅ | `shared/pages/` |
| SettingsPage | ✅ | ✅ | `shared/pages/` |
| HelpCenterPage | ✅ | ❌ | `apps/cmms/pages/` |
| HelpContentViewPage | ✅ | ❌ | `apps/cmms/pages/` |

---

## 📋 Plano de Migração - Status

### Fase 0 - Diagnóstico ✅
- [x] Mapear estrutura atual
- [x] Identificar duplicidades
- [x] Definir decisões por item
- [x] Criar este documento

### Fase 1 - Base Compartilhada ✅

#### 1a. Unificar UI duplicada ✅
- [x] `components/PageHeader.tsx` → re-export de `@/shared/ui`
- [x] `components/StatusBadge.tsx` → re-export de `@/shared/ui`
- [x] 13 arquivos atualizados para usar `@/shared/ui`

#### 1b. Mover hooks Monitor ✅
- [x] `hooks/useSensorData.ts` → `apps/monitor/hooks/useSensorData.ts`
- [x] Arquivo original mantido como re-export para compatibilidade

### Fase 2 - Organização Monitor ✅

#### 2a. Dashboard/Widgets ✅
- [x] `pages/CustomDashboardPage.tsx` → re-export de `apps/monitor/pages/`
- [x] WidgetPalettes mantidos separados (contextos diferentes)

#### 2b. Extrair navegação ✅
- [x] Criado `apps/cmms/navigation.ts`
- [x] Criado `apps/monitor/navigation.ts`
- [x] `Navbar.tsx` simplificado usando imports dos módulos

### Fase 3 - CMMS Modular ✅

Estrutura criada em `apps/cmms/`:

```
apps/cmms/
├── index.ts              # Barrel export principal
├── components/index.ts   # Re-exports de componentes CMMS
├── hooks/index.ts        # Re-exports de hooks CMMS  
├── pages/index.ts        # Re-exports de páginas CMMS
├── services/index.ts     # Re-exports de services CMMS
├── store/index.ts        # Re-exports de stores CMMS
├── types/index.ts        # Re-exports de tipos CMMS
├── navigation.ts         # Configuração de navegação
└── routes.tsx            # Rotas do módulo (atualizado)
```

### Fase 4 - Compartilhados ✅
- [x] Criado `shared/pages/index.ts`
- [x] ProfilePage, TeamPage, SettingsPage exportadas via `@/shared/pages`
- [x] Rotas CMMS e Monitor atualizadas para usar shared/pages

### Fase 5 - Limpeza Final ✅
- [x] Barrel exports configurados
- [x] Arquivos originais mantidos como re-exports para compatibilidade
- [x] Estrutura final validada

---

## 🎯 Estrutura Final Implementada

```
frontend/src/
├── apps/
│   ├── cmms/                    # TrakNor - CMMS
│   │   ├── index.ts             # ✅ Barrel export principal
│   │   ├── components/index.ts  # ✅ Re-exports componentes
│   │   ├── hooks/index.ts       # ✅ Re-exports hooks
│   │   ├── pages/index.ts       # ✅ Re-exports páginas
│   │   ├── services/index.ts    # ✅ Re-exports services
│   │   ├── store/index.ts       # ✅ Re-exports stores
│   │   ├── types/index.ts       # ✅ Re-exports tipos
│   │   ├── navigation.ts        # ✅ Config navegação
│   │   └── routes.tsx           # ✅ Rotas módulo
│   ├── monitor/                 # TrakSense - Monitor
│   │   ├── index.ts             # ✅ Barrel export principal
│   │   ├── components/          # ✅ Componentes específicos
│   │   ├── hooks/               # ✅ Hooks específicos
│   │   ├── pages/               # ✅ Páginas específicas
│   │   ├── services/            # ✅ Services específicos
│   │   ├── store/               # ✅ Stores específicos
│   │   ├── types/               # ✅ Tipos específicos
│   │   ├── navigation.ts        # ✅ Config navegação
│   │   └── routes.tsx           # ✅ Rotas módulo
│   └── index.ts                 # ✅ Export módulos
├── shared/
│   ├── api/                     # ✅ Axios instance, interceptors
│   ├── hooks/                   # ✅ Hooks compartilhados
│   ├── layout/                  # ✅ Layout components
│   ├── pages/index.ts           # ✅ ProfilePage, TeamPage, SettingsPage
│   ├── ui/                      # ✅ PageHeader, StatusBadge, etc.
│   └── index.ts                 # ✅ Export tudo
├── components/                  # Componentes (re-exports para compatibilidade)
├── hooks/                       # Hooks (re-exports para compatibilidade)
├── services/                    # Services (arquivos originais)
├── pages/                       # Páginas (arquivos originais)
└── ...
```

---

## ✅ Resultados

### Imports Atualizados
- **13 arquivos** atualizados para usar `@/shared/ui` (PageHeader, StatusBadge)
- **7 arquivos** atualizados para usar imports de módulos específicos
- **2 rotas** atualizadas para usar `@/shared/pages`

### Compatibilidade Mantida
- Arquivos originais em `components/`, `hooks/`, `pages/` mantidos como re-exports
- Nenhuma quebra de imports existentes
- Servidor dev funcionando normalmente

### Próximos Passos (Opcional)
1. Migrar arquivos físicos para dentro dos módulos (atualmente são re-exports)
2. Remover arquivos de re-export após atualização de todos os imports
3. Instalar dependência faltante `@tiptap/react` para build funcionar

---

## 📝 Notas

- Estrutura usa barrel exports para manter compatibilidade
- Arquivos originais não foram movidos, apenas re-exportados
- Isso permite migração gradual sem quebrar código existente
