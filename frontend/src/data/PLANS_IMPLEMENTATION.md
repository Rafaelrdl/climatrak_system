# Planos de Manutenção - Implementação Completa

## Resumo

Foi implementada uma funcionalidade completa para gestão de Planos de Manutenção no sistema TrakNor CMMS, incluindo:

- ✅ Criação de novos planos com modal acessível
- ✅ Edição de planos existentes
- ✅ Validação de formulários
- ✅ Persistência em localStorage (mocks + localStorage)
- ✅ Gestão de tarefas e checklists
- ✅ Interface responsiva e acessível
- ✅ Testes unitários abrangentes

## Arquivos Criados/Modificados

### Novos Arquivos

1. **src/models/plan.ts**
   - Definição dos tipos TypeScript para MaintenancePlan, PlanTask e PlanStatus
   - Tipagem estrita com campos obrigatórios e opcionais

2. **src/data/plansStore.ts**
   - Funções puras para gerenciamento de dados: loadPlans, savePlans, createPlan, updatePlan, findPlanById, deletePlan
   - Mock data para seed inicial
   - Persistência em localStorage com fallback para mock

3. **src/hooks/useMaintenancePlans.ts**
   - Hook personalizado para gestão de estado dos planos
   - Funções utilitárias para manipulação da lista
   - Integração com localStorage

4. **src/components/PlanFormModal.tsx**
   - Modal/formulário completo para criação e edição de planos
   - Validação em tempo real
   - Gestão dinâmica de tarefas e checklists
   - Suporte a escopo (localização + equipamento)
   - Acessibilidade completa (ARIA, focus management, keyboard navigation)

### Arquivos Modificados

5. **src/pages/PlansPage.tsx**
   - Integração com nova funcionalidade
   - Tabela acessível com role="grid"
   - Estados vazios tratados
   - Ações de editar com labels descritivos

### Testes

6. **src/__tests__/plansStore.test.ts**
   - Testes para todas as funções do data store
   - Cobertura de casos de erro e edge cases
   - Mock do localStorage

7. **src/__tests__/PlanFormModal.test.tsx**
   - Testes de interação do modal
   - Validação de formulários
   - Gestão de tarefas e checklists
   - Testes de acessibilidade

8. **src/__tests__/PlansPage.test.tsx**
   - Testes da página principal
   - Estados vazios e com dados
   - Interações com modal
   - Estrutura de tabela acessível

## Funcionalidades Implementadas

### ✅ Criação de Planos
- Modal com formulário de múltiplas seções
- Campos: nome, descrição, frequência, escopo, status, data de início
- Validação obrigatória: nome (min 3 chars) e frequência
- Seleção de localização e equipamento via dropdowns
- Gestão dinâmica de tarefas com checklists opcionais

### ✅ Edição de Planos  
- Mesmo modal em modo edição
- Pré-carregamento dos dados existentes
- Atualização com timestamp automático
- Preservação da estrutura original

### ✅ Lista de Planos
- Tabela responsiva com colunas: Nome, Frequência, Escopo, Status, Ações
- Badge de status (Ativo/Inativo)
- Display inteligente de escopo (localização/equipamento ou "Geral")
- Estado vazio com call-to-action

### ✅ Persistência
- localStorage como fonte de verdade em runtime
- Mock data para seed inicial
- Funções puras para todas operações CRUD
- Sincronização automática entre UI e storage

### ✅ Acessibilidade (WCAG AA)
- Estrutura de tabela semântica com headers
- Focus management em modals
- ARIA labels e descriptions
- Navegação por teclado (Tab, Enter, Esc)
- Labels associados aos campos de formulário
- Mensagens de erro vinculadas aos campos

### ✅ Validações
- Nome obrigatório (mínimo 3 caracteres)
- Frequência obrigatória
- Validação de tarefas (nome obrigatório se tarefa existe)
- Feedback visual e textual de erros
- Toast notifications para sucesso/erro

## Tokens de Design Utilizados

