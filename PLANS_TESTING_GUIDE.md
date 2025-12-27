# Sistema de Testes - Planos com Múltiplos Equipamentos

## Visão Geral

Este documento descreve o sistema abrangente de testes criado para validar a funcionalidade de criação de planos de manutenção com múltiplos equipamentos no TrakNor CMMS.

## Estrutura do Sistema de Testes

### 1. Página Principal de Testes
**Localização:** `/plans-testing`

A página de testes é organizada em 3 abas principais:

#### Visão Geral
- **Saúde do Ambiente:** Verifica se o ambiente está configurado corretamente para os testes
- **Estatísticas:** Mostra quantidades de empresas, setores, equipamentos e planos
- **Guia de Uso:** Instruções sobre como usar as ferramentas de teste
- **Testes Rápidos:** Ações rápidas para validação imediata

#### Testes Automáticos
- **Teste de Filtragem:** Valida filtros por empresa e setor
- **Teste de Seleção Múltipla:** Verifica se múltiplos equipamentos podem ser selecionados
- **Teste de Validação:** Confirma que validações do formulário funcionam
- **Teste de Geração de OS:** Valida criação automática de ordens de serviço

#### Cenários de Uso
- **Cenário 1:** Plano para toda uma empresa
- **Cenário 2:** Plano específico por setor
- **Cenário 3:** Plano industrial complexo

## Como Executar os Testes

### Passo 1: Acesse a Página de Testes
1. Navegue para `/plans-testing` na aplicação
2. Verifique a saúde do ambiente na aba "Visão Geral"
3. Certifique-se de que há pelo menos 90% de aprovação nos checks

### Passo 2: Execute os Testes Automáticos
1. Vá para a aba "Testes Automáticos"
2. Clique em "Executar Todos os Testes"
3. Observe os resultados de cada teste individual
4. Verifique se todos os testes passaram (status "Aprovado")

### Passo 3: Teste os Cenários de Uso
1. Vá para a aba "Cenários de Uso"
2. Para cada cenário:
   - Clique em "Executar Cenário"
   - Siga os passos descritos no modal que abre
   - Preencha o formulário conforme as instruções
   - Salve o plano
   - Verifique se o cenário foi marcado como "Aprovado"

## Funcionalidades Validadas

### 1. Filtragem por Empresa
**O que testa:** Quando uma empresa é selecionada, apenas os equipamentos dessa empresa aparecem na lista.

**Como funciona:**
- Busca todos os setores da empresa selecionada
- Filtra equipamentos que pertencem a esses setores
- Exibe apenas equipamentos relevantes

### 2. Filtragem por Setor
**O que testa:** Quando um setor específico é selecionado, apenas equipamentos desse setor aparecem.

**Como funciona:**
- Filtra equipamentos diretamente pelo ID do setor
- Mostra apenas equipamentos do setor selecionado

### 3. Seleção Múltipla de Equipamentos
**O que testa:** Possibilidade de selecionar vários equipamentos para um único plano.

**Como funciona:**
- Interface permite adicionar/remover equipamentos
- Lista mostra todos os equipamentos selecionados
- Validação requer pelo menos um equipamento

### 4. Validação de Formulário
**O que testa:** Formulário impede criação de planos inválidos.

**Validações:**
- Nome do plano (obrigatório, mín. 3 caracteres)
- Frequência (obrigatório)
- Localização (empresa ou setor obrigatório)
- Equipamentos (pelo menos um obrigatório)

### 5. Geração de Ordens de Serviço
**O que testa:** Sistema gera uma OS para cada equipamento do plano.

**Como funciona:**
- Botão "Gerar OS" nos planos ativos
- Uma OS criada para cada equipamento do plano
- OSs herdam configurações do plano (frequência, tarefas)

### 6. Geração Automática
**O que testa:** Planos com auto-geração ativa calculam próxima execução.

**Como funciona:**
- Checkbox "Gerar ordens de serviço automaticamente"
- Cálculo automático da próxima data de execução
- Sistema programa geração futura de OSs

## Cenários de Teste Detalhados

### Cenário 1: Plano para Toda uma Empresa
**Objetivo:** Criar um plano que cubra todos os equipamentos de uma empresa.

**Passos:**
1. Selecionar empresa "TechCorp Industrial"
2. Verificar se aparecem todos os equipamentos da empresa
3. Selecionar todos os equipamentos disponíveis
4. Configurar frequência mensal
5. Ativar geração automática
6. Salvar o plano

