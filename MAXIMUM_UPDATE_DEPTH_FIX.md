# Correção: "Maximum update depth exceeded"

## 🔴 Problema Original

Erro "Maximum update depth exceeded" e warning "Select is changing from uncontrolled to controlled" ao clicar em ordens de serviço na visão dividida.

## 🎯 Causas Raiz Identificadas

### 1. Hooks retornando novas instâncias de arrays
```typescript
// ❌ ANTES - useDataTemp.ts
export const useCompanies = () => {
  const [data] = useState<Company[]>(MOCK_COMPANIES);
  return [data, setData, deleteData]; // Nova array a cada render!
}
```

### 2. Valores undefined em Select components
```tsx
// ❌ ANTES - WorkOrderDetailView.tsx
<Select value={formData.status}>  {/* undefined causa warning */}
  <SelectTrigger>
    <SelectValue /> {/* Sem placeholder */}
  </SelectTrigger>
</Select>
```

### 3. Handlers não memoizados
```typescript
// ❌ ANTES
const handleFieldChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  setIsDirty(true);
}; // Nova função a cada render!
```

### 4. Arrays de dados não memoizados
```typescript
// ❌ ANTES
const [equipment] = useEquipment();
const [sectors] = useSectors();
// Usados diretamente em useEffect e JSX, causando re-renders
```

## ✅ Soluções Implementadas

### 1. Memoização dos Hooks (src/hooks/useDataTemp.ts)

```typescript
// ✅ DEPOIS
import { useState, useMemo } from 'react';

export const useCompanies = () => {
  const [data] = useState<Company[]>(MOCK_COMPANIES);
  const setData = (value: Company[] | ((current: Company[]) => Company[])) => {
    console.log('Companies updated:', value);
  };
  const deleteData = () => {
    console.log('Companies deleted');
  };
  // Retorna array memoizado - mesma instância se data não mudar
  return useMemo(() => [data, setData, deleteData] as const, [data]);
};
```

**Hooks corrigidos:**
- ✅ `useCompanies()`
- ✅ `useSectors()`
- ✅ `useEquipment()`
- ✅ `useStock()`

### 2. Memoização em WorkOrderDetailView.tsx

#### 2.1. Inicialização do formData com valores padrão
```typescript
// ✅ DEPOIS
const [formData, setFormData] = useState<Partial<WorkOrder>>(() => 
  workOrder || { 
    status: 'OPEN', 
    type: 'CORRECTIVE', 
    priority: 'MEDIUM' 
  }
);
```

#### 2.2. Arrays de dados memoizados
```typescript
// ✅ DEPOIS
const [equipment] = useEquipment();
const [sectors] = useSectors();
const [companies] = useCompanies();
const [stockItems] = useStockItems();

// Memoizar arrays para evitar re-renders
const equipmentList = useMemo(() => equipment, [equipment]);
const sectorsList = useMemo(() => sectors, [sectors]);
const companiesList = useMemo(() => companies, [companies]);
const stockItemsList = useMemo(() => stockItems, [stockItems]);
```

#### 2.3. Derivações memoizadas
```typescript
// ✅ DEPOIS
const selectedEquipment = useMemo(() => 
  equipmentList.find(e => e.id === formData.equipmentId),
  [equipmentList, formData.equipmentId]
);
const selectedSector = useMemo(() => 
  sectorsList.find(s => s.id === selectedEquipment?.sectorId),
  [sectorsList, selectedEquipment?.sectorId]
);
const selectedCompany = useMemo(() => 
  companiesList.find(c => c.id === selectedSector?.companyId),
  [companiesList, selectedSector?.companyId]
);
```

#### 2.4. Handlers memoizados
```typescript
// ✅ DEPOIS
const handleSave = useCallback(() => {
  if (onSave && isDirty) {
    onSave(formData);
    setIsDirty(false);
  }
}, [onSave, isDirty, formData]);

const handleFieldChange = useCallback((field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  setIsDirty(true);
}, []);

const handlePrint = useCallback(() => {
  if (!workOrder) return;
  printWorkOrder({
    workOrder: { ...workOrder, ...formData } as WorkOrder,
    equipment: equipmentList,
    sectors: sectorsList,
    companies: companiesList
  });
}, [workOrder, formData, equipmentList, sectorsList, companiesList]);
```

### 3. Correção dos Select Components

```tsx
// ✅ DEPOIS - Sempre com valor padrão e placeholder

{/* Status */}
<Select 
  value={formData.status || 'OPEN'}
  onValueChange={(value) => handleFieldChange('status', value)}
  disabled={readOnly}
>
  <SelectTrigger id="status">
    <SelectValue placeholder="Selecione o status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="OPEN">Aberta</SelectItem>
    <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
    <SelectItem value="COMPLETED">Concluída</SelectItem>
  </SelectContent>
</Select>

{/* Tipo */}
<Select 
  value={formData.type || 'CORRECTIVE'}
  onValueChange={(value) => handleFieldChange('type', value)}
  disabled={readOnly}
>
  <SelectTrigger id="type">
    <SelectValue placeholder="Selecione o tipo" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
    <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
  </SelectContent>
</Select>

{/* Prioridade */}
<Select 
  value={formData.priority || 'MEDIUM'}
  onValueChange={(value) => handleFieldChange('priority', value)}
  disabled={readOnly}
>
  <SelectTrigger id="priority">
    <SelectValue placeholder="Selecione a prioridade" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="LOW">Baixa</SelectItem>
    <SelectItem value="MEDIUM">Média</SelectItem>
    <SelectItem value="HIGH">Alta</SelectItem>
    <SelectItem value="CRITICAL">Crítica</SelectItem>
  </SelectContent>
</Select>
```

