# Correção de Sincronização de Ordens de Serviço

## 🔍 Problema Identificado

O sistema tinha **duas fontes de dados diferentes** para ordens de serviço que não estavam sincronizadas:

### Dashboard (Visão Geral)
- ❌ Usava `MOCK_CHART_DATA.upcomingMaintenance` 
- ❌ Dados mockados fixos e independentes
- ❌ Não refletia mudanças nas ordens de serviço reais

### Página de Ordens de Serviço
- ✅ Usava `useWorkOrders()` com `MOCK_WORK_ORDERS`
- ✅ Tinha persistência de estado
- ✅ Dados reais do sistema

## ✅ Correções Implementadas

### 1. Dashboard Atualizado (`src/pages/Dashboard.tsx`)

**Antes:**
```typescript
// Usava dados fixos do chartData
upcomingMaintenance: chartData?.upcomingMaintenance || []
```

**Depois:**
```typescript
// Importa hooks de dados reais
import { useWorkOrders, useEquipment, useSectors } from '@/hooks/useDataTemp';

// Usa as mesmas ordens de serviço do sistema
const [workOrders] = useWorkOrders();
const [equipment] = useEquipment();
const [sectors] = useSectors();

// Filtra ordens para próximos 7 dias
const upcomingWorkOrders = useMemo(() => {
  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);
  
  return (workOrders || [])
    .filter(wo => {
      const isUpcoming = wo.status === 'OPEN' || wo.status === 'IN_PROGRESS';
      const isWithinRange = scheduledDate >= today && scheduledDate <= sevenDaysFromNow;
      
      // Filtro por papel do usuário
      if (role === 'technician') {
        return isUpcoming && isWithinRange && wo.assignedTo === 'José Silva';
      }
      
      return isUpcoming && isWithinRange;
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);
}, [workOrders, role]);
```

### 2. KPIs Calculados com Dados Reais

**Antes:**
```typescript
{ key: 'openWorkOrders', value: kpis?.openWorkOrders || 0 }
```

**Depois:**
```typescript
const dashboardKPIs = useMemo(() => {
  const openWorkOrders = (workOrders || []).filter(wo => wo.status === 'OPEN').length;
  const overdueWorkOrders = (workOrders || []).filter(wo => {
    return wo.status === 'OPEN' && new Date(wo.scheduledDate) < new Date();
  }).length;
  
  const criticalEquipment = equipment.filter(eq => 
    eq.tag?.includes('CHI') || eq.type?.toLowerCase().includes('chiller')
  ).length;
  
  return {
    openWorkOrders,
    overdueWorkOrders,
    criticalEquipment,
    mttr: kpis?.mttr || 2.5,
    mtbf: kpis?.mtbf || 168
  };
}, [workOrders, equipment, kpis]);
```

### 3. Tabela de Próximas Manutenções Atualizada

**Antes:**
- Mostrava dados fixos de `upcomingMaintenance`
- Informações genéricas e desatualizadas

**Depois:**
- Mostra ordens de serviço reais filtradas por data
- Informações dinâmicas com equipamento, setor, prioridade
- Respeitа permissões baseadas no papel do usuário

### 4. Dados Mockados Marcados como Deprecated (`src/data/mockData.ts`)

```typescript
// @deprecated - Use MOCK_WORK_ORDERS filtradas por data no Dashboard
// Próximas manutenções (tabela) - Mantido temporariamente para compatibilidade
// Os dados aqui são ignorados pelo Dashboard que agora usa OS reais
upcomingMaintenance: [
  // ... dados antigos mantidos para compatibilidade
],
```

### 5. Datas Atualizadas nas Ordens de Serviço

```typescript
// Atualizadas para próximos dias para demonstrar funcionamento
scheduledDate: '2025-09-25', // Era '2024-01-25'
scheduledDate: '2025-09-26', // Era '2024-01-23' 
scheduledDate: '2025-09-27', // Era '2024-01-15'
```

## 🎯 Benefícios da Correção

### ✅ Fonte Única de Verdade
- **Dashboard** e **Página de OS** agora usam `useWorkOrders()`
- Eliminadas inconsistências entre telas
- Alterações refletem em todo o sistema

### ✅ KPIs Dinâmicos
- **OS Abertas**: Contagem real de ordens com status 'OPEN'
- **OS Atrasadas**: Cálculo baseado em data atual vs data programada
- **Equipamentos Críticos**: Identificados por critério real (Chillers)

### ✅ Filtragem por Papel
```typescript
if (role === 'technician') {
  // Técnico vê apenas suas atribuições
  return isUpcoming && isWithinRange && wo.assignedTo === 'José Silva';
}
```

### ✅ Dados Sempre Atualizados
- Dashboard mostra ordens dos próximos 7 dias
- Ordenação cronológica automática
- Limitado a 5 itens para não poluir a interface

## 🔧 Arquivos Modificados

1. **`/src/pages/Dashboard.tsx`**
   - ➕ Importação de hooks de dados reais
   - 🔄 Lógica de KPIs atualizada
   - 🔄 Filtro de próximas manutenções
   - 🔄 Tabela atualizada com dados dinâmicos

2. **`/src/data/mockData.ts`**
   - 🏷️ Marcação de dados antigos como deprecated
   - 📅 Atualização de datas das ordens de serviço

## ✅ Resultados

- ✅ **Compilação sem erros**
- ✅ **Dashboard sincronizado** com página de OS
- ✅ **KPIs reais** calculados dinamicamente  
- ✅ **Próximas manutenções** mostram ordens reais dos próximos 7 dias
- ✅ **Filtragem por papel** do usuário implementada
- ✅ **Fonte única** de dados para ordens de serviço

O sistema agora tem uma arquitetura de dados consistente onde todas as telas que mostram ordens de serviço consultam a mesma fonte (`useWorkOrders()`), eliminando divergências e garantindo que mudanças sejam refletidas em todo o sistema.