# Testes E2E - ClimaTrak System

## Overview

Os testes E2E garantem que os fluxos críticos do sistema funcionem corretamente de ponta a ponta.

## Estrutura

```
cypress/
├── e2e/
│   ├── critical/           # Testes prioritários (smoke tests)
│   │   ├── auth.cy.ts      # Login, logout, tenant switching
│   │   ├── dashboard.cy.ts # Dashboard loading, KPIs
│   │   ├── work-order.cy.ts # Criar OS, custos, workflow
│   │   └── telemetry-alerts.cy.ts # Sensores, leituras, alertas
│   └── acl/                # Testes de controle de acesso
├── fixtures/
│   └── users.json          # Usuários de teste
├── support/
│   ├── commands.ts         # Custom commands
│   └── e2e.ts              # Setup global
└── videos/                 # Gravações dos testes
```

## Executando Localmente

### Pré-requisitos

1. Backend rodando em `http://localhost:8000`
2. Frontend rodando em `http://localhost:5173`
3. Banco de dados com dados de teste

### Criar dados de teste

```bash
cd backend
python manage.py create_e2e_test_data
```

### Executar testes

```bash
cd frontend

# Abrir interface interativa
npm run cy:open

# Rodar todos os testes (headless)
npm run cy:run

# Rodar apenas smoke tests
npm run cy:smoke

# Rodar testes críticos
npm run cy:critical

# Rodar suite completa (nightly)
npm run cy:nightly
```

## Estratégia de Execução

### Em PRs (Smoke Tests)
- **Escopo:** `auth.cy.ts` + `dashboard.cy.ts`
- **Duração:** ~2 minutos
- **Objetivo:** Validar que login e navegação básica funcionam

### Nightly (Full Suite)
- **Escopo:** Todos os testes em `cypress/e2e/`
- **Duração:** ~10 minutos
- **Objetivo:** Validar todos os fluxos críticos

### Manual (Critical)
- **Escopo:** `cypress/e2e/critical/**/*.cy.ts`
- **Trigger:** workflow_dispatch no GitHub

## Fluxos Testados

### 1. Autenticação (`auth.cy.ts`)
- ✅ Login centralizado com credenciais válidas
- ✅ Erro para credenciais inválidas
- ✅ Redirecionamento após login
- ✅ Troca de tenant (multi-tenant)
- ✅ Logout completo
- ✅ Refresh token

### 2. Dashboard (`dashboard.cy.ts`)
- ✅ Carregar sem erros
- ✅ KPIs visíveis
- ✅ Performance (< 3 segundos)
- ✅ Autorização por role

### 3. Ordens de Serviço (`work-order.cy.ts`)
- ✅ Listar ordens existentes
- ✅ Criar nova OS
- ✅ Adicionar custos (mão de obra, materiais)
- ✅ Workflow de status
- ✅ Visualizar detalhes

### 4. Telemetria e Alertas (`telemetry-alerts.cy.ts`)
- ✅ Listar sensores
- ✅ Visualizar leituras
- ✅ Alertas ativos
- ✅ Configurar regras de alerta

## Credenciais de Teste

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@climatrak.test | TestAdmin123! |
| Operator | operator@climatrak.test | TestOperator123! |
| Viewer | viewer@climatrak.test | TestViewer123! |

## Custom Commands

### `cy.login(email, password, tenant?)`
Login via API (rápido, para setup de testes).

```typescript
cy.login('admin@climatrak.test', 'TestAdmin123!', 'demo');
```

### `cy.loginViaUI(email, password)`
Login via interface (para testar o fluxo de login).

```typescript
cy.loginViaUI('admin@climatrak.test', 'TestAdmin123!');
```

### `cy.selectTenant(tenantName)`
Selecionar tenant no dropdown.

```typescript
cy.selectTenant('acme');
```

### `cy.getByTestId(id)`
Buscar elemento por `data-testid`.

```typescript
cy.getByTestId('submit-button').click();
```

### `cy.checkToast(message, type?)`
Verificar se um toast/notification aparece.

```typescript
cy.checkToast('Ordem criada com sucesso', 'success');
```

### `cy.navigateTo(section)`
Navegar para seção do app.

```typescript
cy.navigateTo('cmms'); // CMMS/Manutenção
cy.navigateTo('monitor'); // Monitor/Telemetria
cy.navigateTo('finance'); // Financeiro
```

## Boas Práticas

1. **Use `data-testid`** para seletores estáveis
2. **Evite `cy.wait(ms)`** - use `cy.intercept()` + `cy.wait('@alias')`
3. **Login via API** quando não estiver testando login
4. **Isolamento** - cada teste deve funcionar independente
5. **Assertions claras** - uma por bloco `it()`

## Troubleshooting

### Testes falhando no CI
1. Verificar se backend está rodando
2. Verificar se fixtures estão carregadas
3. Checar screenshots em `cypress/screenshots`

### Timeout em elementos
```typescript
// Aumentar timeout para elemento específico
cy.get('[data-testid="slow-element"]', { timeout: 15000 });
```

### Debug
```typescript
cy.pause(); // Pausa execução
cy.debug(); // Log detalhado
```

## CI/CD

Os testes rodam automaticamente via GitHub Actions:

- **PR:** Smoke tests bloqueiam merge se falharem
- **Nightly:** Suite completa às 03:00 UTC
- **Manual:** Via workflow_dispatch

Ver [.github/workflows/e2e-tests.yml](../../.github/workflows/e2e-tests.yml)
