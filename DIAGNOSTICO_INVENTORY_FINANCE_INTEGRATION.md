# Diagnóstico: Integração Inventory → Finance/TrakLedger + Commitments

**Data:** 17 de Janeiro de 2026  
**Status:** Causa Raiz Identificada - Falta de Integração Completa  
**Escopo:** Multi-tenant com django-tenants, idempotência obrigatória  

---

## 📋 Resumo Executivo

**Problema**: 
1. Movimentações de estoque (InventoryMovement) no Inventory **NÃO aparecem como lançamentos** (CostTransaction) em Finance
2. Compromissos aprovados (Commitment) em Finance **NÃO refletem corretamente** no card "Realizado"

**Causa Raiz**:
1. **D1**: Não existe integração entre InventoryMovement → CostTransaction
2. **D6**: Commitment aprovado está sendo tratado como "Comprometido" em vez de virar "Realizado"

---

## 📊 Arquitetura de Dados Atual

### 1. InventoryMovement (backend/apps/inventory/models.py)

```python
class InventoryMovement(models.Model):
    item = ForeignKey(InventoryItem)
    type ∈ [IN, OUT, ADJUSTMENT, TRANSFER, RETURN]
    reason ∈ [PURCHASE, WORK_ORDER, ADJUSTMENT, DAMAGE, ...]
    quantity: Decimal
    unit_cost: Decimal  # ← Custo capturado
    work_order = FK(WorkOrder, optional)  # ← Vínculo com OS
    reference: str  # Exemplo: "INITIAL_BALANCE:123"
    performed_by: FK(User)
    created_at: DateTime
    
    @property
    def total_value(self):
        return self.quantity * self.unit_cost
```

**Estado Atual**: 
- ✅ Model completo com todos os dados necessários
- ✅ Rastreia custo unitário e total
- ✅ Vínculo com WorkOrder (opcional)
- ❌ **NÃO gera CostTransaction após criação**
- ❌ **NÃO publica eventos**

**Endpoint**: `POST /api/inventory/movements/` (em InventoryMovementViewSet)

---

### 2. CostTransaction (backend/apps/trakledger/models.py)

```python
class CostTransaction(models.Model):
    # Idempotência (obrigatório)
    idempotency_key: str (unique per tenant)  # ← Garante sem duplicação
    
    # Classificação
    transaction_type ∈ [labor, parts, third_party, energy, adjustment, other]
    category ∈ [preventive, corrective, predictive, improvement, parts, ...]
    
    # Valores
    amount: Decimal  # Valor do lançamento
    occurred_at: DateTime  # Quando ocorreu
    
    # Relacionamentos
    cost_center = FK(CostCenter, required)
    asset = FK(Asset, optional)
    work_order = FK(WorkOrder, optional)
    
    # Lock de período
    is_locked: bool  # Impede edição após lock mensal
    
    # Auditoria
    created_at, updated_at, created_by
    
    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="tl_ctx_uniq_idempotency"
            )
        ]
```

**Estado Atual**:
- ✅ Modelo com idempotência garantida
- ✅ Relacionamento com cost_center (obrigatório)
- ✅ Lock de período implementado
- ❌ **Nenhum InventoryMovement vira CostTransaction**

**Endpoint**: `GET /api/trakledger/transactions/`

---

### 3. Commitment (backend/apps/trakledger/models.py)

```python
class Commitment(models.Model):
    status ∈ [draft, submitted, approved, rejected, cancelled, realized]
    
    cost_center = FK(CostCenter, required)
    budget_month: Date  # Sempre primeiro dia do mês
    amount: Decimal
    category: str
    
    approved_by: FK(User, optional)
    approved_at: DateTime
    
    work_order = FK(WorkOrder, optional)  # Relacionamento com OS
    
    def approve(self, user):
        """Aprova compromisso e publica evento"""
        self.status = Status.APPROVED
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()
        
        # ✅ Publica evento: commitment.approved
        EventPublisher.publish(
            tenant_id=connection.tenant,
            event_name='commitment.approved',
            ...
        )
```

**Estado Atual**:
- ✅ Estados bem definidos
- ✅ Evento `commitment.approved` é publicado ao aprovar
- ❌ **NÃO há consumer Celery que processa o evento**
- ❌ **Compromisso aprovado ≠ Realizado em Ledger**

---

### 4. FinanceSummary (backend/apps/trakledger/views.py - BudgetSummaryViewSet)

