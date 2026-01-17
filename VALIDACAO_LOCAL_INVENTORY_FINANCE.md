# Guia de Validação Local - Integração Inventory → Finance

**Data**: 17 de Janeiro de 2026  
**Versão**: 1.0  

---

## 🎯 Objetivo

Validar que:
1. Movimentações de estoque (OUT) aparecem como lançamentos em Finance
2. Compromissos aprovados aparecem como Realizado
3. Idempotência garante sem duplicação
4. Multi-tenant está isolado corretamente

---

## 🚀 Pré-Requisitos

```bash
# 1. Clonar repo
git clone https://github.com/Rafaelrdl/climatrak_system.git
cd climatrak_system

# 2. Configurar ambiente
make dev          # Docker Compose (PostgreSQL + Redis)

# 3. Migrations
make migrate      # migrate_schemas para todos os tenants

# 4. Seed de dados
make seed         # Tenant UMC com usuário demo

# 5. Instalar dependências
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

---

## ✅ Teste 1: Criar Movimentação e Verificar Finance

### A. Criar Movimentação no Backend (Direto)

```bash
# Terminal: backend
python manage.py shell

# Execute:
from django.contrib.auth import get_user_model
from apps.inventory.models import InventoryItem, InventoryMovement, InventoryCategory
from apps.trakledger.models import CostCenter
from decimal import Decimal
from django.utils import timezone

User = get_user_model()

# Obter user e cost center (criados pelo seed)
user = User.objects.first()
cc = CostCenter.objects.first()

# Obter ou criar item
category = InventoryCategory.objects.first()
if not category:
    category = InventoryCategory.objects.create(name='Teste')

item = InventoryItem.objects.get_or_create(
    code='TST-001',
    defaults={
        'name': 'Item Teste',
        'category': category,
        'unit': 'UN',
        'quantity': Decimal('100'),
        'min_quantity': Decimal('10'),
        'unit_cost': Decimal('50.00'),
    }
)[0]

# Criar movimento de saída
movement = InventoryMovement.objects.create(
    item=item,
    type=InventoryMovement.MovementType.OUT,
    reason=InventoryMovement.Reason.WORK_ORDER,
    quantity=Decimal('5'),
    unit_cost=Decimal('50.00'),
    performed_by=user,
    note='Teste de integração'
)

print(f"✅ Movimento criado: {movement.id}")
print(f"   Custo total: {movement.total_value}")

# Verificar CostTransaction
from apps.trakledger.models import CostTransaction
ctx = CostTransaction.objects.filter(meta__inventory_movement_id=movement.id).first()
if ctx:
    print(f"✅ CostTransaction criada: {ctx.id}")
    print(f"   Amount: {ctx.amount}")
    print(f"   Occurred at: {ctx.occurred_at}")
    print(f"   Idempotency Key: {ctx.idempotency_key}")
else:
    print("❌ CostTransaction NÃO foi criada!")
```

**Resultado Esperado**:
```
✅ Movimento criado: 1
   Custo total: 250.00
✅ CostTransaction criada: {uuid}
   Amount: 250.00
   Occurred at: 2026-01-17 10:30:00+00:00
   Idempotency Key: inventory_movement:umc:1
```

---

### B. Verificar no Frontend (Lançamentos)

1. Abrir: http://localhost:5173 (login com demo@umc.localhost / Dev@123456)
2. Navegar: **Finance** → **Lançamentos**
3. Verificar tabela:
   - Coluna **Descrição**: "Consumo de Item Teste (5 UN)"
   - Coluna **Tipo**: "Peças"
   - Coluna **Valor**: "R$ 250,00"
   - Coluna **Data**: "17/01/2026"

4. Navegar: **Finance** → **Painel Financeiro**
5. Verificar card **Realizado**:
   - Antes: R$ 0,00 (ou valor anterior)
   - Depois: R$ 250,00 (ou anterior + 250)

---

### C. Testar Idempotência

```bash
# Terminal: backend, no shell de antes
# Chamar manualmente (simular reprocessamento)
from apps.inventory.services import InventoryFinanceIntegrationService

# Reprocessar
InventoryFinanceIntegrationService.create_cost_transaction_for_movement(movement)

# Verificar
ctx_count = CostTransaction.objects.filter(meta__inventory_movement_id=movement.id).count()
print(f"Número de CostTransaction: {ctx_count}")
```

**Resultado Esperado**:
```
Número de CostTransaction: 1  # Continua 1, não duplicou!
```

---

## ✅ Teste 2: Criar Compromisso e Verificar Finance

### A. Criar Compromisso no Backend

```bash
# Terminal: backend (novo shell)
python manage.py shell

from django.contrib.auth import get_user_model
from apps.trakledger.models import Commitment, CostCenter, CostTransaction
from decimal import Decimal
from django.utils import timezone

