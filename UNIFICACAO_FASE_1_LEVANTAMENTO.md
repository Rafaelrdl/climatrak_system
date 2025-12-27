# Fase 1 - Levantamento e Decisão de Base

**Status:** ✅ Concluída  
**Data:** 26 de novembro de 2025  
**Objetivo:** Mapear rotas, dependências e definir base do projeto unificado

---

## 🎯 Decisão Principal

**Base escolhida:** `traknor-cmms-sistema`

### Justificativa
- Design system completo e moderno
- Arquitetura melhor organizada
- React Router v7 (mais recente)
- Tailwind CSS v4 (última versão)
- shadcn/ui implementado

---

## 🗺️ Mapeamento de Rotas

### TrakNor CMMS (Base)
```
Prefixo futuro: /cmms/*

Rotas atuais:
├── /                     → Dashboard
├── /ativos              → Gerenciamento de Ativos
├── /work-orders         → Ordens de Serviço
├── /requests            → Solicitações
├── /plans               → Planos de Manutenção
├── /metrics             → Métricas
├── /inventory           → Estoque
├── /procedures          → Procedimentos
├── /reports             → Relatórios
├── /profile             → Perfil do Usuário
├── /admin/team          → Gerenciamento de Equipe
├── /help                → Centro de Ajuda
└── /plans-testing       → Testes de Planos (dev)
```

### TrakSense Monitor (A Migrar)
```
Prefixo futuro: /monitor/*

Rotas atuais:
├── /overview            → Visão Geral Executiva
├── /custom-dashboard    → Dashboard Customizável com Widgets
├── /assets              → Ativos HVAC com Telemetria
│   └── /:id            → Detalhe do Ativo (gráficos tempo real)
├── /sensors             → Grid de Sensores
├── /alerts              → Sistema de Alertas
├── /rules               → Configuração de Regras
├── /reports             → Relatórios de Monitoramento
└── /settings            → Configurações do Sistema
```

---

## 📦 Análise de Dependências

### Núcleo Compartilhado
| Dependência | TrakNor | TrakSense | Versão Final |
|-------------|---------|-----------|--------------|
| react | 18.3.1 | 18.3.1 | ✅ 18.3.1 |
| typescript | 5.7.2 | 5.6.3 | 5.7.2 |
| vite | 6.0.5 | 6.0.1 | 6.0.5 |
| tailwindcss | 4.0.0 | 3.4.17 | ⚠️ 4.0.0 |
| react-router | 7.1.1 | 6.28.0 | ⚠️ 7.1.1 |
| lucide-react | 0.468.0 | 0.469.0 | 0.469.0 |
| zustand | 5.0.2 | 5.0.2 | ✅ 5.0.2 |
| sonner | 1.7.1 | 1.7.3 | 1.7.3 |

### ⚠️ Atenção - Breaking Changes

#### Tailwind CSS (3.x → 4.x)
- **TrakSense usa v3.4.17**: sintaxe antiga
- **TrakNor usa v4.0.0**: sintaxe nova
- **Ação**: Atualizar classes do TrakSense durante migração

#### React Router (6.x → 7.x)
- **TrakSense usa v6.28.0**: API antiga
- **TrakNor usa v7.1.1**: API nova
- **Ação**: Refatorar rotas do TrakSense
  - `<Routes>` → `<Route>` com data loaders
  - `useNavigate()` mantém compatibilidade
  - Remover `<BrowserRouter>` aninhado

### Dependências Exclusivas TrakNor (Manter)
```json
{
  "@tanstack/react-query": "5.63.0",
  "framer-motion": "11.15.0",
  "react-pdf": "10.0.4",
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^9.0.0",
  "react-markdown": "9.0.2"
}
```

### Dependências TrakSense (Adicionar ao TrakNor)
```json
{
  "recharts": "2.15.0",
  "react-grid-layout": "1.5.0",
  "mqtt": "5.11.0",
  "date-fns": "4.1.0",
  "react-intersection-observer": "9.14.0"
}
```

---

## 🏗️ Estrutura Proposta

