# Correção do Loop Infinito de Renderização no WorkOrderPanel

## Problema Identificado

**Erro**: `Maximum update depth exceeded` ao clicar em uma ordem de serviço no painel esquerdo da visão dividida.

**Causa Raiz**: Atualizações de estado em cascata criando um loop infinito entre `WorkOrderList` e `WorkOrderPanel`.

## Correções Aplicadas

### 1. WorkOrderList.tsx - Remoção de Dupla Atualização

**Antes:**
```tsx
const handleWorkOrderClick = (workOrder: WorkOrder) => {
  setSelectedWorkOrder(workOrder);  // Primeira atualização
  onSelectWorkOrder?.(workOrder);   // Segunda atualização - CAUSAVA LOOP
};
```

**Depois:**
```tsx
const handleWorkOrderClick = (workOrder: WorkOrder) => {
  // Use apenas a store global para evitar dupla atualização
  setSelectedWorkOrder(workOrder);
  // onSelectWorkOrder já seria chamado pelo handleSelectWorkOrder do panel,
  // causando dupla atualização e loop infinito
};
```

**Mudanças:**
- ✅ Removida a prop `onSelectWorkOrder` da interface `WorkOrderListProps`
- ✅ Removida a chamada para `onSelectWorkOrder` em `handleWorkOrderClick`
- ✅ Mantida apenas a atualização direta via `setSelectedWorkOrder` da store global

### 2. WorkOrderPanel.tsx - Remoção do useEffect Problemático

**Antes:**
```tsx
// Atualizar quando a lista mudar
useEffect(() => {
  if (selectedWorkOrder) {
    const updated = workOrders.find(wo => wo.id === selectedWorkOrder.id);
    if (updated) {
      setSelectedWorkOrder(updated);  // CAUSAVA LOOP EM CASCATA
    }
  }
}, [workOrders]);
```

**Depois:**
```tsx
// Removido useEffect que causava loop infinito ao atualizar workOrders
// A seleção é tratada apenas em resposta a ações do usuário
```

**Mudanças:**
- ✅ Removido completamente o `useEffect` que reagia a mudanças em `workOrders`
- ✅ Seleção agora tratada apenas em resposta a ações do usuário (cliques, navegação)
- ✅ Evita atualização automática que disparava re-renderizações em cascata

### 3. WorkOrderPanel.tsx - Simplificação do handleSelectWorkOrder

**Antes:**
```tsx
const handleSelectWorkOrder = useCallback((workOrder: WorkOrder) => {
  if (selectedWorkOrder?.id !== workOrder.id) {
    setSelectedWorkOrderRef.current(workOrder);  // Via ref
  }
}, [selectedWorkOrder?.id]);
```

**Depois:**
```tsx
const handleSelectWorkOrder = useCallback((workOrder: WorkOrder) => {
  if (selectedWorkOrder?.id !== workOrder.id) {
    setSelectedWorkOrder(workOrder);  // Diretamente
  }
}, [selectedWorkOrder?.id, setSelectedWorkOrder]);
```

**Mudanças:**
- ✅ Uso direto de `setSelectedWorkOrder` ao invés de ref
- ✅ Dependências corretas no `useCallback`
- ✅ Código mais limpo e direto

### 4. WorkOrderPanel.tsx - Remoção de Prop Inexistente

**Antes:**
```tsx
<WorkOrderList
  workOrders={workOrders}
  compact
  onSelectWorkOrder={handleSelectWorkOrder}  // Prop não existe mais
  onStartWorkOrder={onStartWorkOrder}
  onEditWorkOrder={onEditWorkOrder}
/>
```

**Depois:**
```tsx
<WorkOrderList
  workOrders={workOrders}
  compact
  onStartWorkOrder={onStartWorkOrder}
  onEditWorkOrder={onEditWorkOrder}
/>
```

## Fluxo de Atualização Corrigido

### Antes (Com Loop Infinito):
1. Usuário clica em OS → `handleWorkOrderClick` chamado
2. `setSelectedWorkOrder(workOrder)` → Store atualizada
3. `onSelectWorkOrder(workOrder)` → Chama `handleSelectWorkOrder` do panel
4. `handleSelectWorkOrder` → Chama `setSelectedWorkOrder` novamente
5. Store atualizada → Componentes re-renderizam
6. `workOrders` array recriado → `useEffect` dispara
7. `useEffect` chama `setSelectedWorkOrder` novamente
8. **Loop infinito** 🔥

### Depois (Corrigido):
1. Usuário clica em OS → `handleWorkOrderClick` chamado
2. `setSelectedWorkOrder(workOrder)` → Store atualizada **UMA VEZ**
3. Componentes re-renderizam com nova seleção
4. ✅ Fim do fluxo - **Sem loops**

## Benefícios

- ✅ Eliminado loop infinito de renderização
- ✅ Código mais simples e direto
- ✅ Melhor performance (menos re-renderizações desnecessárias)
- ✅ Fluxo de dados unidirecional claro
- ✅ Manutenção facilitada

## Teste

Para testar a correção:

1. Acesse a página de Ordens de Serviço
2. Selecione a visualização em painel (ícone de duas colunas)
3. Clique em qualquer ordem de serviço na lista à esquerda
4. ✅ A ordem deve ser selecionada sem erros no console
5. ✅ Os detalhes devem aparecer no painel direito
6. ✅ Navegação entre ordens deve funcionar normalmente

## Arquivos Modificados

- `/workspaces/spark-template/src/components/WorkOrderList.tsx`
- `/workspaces/spark-template/src/components/WorkOrderPanel.tsx`

## Data da Correção

2 de outubro de 2025
