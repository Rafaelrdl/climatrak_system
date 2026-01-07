```instructions
---
applyTo: "**/tests/**,**/*test*.py,**/*.test.ts,**/*.spec.ts,**/cypress/**"
---

# Testing Instructions — ClimaTrak System

## Stack de Testes
- **Backend**: pytest + django-tenants `TenantTestCase`
- **Frontend**: vitest + @testing-library/react
- **E2E**: Cypress
- **Mobile**: jest + @testing-library/react-native

## Comandos

```bash
# Backend (Docker)
make test                    # pytest apps/ -v
make test-cov                # com coverage

# Frontend
cd frontend && npm test      # vitest
npm run test:ui              # modo watch

# E2E
cd frontend && npm run cy:open    # Cypress interativo
npm run cy:run                    # headless

# Mobile
cd mobile && npm test        # jest
```

---

## Regras Não-Negociáveis

### 1. Multi-Tenant Isolation (obrigatório)

Toda feature que toca dados de tenant DEVE ter teste com 2 tenants:

```python
# backend/apps/tenants/tests/test_tenant_isolation.py
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

class CrossTenantIsolationTest(TenantTestCase):
    """
    REGRA: Tenant A não pode ver/alterar recursos de Tenant B.
    """
    
    def test_tenant_a_cannot_see_tenant_b_data(self):
        # Criar dado no Tenant A
        with schema_context('tenant_a'):
            asset_a = Asset.objects.create(name="Asset A")
        
        # Verificar que Tenant B não vê
        with schema_context('tenant_b'):
            assets = Asset.objects.filter(id=asset_a.id)
            self.assertEqual(assets.count(), 0)  # NÃO deve encontrar
    
    def test_api_rejects_cross_tenant_access(self):
        """API deve retornar 404 (não 403) para recurso de outro tenant."""
        # Cria recurso no tenant A, tenta acessar via API do tenant B
        response = self.client.get(f'/api/assets/{other_tenant_asset_id}/')
        self.assertEqual(response.status_code, 404)
```

### 2. Idempotência (Finance + Consumers)

**REGRA**: Repetir operação com mesma `idempotency_key` NÃO duplica ledger.

```python
# backend/apps/finance/tests/test_ledger_lock_rules.py
class LedgerIdempotencyKeyTests(TenantTestCase):
    
    def test_same_idempotency_key_creates_one_transaction(self):
        """
        Usar mesma idempotency_key deve criar apenas 1 transação.
        """
        key = f"wo:{uuid.uuid4()}:labor"
        
        # Primeira criação
        tx1, created1 = CostTransaction.get_or_create_idempotent(
            idempotency_key=key,
            defaults={"amount": Decimal("1000.00"), ...}
        )
        
        # Segunda "criação" com mesma chave
        tx2, created2 = CostTransaction.get_or_create_idempotent(
            idempotency_key=key,
            defaults={"amount": Decimal("9999.00"), ...}  # Valor diferente!
        )
        
        self.assertTrue(created1)
        self.assertFalse(created2)  # NÃO criou
        self.assertEqual(tx1.pk, tx2.pk)
        self.assertEqual(tx1.amount, Decimal("1000.00"))  # Valor original
```

**REGRA**: Reprocessar mesmo evento Outbox NÃO duplica efeito.

```python
# backend/apps/core_events/tests/test_outbox_idempotency.py
class ConsumerIdempotencyTests(TenantTestCase):
    
    def test_reprocess_event_no_duplicate_effect(self):
        """
        Processar evento 2x não deve duplicar transação no ledger.
        """
        event = OutboxEvent.objects.create(
            tenant_id=self.tenant_id,
            event_name='work_order.closed',
            aggregate_type='work_order',
            aggregate_id=self.wo_id,
            data={'labor_cost': '500.00'},
            idempotency_key=f'wo:{self.wo_id}:closed',
        )
        
        # Primeiro processamento
        process_outbox_event(event.id)
        count_after_first = CostTransaction.objects.count()
        
        # "Reentrega" - processar novamente
        event.status = OutboxEventStatus.PENDING
        event.save()
        process_outbox_event(event.id)
        
        count_after_second = CostTransaction.objects.count()
        self.assertEqual(count_after_first, count_after_second)  # NÃO duplicou
```

### 3. Lock Mensal (Finance)

**REGRA**: Transação locked não pode ser editada.

```python
# backend/apps/finance/tests/test_ledger_lock_rules.py
class MonthlyLockTests(TenantTestCase):
    
    def test_locked_transaction_cannot_change_amount(self):
        """Transação bloqueada não pode ter valor alterado."""
        self.transaction.lock(self.user)
        self.transaction.refresh_from_db()
        
        self.transaction.amount = Decimal("9999.00")
        
        with self.assertRaises(ValidationError) as ctx:
            self.transaction.save()
        
        self.assertIn("bloqueada", str(ctx.exception).lower())
```

**REGRA**: Correções devem ser via adjustment.

```python
class AdjustmentForLockedTests(TenantTestCase):
    
    def test_can_create_adjustment_for_correction(self):
        """
        Correção de transação locked: criar adjustment, não editar.
        """
        # Original locked: 1000. Deveria ser 800. Criar adjustment -200.
        adjustment = CostTransaction.objects.create(
            idempotency_key=None,  # Manual
            transaction_type=CostTransaction.TransactionType.ADJUSTMENT,
            amount=Decimal("-200.00"),
            meta={
                "adjustment_type": "correction",
                "original_transaction_id": str(self.original_tx.pk),
                "reason": "Valor incorreto",
            },
            ...
        )
        
        self.assertEqual(adjustment.transaction_type, 
                         CostTransaction.TransactionType.ADJUSTMENT)
        
        # Original permanece inalterado
        self.original_tx.refresh_from_db()
        self.assertEqual(self.original_tx.amount, Decimal("1000.00"))
```

---

## Markers e Organização

```python
# pytest markers disponíveis
@pytest.mark.tenant      # Testes multi-tenant
@pytest.mark.finance     # Testes de Finance
@pytest.mark.slow        # Testes demorados
@pytest.mark.integration # Testes de integração

# Rodar subset
pytest -m tenant         # Só testes de tenant
pytest -m "not slow"     # Excluir lentos
```

---

## Fixtures Comuns (Backend)

```python
# conftest.py do app ou raiz
@pytest.fixture
def cost_center(tenant):
    return CostCenter.objects.create(code="CC-TEST", name="Test")

@pytest.fixture  
def work_order(tenant, asset, user):
    return WorkOrder.objects.create(
        asset=asset, 
        created_by=user,
        status=WorkOrder.Status.OPEN,
    )
```

---

## Frontend (vitest)

```typescript
// Usar factories para dados de teste
import { createMockWorkOrder } from '@/mocks/factories';

describe('WorkOrderCard', () => {
  it('renders status badge correctly', () => {
    const wo = createMockWorkOrder({ status: 'COMPLETED' });
    render(<WorkOrderCard workOrder={wo} />);
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });
});
```

---

## Checklist de Teste (toda PR)

- [ ] Teste unitário para lógica nova
- [ ] Se toca dados de tenant: teste de isolamento com 2 tenants
- [ ] Se Finance/ledger: teste de idempotência
- [ ] Se transação pode ser locked: teste de bloqueio + adjustment
- [ ] Se consumer de evento: teste de reprocessamento
```