**Validação:** Plano criado com pelo menos 2 equipamentos da TechCorp.

### Cenário 2: Plano Específico por Setor
**Objetivo:** Criar um plano focado apenas em equipamentos de um setor.

**Passos:**
1. Selecionar setor "Departamento de TI"
2. Verificar filtragem específica do setor
3. Selecionar equipamentos do setor
4. Configurar frequência trimestral
5. Desativar geração automática
6. Adicionar tarefas específicas
7. Salvar o plano

**Validação:** Plano criado apenas com equipamentos do Departamento de TI.

### Cenário 3: Plano Industrial Complexo
**Objetivo:** Criar um plano abrangente para equipamentos industriais.

**Passos:**
1. Selecionar empresa "Industrial Corp"
2. Filtrar equipamentos industriais
3. Selecionar múltiplos equipamentos de alta capacidade
4. Configurar frequência semanal
5. Adicionar checklist detalhado
6. Ativar geração automática
7. Definir data de início específica
8. Validar cálculo da próxima execução

**Validação:** Plano industrial com geração automática semanal e tarefas detalhadas.

## Dados de Teste Disponíveis

### Empresas
1. **TechCorp Industrial** (Tecnologia)
2. **Industrial Corp** (Manufatura) 
3. **Shopping Center Norte** (Varejo)

### Setores por Empresa
**TechCorp Industrial:**
- Setor Administrativo (4 unidades HVAC)
- Departamento de TI (3 unidades HVAC)

**Industrial Corp:**
- Chão de Fábrica (15 unidades HVAC)

**Shopping Center Norte:**
- Praça de Alimentação (8 unidades HVAC)
- Lojas Piso Térreo (15 unidades HVAC)

### Equipamentos por Setor
- **CLI-001:** Carrier Central (Setor Administrativo)
- **SPL-002:** LG Split (Departamento de TI)
- **CHI-003:** York Chiller (Chão de Fábrica)
- **VRF-004:** Daikin VRF (Setor Administrativo)
- **SPL-005:** Midea Split (Praça de Alimentação)
- **CLI-006:** Trane Central (Lojas Piso Térreo)

## Interpretando os Resultados

### Testes Automáticos
- ✅ **Aprovado:** Funcionalidade está operando corretamente
- ❌ **Reprovado:** Há um problema que precisa ser corrigido
- 🔄 **Executando:** Teste em andamento
- ⏳ **Pendente:** Teste ainda não foi executado

### Cenários de Uso
- **Aprovado:** Plano foi criado conforme especificações do cenário
- **Reprovado:** Plano não atende aos critérios do cenário
- **Pendente:** Cenário ainda não foi executado

### Saúde do Ambiente
- **Excelente (90-100%):** Ambiente totalmente configurado para testes
- **Boa (70-89%):** Ambiente adequado, pode haver limitações menores
- **Requer Atenção (<70%):** Problemas significativos no ambiente de teste

## Troubleshooting

### Problema: Testes falham consistentemente
**Solução:** Verifique se há dados suficientes (empresas, setores, equipamentos) no sistema.

### Problema: Equipamentos não aparecem ao selecionar empresa
**Solução:** Verifique se os equipamentos estão corretamente vinculados aos setores da empresa.

### Problema: Validação não funciona
**Solução:** Verifique se as regras de validação estão implementadas no componente PlanFormModal.

### Problema: OSs não são geradas
**Solução:** Confirme se o plano tem equipamentos selecionados e está com status "Ativo".

## Próximos Passos

Após executar todos os testes com sucesso, você pode:

1. **Criar planos reais** usando o conhecimento adquirido
2. **Testar geração automática** configurando planos com datas futuras
3. **Validar integrações** verificando se as OSs criadas aparecem na página de Ordens de Serviço
4. **Expandir testes** adicionando novos cenários conforme necessário

## Arquivos do Sistema de Testes

- `src/pages/PlansTestingPage.tsx` - Página principal de testes
- `src/components/PlansTestingSuite.tsx` - Suite de testes automáticos
- `src/components/PlanTestScenarios.tsx` - Cenários de uso
- `src/components/PlanFormModal.tsx` - Modal de criação/edição de planos
- `src/data/plansStore.ts` - Gerenciamento de dados de planos
- `src/hooks/useMaintenancePlans.ts` - Hook para planos de manutenção

Este sistema de testes garante que a funcionalidade de planos com múltiplos equipamentos está funcionando corretamente em todos os aspectos críticos.