User = get_user_model()
user = User.objects.first()
cc = CostCenter.objects.first()

# Criar compromisso
commitment = Commitment.objects.create(
    cost_center=cc,
    budget_month=timezone.now().replace(day=1),
    amount=Decimal('1000.00'),
    category=Commitment.Category.PARTS,
    description='Compromisso teste para validação',
    created_by=user,
)

print(f"✅ Compromisso criado: {commitment.id}")
print(f"   Status: {commitment.status}")
print(f"   Valor: {commitment.amount}")

# Submeter
commitment.submit()
print(f"✅ Submetido. Status: {commitment.status}")

# Aprovar
commitment.approve(user)
print(f"✅ Aprovado. Status: {commitment.status}")

# Verificar CostTransaction
ctx = CostTransaction.objects.filter(meta__commitment_id=str(commitment.id)).first()
if ctx:
    print(f"✅ CostTransaction criada: {ctx.id}")
    print(f"   Amount: {ctx.amount}")
    print(f"   Transaction Type: {ctx.transaction_type}")
else:
    print("❌ CostTransaction NÃO foi criada ao aprovar!")
```

**Resultado Esperado**:
```
✅ Compromisso criado: {uuid}
   Status: draft
   Valor: 1000.00
✅ Submetido. Status: submitted
✅ Aprovado. Status: approved
✅ CostTransaction criada: {uuid}
   Amount: 1000.00
   Transaction Type: parts
```

---

### B. Verificar no Frontend

1. Abrir: http://localhost:5173 → **Finance** → **Painel Financeiro**
2. Verificar card **Realizado**:
   - Deve mostrar: R$ 1.000,00 (ou anterior + 1000)
3. Verificar card **Comprometido**:
   - Mostra: R$ 1.000,00 (confirmando que aprovado = realizado)

4. Navegar: **Finance** → **Lançamentos**
5. Filtrar ou procurar por "Compromisso teste"
6. Verificar:
   - Descrição: "Compromisso aprovado: Compromisso teste para validação"
   - Valor: "R$ 1.000,00"
   - Source: "commitment_approved" (no meta)

---

## ✅ Teste 3: Multi-Tenant Isolation

### A. Criar dois tenants (se não existir)

```bash
# Terminal: backend
python manage.py shell

from apps.tenants.models import Tenant
from django.utils.text import slugify

# Tenant 1 (já existe)
t1 = Tenant.objects.first()
print(f"Tenant 1: {t1.name} ({t1.schema_name})")

# Tenant 2 (se não existir)
t2, created = Tenant.objects.get_or_create(
    schema_name='teste2',
    defaults={
        'name': 'Tenant Teste 2',
    }
)
print(f"Tenant 2: {t2.name} ({t2.schema_name})")
```

### B. Criar movimento em Tenant 1, verificar que não aparece em Tenant 2

```bash
# Switch para Tenant 1
from django.db import connection
connection.set_tenant(Tenant.objects.get(schema_name='umc'))

# Criar movimento em T1
movement_t1 = InventoryMovement.objects.create(...)

# Verificar CostTransaction em T1
ctx_t1 = CostTransaction.objects.filter(meta__inventory_movement_id=movement_t1.id).first()
print(f"Tenant 1: CostTransaction = {ctx_t1}")

# Switch para Tenant 2
connection.set_tenant(Tenant.objects.get(schema_name='teste2'))

# Tentar encontrar em T2 (deve estar vazio)
ctx_t2_from_t1 = CostTransaction.objects.filter(meta__inventory_movement_id=movement_t1.id).first()
print(f"Tenant 2 vendo T1: CostTransaction = {ctx_t2_from_t1}")
```

**Resultado Esperado**:
```
Tenant 1: CostTransaction = <CostTransaction: ...>
Tenant 2 vendo T1: CostTransaction = None  # ✅ Isolado!
```

---

## ✅ Teste 4: Não Duplicar ao Reprocessar

### A. Testar reprocessamento de Commitment

```bash
# Terminal: backend
python manage.py shell

commitment = Commitment.objects.last()

# Contar antes
ctx_before = CostTransaction.objects.filter(meta__commitment_id=str(commitment.id)).count()
print(f"Antes: {ctx_before} CostTransaction")

# Reaprovação (vai falhar, mas idempotency_key protege)
try:
    commitment.status = Commitment.Status.SUBMITTED
    commitment.save()
    commitment.approve(User.objects.first())
except Exception as e:
    print(f"Esperado falhar: {e}")

# Contar depois
ctx_after = CostTransaction.objects.filter(meta__commitment_id=str(commitment.id)).count()
print(f"Depois: {ctx_after} CostTransaction (deve ser ≤ antes)")
```

**Resultado Esperado**:
```
Antes: 1 CostTransaction
Esperado falhar: ...
Depois: 1 CostTransaction  # ✅ Não duplicou!
```

---

## 🧪 Executar Testes Automatizados

```bash
# Terminal: backend