```python
def list(self, request):
    # Query params: month (required), cost_center (optional)
    
    # 1. Planned: soma BudgetMonth para o mês
    planned = BudgetMonth.objects
        .filter(month=month_date)
        .aggregate(Sum("planned_amount"))
    
    # 2. Committed: soma Commitment (SUBMITTED + APPROVED)
    committed = Commitment.objects
        .filter(budget_month=month_date, 
                status__in=[SUBMITTED, APPROVED])
        .aggregate(Sum("amount"))
    
    # 3. Actual: soma CostTransaction do período
    actual = CostTransaction.objects
        .filter(occurred_at__date__gte=month_start, 
                occurred_at__date__lte=month_end)
        .aggregate(Sum("amount"))
    
    # 4. Savings: soma SavingsEvent
    savings = SavingsEvent.objects
        .filter(occurred_at__date__gte=month_start, 
                occurred_at__date__lte=month_end)
        .aggregate(Sum("savings_amount"))
    
    variance = planned - actual
    
    # Breakdown por categoria
    by_category = ...
```

**Estado Atual**:
- ✅ Cálculo correto de planned/committed/actual
- ✅ Filtra por período corretamente
- ❌ **"actual" só inclui CostTransaction que foram criados manualmente**
- ❌ **InventoryMovement não contribui ao "actual"**

---

## 🔍 Análise das Causas Raiz

### Problema 1: InventoryMovement → Finance

**Cenário Real**:
1. Usuário vai a "Inventory" → "Histórico"
2. Cria uma **saída (OUT)** com quantidade 5 e unit_cost R$ 10
3. total_value = 5 × 10 = R$ 50
4. Vai a "Finance" → "Lançamentos"
5. **NÃO VÊ** nenhum lançamento de R$ 50
6. Card "Realizado" continua zerado

**Fluxo Esperado vs Atual**:

```
Esperado:
  InventoryMovement.create()
    ↓ [Evento ou chamada direta]
    ↓ EventPublisher.publish('inventory.movement.created', ...)
    ↓ [Celery Consumer ou Service]
    ↓ CostTransaction.create(idempotency_key='inventory_movement:{id}')
    ↓
  Finance "Realizado" = soma CostTransaction

Atual:
  InventoryMovement.create()
    ✅ Salvo no BD
    ❌ Nada acontece
    ❌
  Finance "Realizado" = 0
```

**Classificação: D1** (Não gera CostTransaction)

---

### Problema 2: Commitment Aprovado → Finance

**Cenário Real**:
1. Usuário vai a "Finance" → "Compromissos"
2. Cria um compromisso (draft) de R$ 100
3. Submete (submitted)
4. Aprova (approved)
5. Vai a "Finance" → "Lançamentos"
6. **PODE ou NÃO VER** o compromisso (dependendo de filtragem)
7. Card "Realizado" **NÃO INCLUI** o compromisso aprovado
8. Card "Comprometido" SIM o inclui

**Fluxo Atual**:

```
Commitment.approve(user):
  ✅ status = APPROVED
  ✅ EventPublisher.publish('commitment.approved', ...)
  ✅ Evento salvo em OutboxEvent
  ❌ Consumer Celery não processa
  ❌ CostTransaction não é criado
  
FinanceSummary:
  committed = Commitment.filter(status__in=[SUBMITTED, APPROVED]).sum()
              ↑ Isso inclui compromissos aprovados
  actual = CostTransaction.sum()
           ↑ Não inclui compromissos
```

**Classificação: D1** (Não gera CostTransaction) + **D6** (Regra de negócio indefinida)

---

## 📋 Mapeamento Frontend

### InventoryPage (Histórico)

**Path**: `frontend/src/pages/InventoryPage.tsx`

```tsx
// Componentes principais:
- InventoryTable: Mostra items com quantidade
- MovementHistoryTab: Mostra movimentações (InventoryMovement via API)
  
// Hook:
import { useInventoryMovements } = from '@/hooks/useInventoryQuery'

// Query:
GET /api/inventory/movements/
  ?item={item_id}
  &start_date={90d}
  &end_date={today}
  &ordering=-created_at
  
// Renderiza:
- Tipo de movimento (IN/OUT/ADJUSTMENT)
- Quantidade
- Custo unitário
- Total
- Data
- Referência
```

**Status**: ✅ Funcionando corretamente para Inventory

---

### FinanceDashboard (Card "Realizado")

**Path**: `frontend/src/apps/finance/pages/FinanceDashboard.tsx`

```tsx
// Hook:
const { data: summary } = useFinanceSummary(month, costCenterId)
  ↓
// Service:
financeService.getFinanceSummary(month, costCenterId)
  ↓
// Backend:
GET /api/trakledger/budget-summary/?month=2024-06-01&cost_center={id}
  ↓
// Retorna:
{
  planned: 1000,
  committed: 500,    // Compromissos SUBMITTED + APPROVED
  actual: 150,       // Apenas CostTransaction criadas manualmente
  savings: 0,
  variance: 850,
  by_category: [...]
}

// Card renderiza:
<StatCard
  title="Realizado"
  value={summary?.actual ?? 0}  // ← Mostra 150 (SEM movimentações de inventory)
  description="Custos efetivamente lançados"
/>
```