### 4. Memoização do WorkOrderPanel

```typescript
// ✅ DEPOIS - src/components/WorkOrderPanel.tsx
function WorkOrderPanelComponent({ 
  workOrders, 
  onStartWorkOrder, 
  onEditWorkOrder,
  onUpdateWorkOrder
}: WorkOrderPanelProps) {
  // ... implementação ...
}

// Memoizar componente para evitar re-renders desnecessários
export const WorkOrderPanel = React.memo(WorkOrderPanelComponent);
WorkOrderPanel.displayName = 'WorkOrderPanel';
```

## 📋 Checklist de Correções

- [x] **useDataTemp.ts**: Memoizar retorno de todos os hooks
  - [x] useCompanies
  - [x] useSectors
  - [x] useEquipment
  - [x] useStock
- [x] **WorkOrderDetailView.tsx**: Otimizações completas
  - [x] formData com valores padrão
  - [x] Arrays memoizados (equipmentList, sectorsList, etc.)
  - [x] Derivações memoizadas (selectedEquipment, selectedSector, selectedCompany)
  - [x] Handlers memoizados (handleSave, handleFieldChange, handlePrint)
  - [x] Select com valores padrão (status, type, priority)
  - [x] Select com placeholders
- [x] **WorkOrderPanel.tsx**: Memoização do componente
- [x] **Testes**: Sem erros TypeScript/ESLint

## 🔍 Como Funciona a Correção

### Problema: Referências Instáveis
React compara referências de objetos/arrays nas dependências do useEffect. Se uma nova instância é criada a cada render, o useEffect executa novamente, causando loop infinito.

```typescript
// ❌ Problema
useEffect(() => {
  // Código que altera estado
}, [equipment]); // 'equipment' é novo array a cada render = loop!
```

### Solução: Memoização
`useMemo` garante que a mesma instância é retornada se as dependências não mudarem.

```typescript
// ✅ Solução
const equipmentList = useMemo(() => equipment, [equipment]);
// 'equipmentList' só muda se 'equipment' mudar

useEffect(() => {
  // Código que altera estado
}, [equipmentList]); // Estável = sem loop!
```

### Problema: Select Uncontrolled → Controlled
Select começa sem valor (undefined) e depois recebe um valor, causando warning.

```tsx
// ❌ Problema
<Select value={formData.status}>  {/* undefined no início */}
```

### Solução: Valor Padrão
Sempre fornecer um valor válido, mesmo que seja o padrão.

```tsx
// ✅ Solução
<Select value={formData.status || 'OPEN'}>  {/* Sempre tem valor */}
```

## 🎯 Resultado Final

✅ **Sem loops infinitos** - Arrays e handlers estáveis  
✅ **Sem warnings** - Select sempre controlado  
✅ **Performance otimizada** - Menos re-renders desnecessários  
✅ **Código limpo** - TypeScript/ESLint sem erros  

## 📊 Impacto nas Dependências

### useEffect em WorkOrderDetailView
```typescript
useEffect(() => {
  if (workOrder) {
    setFormData({ ...workOrder });
    setIsDirty(false);
    setActiveTab('details');
  }
}, [workOrder?.id]); // ✅ Depende apenas do ID, não do objeto completo
```

### Handlers Memoizados
```typescript
// Todas as callbacks são estáveis
const handleSave = useCallback(..., [onSave, isDirty, formData]);
const handleFieldChange = useCallback(..., []);
const handlePrint = useCallback(..., [workOrder, formData, equipmentList, sectorsList, companiesList]);
```

## 🧪 Como Testar

1. Abrir página de Ordens de Serviço em visão dividida
2. Clicar em uma OS na lista da esquerda
3. ✅ Detalhes devem carregar sem erros no console
4. ✅ Select components devem funcionar normalmente
5. Editar campos e verificar que o botão "Salvar" ativa
6. ✅ Sem mensagens "Maximum update depth exceeded"
7. ✅ Sem warnings "Select is changing from uncontrolled to controlled"

## 📚 Referências

- [React Hooks: useMemo](https://react.dev/reference/react/useMemo)
- [React Hooks: useCallback](https://react.dev/reference/react/useCallback)
- [React Patterns: Memoization](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Radix UI: Select](https://www.radix-ui.com/docs/primitives/components/select)

---

**Data da Correção:** 2024-01-XX  
**Arquivos Modificados:**
- `src/hooks/useDataTemp.ts`
- `src/components/WorkOrderDetailView.tsx`
- `src/components/WorkOrderPanel.tsx`