# Teste de integração Inventory → Finance
pytest apps/inventory/tests/test_inventory_finance_integration.py::TestInventoryToFinanceIntegration -v

# Teste de integração Commitment → Finance
pytest apps/inventory/tests/test_inventory_finance_integration.py::TestCommitmentToFinanceIntegration -v

# Todos os testes
pytest apps/inventory/tests/test_inventory_finance_integration.py -v

# Com coverage
pytest apps/inventory/tests/test_inventory_finance_integration.py --cov=apps.inventory --cov=apps.trakledger
```

---

## 📊 Verificações Visuais (Frontend)

### 1. Inventory "Histórico"

**Antes da implementação**:
- Tabela mostra: Item, Quantidade, Data, etc.
- NÃO há lançamento em Finance correspondente

**Depois da implementação**:
- Mesma tabela (sem mudanças)
- Mas agora Finance mostra o lançamento correspondente

---

### 2. Finance "Painel"

**Cards de KPI**:
- **Planejado**: De BudgetMonth (sem mudança)
- **Comprometido**: Commitments em APPROVED (sem mudança de cálculo)
- **Realizado**: Agora inclui:
  - CostTransaction criadas manualmente
  - **NOVO**: CostTransaction de InventoryMovement (saídas)
  - **NOVO**: CostTransaction de Commitment aprovados
- **Economia**: SavingsEvent (sem mudança)

**Exemplo antes**:
```
Planejado:    R$ 10.000,00
Comprometido: R$ 2.000,00
Realizado:    R$ 500,00      ← Apenas manual
Economia:     R$ 0,00
```

**Exemplo depois**:
```
Planejado:    R$ 10.000,00
Comprometido: R$ 2.000,00
Realizado:    R$ 3.700,00    ← +1000 (commitment) +250 (inventory) +500 (manual) +950 (outros)
Economia:     R$ 0,00
```

---

### 3. Finance "Lançamentos"

**Tabela agora mostra**:
- Lançamentos manuais (como antes)
- **NOVO**: Consumos de estoque (Inventory OUT)
- **NOVO**: Compromissos aprovados

**Filtros funcionam**:
- Por período ✅
- Por tipo (labor, parts, etc) ✅
- Por centro de custo ✅
- Busca por descrição ✅

---

## 🔍 Troubleshooting

### Problema: "CostTransaction não foi criada"

**Causa 1**: Sem cost_center
```python
# Verificar
from apps.trakledger.models import CostCenter
print(f"Cost centers: {CostCenter.objects.count()}")
# Se 0, criar um
cc = CostCenter.objects.create(code='CC-001', name='Default')
```

**Causa 2**: trakledger não está em INSTALLED_APPS
```python
# Verificar em backend/config/settings.py
# Deve ter: 'apps.trakledger'
```

**Causa 3**: Erro de import (CostTransaction não achado)
```python
# Testar import direto
try:
    from apps.trakledger.models import CostTransaction
    print("✅ Import OK")
except ImportError as e:
    print(f"❌ Import falhou: {e}")
```

---

### Problema: "Valor aparece zerado"

**Causa 1**: unit_cost é None
```python
# Verificar
movement = InventoryMovement.objects.last()
print(f"unit_cost: {movement.unit_cost}")
# Deve ser > 0
```

**Causa 2**: Movimento de tipo IN (não gera custo)
```python
# Verificar tipo
print(f"Type: {movement.type}")
# Deve ser OUT ou ADJUSTMENT
```

---

### Problema: "Aparece duplicado"

**Verificar idempotency**:
```python
from apps.trakledger.models import CostTransaction
ctx = CostTransaction.objects.filter(meta__inventory_movement_id=1)
print(f"Count: {ctx.count()}")
# Deve ser 1
```

---

## 📝 Checklist de Validação

- [ ] **Teste 1A**: Movimento OUT cria CostTransaction
- [ ] **Teste 1B**: Finance mostra o lançamento
- [ ] **Teste 1C**: Reprocessar não duplica
- [ ] **Teste 2A**: Compromisso aprovado cria CostTransaction
- [ ] **Teste 2B**: Finance mostra realizado
- [ ] **Teste 3**: Multi-tenant isolado
- [ ] **Teste 4**: Não duplica ao reprocessar
- [ ] **Testes Automatizados**: Todos passando
- [ ] **Visual 1**: Histórico continua OK
- [ ] **Visual 2**: Painel mostra valores corretos
- [ ] **Visual 3**: Lançamentos lista tudo

---

## 🚀 Próximos Passos Pós-Validação

1. **Deploy**: Fazer backup, rodar migrations, testar em staging
2. **Backfill**: Executar command para movimentações históricas
3. **Monitoring**: Alertas para erros de integração
4. **Documentação**: Atualizar docs/integration/inventory-to-finance.md