```
traknor-cmms-sistema/ (ou renomear para traksense-platform-frontend)
│
├── src/
│   ├── shared/                    # 🔄 Código Compartilhado
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProductSwitcher.tsx  # NOVO: Switch entre produtos
│   │   │
│   │   ├── hooks/
│   │   ├── stores/               # Zustand stores globais
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── modules/
│   │   │
│   │   ├── cmms/                 # 🔧 TrakNor CMMS
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Assets.tsx
│   │   │   │   ├── WorkOrders.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── WorkOrderModal.tsx
│   │   │   │   ├── AssetCard.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── workOrdersStore.ts
│   │   │   │   └── assetsStore.ts
│   │   │   │
│   │   │   └── routes.tsx        # Rotas /cmms/*
│   │   │
│   │   └── monitor/              # 📊 TrakSense Monitor
│   │       ├── pages/
│   │       │   ├── Overview.tsx
│   │       │   ├── CustomDashboard.tsx
│   │       │   ├── Assets.tsx
│   │       │   ├── Sensors.tsx
│   │       │   └── ...
│   │       │
│   │       ├── components/
│   │       │   ├── charts/
│   │       │   │   ├── LineChart.tsx
│   │       │   │   ├── GaugeChart.tsx
│   │       │   │   └── ...
│   │       │   │
│   │       │   ├── dashboard/
│   │       │   │   ├── WidgetGrid.tsx
│   │       │   │   ├── WidgetConfigModal.tsx
│   │       │   │   └── ...
│   │       │   │
│   │       │   └── alerts/
│   │       │       ├── AlertCard.tsx
│   │       │       └── RuleBuilder.tsx
│   │       │
│   │       ├── stores/
│   │       │   ├── sensorsStore.ts
│   │       │   ├── alertsStore.ts
│   │       │   └── dashboardStore.ts
│   │       │
│   │       └── routes.tsx        # Rotas /monitor/*
│   │
│   ├── router/
│   │   └── index.tsx             # Roteamento unificado
│   │
│   ├── App.tsx                   # App principal com ProductSwitcher
│   └── main.tsx
│
├── package.json                  # Dependências mescladas
└── vite.config.ts               # Configuração unificada
```

---

## 🎨 Componente ProductSwitcher