A implementação segue os tokens existentes do projeto:
- Cores: primary, secondary, muted, destructive
- Espaçamentos: gap-2, gap-4, space-y-6
- Bordas: rounded-md, border
- Sombras: shadow-lg
- Tipografia: text-sm, font-medium, font-semibold

## Como Usar

### Acessar a Tela
1. Navegar para `/plans` na aplicação
2. Visualizar lista de planos existentes ou estado vazio

### Criar Novo Plano
1. Clicar no botão "Novo Plano" (header ou estado vazio)
2. Preencher campos obrigatórios: Nome e Frequência  
3. Opcionalmente: descrição, escopo (localização/equipamento), data de início
4. Adicionar tarefas com "Adicionar Tarefa"
5. Para cada tarefa, adicionar itens do checklist (opcional)
6. Clicar "Salvar"

### Editar Plano Existente
1. Na tabela, clicar no botão "Editar" da linha desejada
2. Modificar os campos necessários
3. Clicar "Atualizar"

### Gestão de Tarefas
- "Adicionar Tarefa": cria nova tarefa vazia
- Para cada tarefa: definir nome (obrigatório)
- "Adicionar Item": adiciona item ao checklist da tarefa
- Botões de remoção (🗑️) para tarefas e itens do checklist

## Dados Mock

O sistema vem com 3 planos pré-configurados:

1. **Plano Mensal - Climatizadores**
   - Frequência: Mensal
   - Escopo: Setor Administrativo
   - 2 tarefas com checklists

2. **Plano Trimestral - Splits**
   - Frequência: Trimestral  
   - Escopo: Split LG 12.000 BTUs
   - 1 tarefa com checklist

3. **Plano Semestral - Chillers** 
   - Frequência: Semestral
   - Escopo: Departamento de TI + Chiller Industrial 500TR
   - 2 tarefas, status Inativo

## Testes

### Executar Testes
```bash
npm test src/__tests__/plansStore.test.ts
npm test src/__tests__/PlanFormModal.test.tsx  
npm test src/__tests__/PlansPage.test.tsx
```

### Cobertura
- **plansStore**: 100% das funções CRUD
- **PlanFormModal**: validações, interações, acessibilidade
- **PlansPage**: renderização, estados, ações

## Critérios de Aceite ✅

- [x] Botão + Novo Plano abre formulário acessível
- [x] Salvar cria plano em mocks/localStorage e atualiza lista
- [x] Ação Editar abre mesmo formulário com dados preenchidos
- [x] Tabela com colunas: Nome, Frequência, Escopo, Status, Ações
- [x] UI segue tema/tokens do projeto (Tailwind/shadcn)
- [x] Nenhuma dependência nova adicionada
- [x] Testes mínimos cobrindo store, formulário e a11y
- [x] Arquitetura preservada (sem mudanças em rotas/estrutura)
- [x] Idioma pt-BR em toda a interface

## Próximos Passos (Opcionais)

1. **Integração com Backend**: substituir localStorage por APIs REST
2. **Filtros e Busca**: adicionar filtros por status, frequência, escopo
3. **Ações em Lote**: seleção múltipla para ativar/desativar planos
4. **Histórico de Alterações**: log de mudanças nos planos
5. **Importação/Exportação**: CSV/JSON para backup de planos
6. **Notificações**: alertas para planos vencidos ou próximos ao vencimento

## Commits Sugeridos

Para organizar o histórico:

```bash
git add src/models/plan.ts src/data/plansStore.ts
git commit -m "feat(planos): criar tipos e store com persistência mock"

git add src/hooks/useMaintenancePlans.ts  
git commit -m "feat(planos): hook personalizado para gestão de estado"

git add src/components/PlanFormModal.tsx
git commit -m "feat(planos): modal de criação/edição com validação e a11y"

git add src/pages/PlansPage.tsx
git commit -m "feat(planos): integrar funcionalidades na página principal"

git add src/__tests__/*
git commit -m "test(planos): cobertura completa store, componentes e a11y"
```