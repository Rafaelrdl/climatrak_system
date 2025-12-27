# Dados Fictícios Centralizados

## Localização dos Dados

Todos os dados fictícios da aplicação estão centralizados no arquivo:

**`src/data/mockData.ts`**

## Estrutura dos Dados

### 📊 **Dados Disponíveis:**

1. **MOCK_COMPANIES** - Empresas/clientes
2. **MOCK_SECTORS** - Setores das empresas  
3. **MOCK_SUBSECTIONS** - Subseções dos setores
4. **MOCK_EQUIPMENT** - Equipamentos HVAC
5. **MOCK_WORK_ORDERS** - Ordens de serviço
6. **MOCK_MAINTENANCE_PLANS** - Planos de manutenção
7. **MOCK_STOCK_ITEMS** - Itens de estoque
8. **MOCK_DASHBOARD_KPIS** - KPIs do dashboard

## Como Alterar os Dados

### ✏️ **Para alterar valores que aparecem na tela:**

1. Abra o arquivo `src/data/mockData.ts`
2. Localize a seção que deseja alterar (ex: `MOCK_COMPANIES`)
3. Modifique os valores desejados
4. Salve o arquivo
5. A aplicação será recarregada automaticamente com os novos dados

### 📋 **Exemplo - Alterando nome de uma empresa:**

```typescript
// Em src/data/mockData.ts
export const MOCK_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'Minha Nova Empresa',  // ← Altere aqui
    segment: 'Tecnologia',
    // ... resto dos dados
  }
];
```

## Onde os Dados São Utilizados

### 🔗 **Integração com a aplicação:**

- **Contextos**: `src/contexts/LocationContext.tsx` usa dados de empresas, setores e subseções
- **Hooks**: `src/hooks/useData.ts` expõe todos os dados através de hooks personalizados
- **Páginas**: Todas as páginas consomem os dados através dos hooks

### 🎯 **Hooks disponíveis:**

```typescript
import { useCompanies, useEquipment, useWorkOrders } from '@/hooks/useData';

// Exemplo de uso
const { data: companies } = useCompanies();
const { data: equipment } = useEquipment();
const { data: workOrders } = useWorkOrders();
```

## Benefícios da Centralização

✅ **Fácil manutenção** - Um único arquivo para alterar todos os dados  
✅ **Consistência** - Dados sempre sincronizados em toda a aplicação  
✅ **Tipagem TypeScript** - Validação automática dos tipos de dados  
✅ **Reutilização** - Mesmos dados podem ser usados em múltiplos componentes  

## Tipos de Dados

Todos os tipos estão definidos em `src/types/index.ts` e garantem que os dados fictícios seguem a estrutura correta da aplicação.

---

💡 **Dica**: Quando a aplicação evoluir para usar dados reais de uma API, basta substituir o retorno dos hooks em `useData.ts` por chamadas HTTP, mantendo a mesma interface.