**Status**: ✅ Frontend funciona corretamente, mas dados estão errados

---

### FinanceLedger (Tela Lançamentos)

**Path**: `frontend/src/apps/finance/pages/FinanceLedger.tsx`

```tsx
// Hook:
const { data: ledgerData } = useLedger(filters)
  ↓
// Service:
financeService.getTransactions(filters)
  ↓
// Backend:
GET /api/trakledger/transactions/
  ?cost_center={id}
  &start_date={date}
  &end_date={date}
  &transaction_type={type}
  &ordering=-occurred_at
  
// Retorna apenas CostTransaction
```

**Status**: ✅ Funciona, mas vazio se não há movimentações de inventory

---

## 📋 Documentação Referente

**Docs Existentes**:
- ✅ `docs/backend/api/inventory.md` - API Inventory
- ✅ `docs/backend/api/trakledger.md` - API Finance (em development)
- ✅ `docs/events/01-contrato-eventos.md` - Contrato de Eventos
- ✅ `docs/trakledger/02-regras-negocio.md` - Regras de Finance
- ❌ `docs/events/inventory.md` - NÃO EXISTE (eventos de inventory não documentados)
- ❌ `docs/integration/inventory-to-finance.md` - NÃO EXISTE

---

## 🎯 Problema Raiz (RCA)

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| **Integração D1** | ❌ **NÃO EXISTE** | backend/apps/inventory/models.py - ZERO referências a CostTransaction |
| **Eventos** | ⚠️ Evento publicado | Commitment.approve() publica 'commitment.approved' |
| **Consumer** | ❌ Não implementado | backend/apps/trakledger/tasks.py - não há consumer para inventory.movement |
| **Idempotência** | ✅ Framework pronto | EventPublisher com idempotency_key |
| **Multi-tenant** | ✅ Django-tenants | Automático via connection.tenant |
| **Regra de Negócio** | 🤔 Indefinida | "Compromisso aprovado" = Realizado ou Comprometido? |

---

## 📑 Implementação Necessária

### Fase 1: Inventory → Finance (InventoryMovement → CostTransaction)

**Mapeamento de Tipos**:
```python
InventoryMovement.type → CostTransaction.transaction_type
OUT/ADJUSTMENT         → parts
IN/RETURN              → (revert, ou ignorar se não é custo)
TRANSFER               → (ignorar, não gera custo)

Categoria:
WORK_ORDER reason      → preventive/corrective (conforme WorkOrder)
PURCHASE               → parts
ADJUSTMENT             → adjustment
```

**Idempotency Key**:
```
inventory_movement:{tenant}:{movement_id}

Exemplo: inventory_movement:umc:12345
```

**Flow**:
```python
# 1. Service layer em inventory/services.py
class InventoryMovementService:
    @classmethod
    def create_with_finance_impact(cls, item, type, quantity, unit_cost, ...):
        with transaction.atomic():
            # Criar movimento
            movement = InventoryMovement.objects.create(...)
            
            # Se movimento gera custo, criar CostTransaction
            if should_generate_cost(movement):
                cost_center_id = get_cost_center_for_movement(movement)
                
                CostTransaction.objects.get_or_create(
                    idempotency_key=f'inventory_movement:{tenant}:{movement.id}',
                    defaults={
                        'transaction_type': 'parts',
                        'category': get_category(movement),
                        'amount': movement.total_value,
                        'occurred_at': movement.created_at,
                        'cost_center_id': cost_center_id,
                        'work_order_id': movement.work_order_id,
                        'description': f'Consumo de {item.name}',
                        'meta': {
                            'inventory_movement_id': movement.id,
                            'item_code': item.code,
                        }
                    }
                )
            
            return movement
```

---

### Fase 2: Commitment Aprovado → Finance

**Regra de Negócio (E1 - Recomendado)**:
- Compromisso aprovado → CostTransaction imediatamente
- Status em Finance: "Comprometido" = APPROVED
- "Realizado" = quando há pagamento/execução real

**Flow**:
```python
# Em Commitment.approve()
def approve(self, user):
    self.status = Status.APPROVED
    self.approved_by = user
    self.approved_at = timezone.now()
    self.save()
    
    # Criar CostTransaction (idempotente via idempotency_key)
    CostTransaction.objects.get_or_create(
        idempotency_key=f'commitment_approved:{tenant}:{self.id}',
        defaults={
            'transaction_type': 'other',  # ou conforme categoria
            'category': self.category,
            'amount': self.amount,
            'occurred_at': self.approved_at,
            'cost_center_id': self.cost_center_id,
            'work_order_id': self.work_order_id,
            'description': f'Compromisso aprovado: {self.description}',
            'meta': {
                'commitment_id': str(self.id),
                'source': 'commitment'
            }
        }
    )
```