### Conceito (Header Unificado)
```tsx
// src/shared/components/ProductSwitcher.tsx

import { Wrench, Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function ProductSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentProduct = location.pathname.startsWith('/monitor') 
    ? 'monitor' 
    : 'cmms';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {currentProduct === 'cmms' ? (
          <><Wrench /> TrakNor CMMS</>
        ) : (
          <><Activity /> TrakSense Monitor</>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => navigate('/cmms')}>
          <Wrench /> TrakNor CMMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/monitor')}>
          <Activity /> TrakSense Monitor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 🔄 Componentes Reutilizáveis

### Do TrakNor (já prontos)
- ✅ `src/components/ui/*` - shadcn/ui completo
- ✅ `src/components/Layout.tsx` - Layout principal
- ✅ `src/components/Navbar.tsx` - Navegação responsiva
- ✅ `src/components/auth/*` - Sistema de autenticação
- ✅ `src/hooks/useAuth.ts` - Hook de autenticação

### Do TrakSense (migrar para shared)
- 📊 `src/components/charts/*` - Gráficos Recharts
- 📊 `src/components/dashboard/*` - Sistema de widgets
- 🔔 `src/components/alerts/*` - Alertas em tempo real
- 📡 `src/modules/sensors/*` - Grid de sensores

---

## 🚦 Pontos de Atenção

### 1. Conflitos de Rota
- **TrakNor** tem `/assets` (ativos CMMS)
- **TrakSense** tem `/assets` (ativos HVAC)
- **Solução**: Usar prefixos `/cmms/assets` e `/monitor/assets`

### 2. Stores Zustand
- Alguns stores podem ter nomes iguais
- **Solução**: Prefixar ou manter em módulos separados

### 3. API Base URL
- TrakNor: `/api/cmms/*`
- TrakSense: `/api/monitor/*`
- **Solução**: Configurar base URL por módulo

### 4. Tema e Estilos
- Ambos usam Tailwind, mas versões diferentes
- **Solução**: Usar classes do Tailwind v4 como padrão

---

## 📋 Checklist de Migração

### Fase 1 ✅
- [x] Mapear todas as rotas
- [x] Listar dependências e versões
- [x] Identificar conflitos
- [x] Definir estrutura de diretórios
- [x] Escolher base do projeto

### Fase 2 ✅
- [x] Criar estrutura `src/apps/cmms/` com routes.tsx
- [x] Criar estrutura `src/apps/monitor/` com placeholder
- [x] Criar estrutura `src/shared/` (ui, layout, api, hooks)
- [x] Atualizar `App.tsx` com roteamento `/cmms/*` e `/monitor/*`
- [x] Atualizar `Navbar.tsx` com prefixo `/cmms/` em todos os links
- [x] Atualizar `Layout.tsx` com links para `/cmms/profile` e `/cmms/admin/team`
- [x] Criar módulo index em `src/apps/index.ts`

### Fase 3 ✅
- [x] Criar módulo de tema/tokens (`src/shared/ui/theme.ts`)
- [x] Criar componentes compostos (PageHeader, StatusBadge, StatCard, DataTable, EmptyState, ConfirmDialog, LoadingSpinner)
- [x] Organizar exports do design system em `src/shared/ui/index.ts`
- [x] Build passando com sucesso

### Fase 4 (Próxima)
- [ ] Portar páginas do TrakSense para `src/apps/monitor`
- [ ] Migrar componentes de gráficos
- [ ] Adaptar estilos para Tailwind v4
- [ ] Atualizar React Router para v7

### Fase 5
- [ ] Integrar header unificado
- [ ] Implementar navegação entre produtos
- [ ] Testes E2E
- [ ] Deploy em staging

---

## 📊 Estimativas

| Fase | Duração | Complexidade | Status |
|------|---------|--------------|--------|
| Fase 1 | ✅ Concluída | Baixa | ✅ |
| Fase 2 | ✅ Concluída | Média | ✅ |
| Fase 3 | ✅ Concluída | Média | ✅ |
| Fase 4 | 10-14 dias | Alta | 🔜 |
| Fase 5 | 5-7 dias | Média | ⏳ |
| **Total** | **3-4 semanas** | - | - |

---

## 🔗 Referências

- [TrakNor CMMS](./README.md)
- [TrakSense Monitor](../traksense-hvac-monit/README.md)
- [React Router v7 Migration](https://reactrouter.com/en/main/upgrading/v6)
- [Tailwind CSS v4 Upgrade](https://tailwindcss.com/docs/upgrade-guide)

---

**Próximo passo:** Iniciar Fase 4 - Migrar páginas do TrakSense Monitor

---

## 📁 Estrutura Atual (Fase 3 Concluída)

```
traknor-cmms-sistema/
├── src/
│   ├── apps/                      # Módulos da plataforma
│   │   ├── index.ts              # Exports centralizados
│   │   ├── cmms/
│   │   │   └── routes.tsx        # Rotas /cmms/*
│   │   └── monitor/
│   │       └── routes.tsx        # Rotas /monitor/* (placeholder)
│   │
│   ├── shared/                    # Código compartilhado
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── index.ts          # 🆕 Design System exports
│   │   │   ├── theme.ts          # 🆕 Tokens de design
│   │   │   └── components/       # 🆕 Componentes compostos
│   │   │       ├── index.ts
│   │   │       ├── PageHeader.tsx
│   │   │       ├── StatusBadge.tsx
│   │   │       ├── StatCard.tsx
│   │   │       ├── DataTable.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── ConfirmDialog.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   │
│   │   ├── layout/index.ts       # Layout, Navbar
│   │   ├── hooks/index.ts        # Hooks compartilhados
│   │   └── api/index.ts          # Utilitários de API
│   │
│   ├── components/ui/            # shadcn/ui (base)
│   ├── pages/                    # Páginas CMMS
│   └── App.tsx                   # Roteamento modular
│
└── UNIFICACAO_FASE_1_LEVANTAMENTO.md
```

---

## 🎨 Design System (Fase 3)

### Tokens de Tema (`src/shared/ui/theme.ts`)

```typescript
import { theme } from '@/shared/ui';

// Cores
theme.colors.primary     // Azul TrakNor
theme.colors.success     // Verde (estados positivos)
theme.colors.warning     // Amarelo (alertas)
theme.colors.error       // Vermelho (erros)

// Tipografia
theme.typography.fontSize.base  // 1rem
theme.typography.fontWeight.semibold  // 600

// Espaçamentos
theme.spacing[4]  // 1rem (16px)
theme.spacing[8]  // 2rem (32px)

// Bordas
theme.borderRadius.lg  // 12px
theme.boxShadow.md     // Sombra média
```

### Componentes Compostos

| Componente | Descrição | Uso |
|------------|-----------|-----|
| `PageHeader` | Cabeçalho de página | Título, descrição, ações |
| `StatusBadge` | Badge de status | Estados de OS, equipamentos, prioridades |
| `StatCard` | Card de estatística | KPIs, métricas |
| `DataTable` | Tabela de dados | Listagens com estados vazios |
| `EmptyState` | Estado vazio | Quando não há dados |
| `ConfirmDialog` | Diálogo de confirmação | Ações destrutivas |
| `LoadingSpinner` | Indicador de loading | Estados de carregamento |

### Exemplo de Uso

```tsx
import { 
  PageHeader, 
  StatusBadge, 
  StatCard, 
  DataTable, 
  Button,
  Card 
} from '@/shared/ui';

function WorkOrdersPage() {
  return (
    <>
      <PageHeader 
        title="Ordens de Serviço"
        description="Gerencie as ordens de serviço"
      >
        <Button>Nova OS</Button>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Abertas" value={12} trend="up" trendValue="+5%" />
        <StatCard title="Em Execução" value={8} />
        <StatCard title="Concluídas" value={45} trend="up" trendValue="+12%" />
      </div>

      <DataTable
        columns={columns}
        data={workOrders}
        getRowKey={(row) => row.id}
        emptyState={{ title: "Nenhuma OS encontrada" }}
      />
    </>
  );
}
```