---

## 🔧 Arquivos a Modificar

### Backend

1. **backend/apps/inventory/services.py** (novo ou existente)
   - Adicionar integração com CostTransaction
   - Idempotência via inventory_movement:{id}

2. **backend/apps/inventory/signals.py** (novo)
   - Alternativa: usar Django signals em vez de service layer
   - Post-save em InventoryMovement → criar CostTransaction

3. **backend/apps/trakledger/models.py**
   - Commitment.approve() - adicionar criação de CostTransaction

4. **backend/apps/trakledger/tasks.py** (opcional)
   - Consumer Celery se usar eventos

5. **backend/apps/trakledger/views.py**
   - BudgetSummaryViewSet.list() - verificar se needs customização

### Frontend

1. **frontend/src/services/finance/financeService.ts**
   - Possível ajuste em filtros se necessário

2. **frontend/src/apps/finance/pages/FinanceDashboard.tsx**
   - Não precisa mudar (backend retorna correto)

---

## 📐 Contrato de Integração

### InventoryMovement → CostTransaction

**Payload**:
```json
{
  "idempotency_key": "inventory_movement:{tenant}:{movement_id}",
  "transaction_type": "parts",
  "category": "preventive | corrective | other",
  "amount": 50.00,
  "occurred_at": "2026-01-17T10:30:00Z",
  "cost_center_id": "{cost_center_uuid}",
  "work_order_id": 123,
  "asset_id": "{asset_uuid}",
  "description": "Consumo de Filtro de Ar - Estoque",
  "meta": {
    "inventory_movement_id": 12345,
    "item_code": "FLT-001",
    "item_name": "Filtro de Ar G4",
    "quantity": 5,
    "unit_cost": 10.00,
    "source": "inventory_movement"
  }
}
```

**Idempotência**:
- Key: `inventory_movement:{tenant}:{movement_id}`
- Reprocessamento: get_or_create com mesma key retorna existente
- Duplicação impossível: constraint UNIQUE na DB

### Commitment Aprovado → CostTransaction

**Payload**:
```json
{
  "idempotency_key": "commitment_approved:{tenant}:{commitment_id}",
  "transaction_type": "other | labor | parts (conforme commitment)",
  "category": "preventive | corrective | etc",
  "amount": 100.00,
  "occurred_at": "2026-01-17T10:30:00Z",
  "cost_center_id": "{cost_center_uuid}",
  "work_order_id": 123,
  "description": "Compromisso aprovado: {commitment.description}",
  "meta": {
    "commitment_id": "{commitment_uuid}",
    "source": "commitment_approved",
    "approved_by": "{user_id}",
    "approved_at": "2026-01-17T10:30:00Z"
  }
}
```

**Idempotência**:
- Key: `commitment_approved:{tenant}:{commitment_id}`
- Reprocessamento: get_or_create com mesma key retorna existente

---

## ✅ Critérios de Aceitação

1. **Inventory**:
   - [ ] CREATE movimento tipo OUT → CostTransaction criada com amount = qty × unit_cost
   - [ ] idempotency_key: `inventory_movement:{tenant}:{id}`
   - [ ] Reprocessar não duplica (teste: 2 creates, 1 transaction)
   - [ ] Multi-tenant: movimento de tenant A não vira transaction em tenant B
   - [ ] Descartáveis (IN, TRANSFER): não geram transaction
   - [ ] FinanceSummary.actual inclui movimentações
   - [ ] Card "Realizado" mostra valor correto

2. **Commitment**:
   - [ ] APPROVED → CostTransaction criada com commitment.amount
   - [ ] idempotency_key: `commitment_approved:{tenant}:{id}`
   - [ ] Reprocessar não duplica
   - [ ] FinanceSummary.actual **NÃO DUPLICA** com committed (separadas)
   - [ ] Ledger mostra ambos com source diferente
   - [ ] Card "Realizado" inclui ambos (se E1) ou só transactions (se E2)

3. **Teste Multi-Tenant**:
   - [ ] Criar movimento em tenant A
   - [ ] Criar commitment em tenant A
   - [ ] Criar movimento em tenant B
   - [ ] Verificar isolamento (cada um vê só seus dados)

4. **Idempotência**:
   - [ ] Reprocessar evento N vezes = 1 transaction
   - [ ] Retry de Celery não duplica

---

## 📋 Próximos Passos (Entregáveis)

1. **Implementar Inventory → Finance** (idempotente, multi-tenant)
2. **Implementar Commitment Aprovado → Finance** (idempotente)
3. **Criar testes** (integration tests, multi-tenant, idempotência)
4. **Backfill** (histórico sem duplicar)
5. **Validar** (passos manuais de QA)

