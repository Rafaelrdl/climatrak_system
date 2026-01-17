# 🔧 Comandos de Backfill - Referência Rápida

## ✅ Executados com Sucesso (Docker)

### 1. Verificar Container

```bash
docker ps | grep climatrak-api
```

**Resultado**: `climatrak-api Up 51 minutes` ✅

---

### 2. Backfill Dry-Run (Simulação Segura)

```bash
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance --dry-run
```

**Resultado Esperado**:
```
=== DRY RUN - Nenhuma alteração será feita ===

📍 Processando tenant: COMG (Centro Oftalmologico de Minas Gerais)
   Total de movimentações: 4
   [1/4] (dry-run) Criaria para 1
   ...
   Criadas:  4
   Puladas:  0
   ✅ Sem duplicatas encontradas
```

---

### 3. Backfill Real (Criar CostTransactions)

```bash
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance
```

**Resultado Esperado**:
```
📍 Processando tenant: COMG (Centro Oftalmologico de Minas Gerais)
   Total de movimentações: 4
   Criadas:  N (quantidade criada)
   Puladas:  M (já existiam)
   ✅ Sem duplicatas encontradas
```

---

### 4. Backfill com Opções

#### Tenant Específico
```bash
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance --tenant=COMG
```

#### Com Limite
```bash
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance --limit=10
```

#### Com Data (desde)
```bash
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance --since='2026-01-01'
```

#### Combinado
```bash
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance --dry-run --tenant=COMG --limit=5
```

---

### 5. Testar Idempotência (Re-execução)

```bash
# Primeira vez
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance

# Segunda vez (deve pular as mesmas)
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance
```

**Resultado Esperado**: Mesmos números (idempotência garantida)

---

### 6. Verificar CostTransactions Criadas

```bash
docker exec climatrak-api python manage.py shell -c "
from apps.trakledger.models import CostTransaction
inv_cts = CostTransaction.objects.filter(meta__source='inventory_movement')
print(f'Total: {inv_cts.count()}')
for ct in inv_cts[:5]:
    print(f'  - R\$ {ct.amount} ({ct.meta.get(\"item_name\", \"N/A\")})')
"
```

---

### 7. Listar Tenants Disponíveis

```bash
docker exec climatrak-api python manage.py shell -c "
from apps.tenants.models import Tenant
for t in Tenant.objects.all():
    print(f'{t.schema_name} -> {t.name}')
"
```

---

## 📊 Resulta da Última Execução (17/01/2026)

| Tenant | Movimentações | Criadas | Puladas | Erros |
|--------|---------------|---------|---------|-------|
| COMG | 4 | 0 | 4 | 0 |
| UMC | 0 | 0 | 0 | 0 |
| **Total** | **4** | **0** | **4** | **0** |

---

## ⚙️ Correções Aplicadas

### Import Missing (backfill_inventory_movements_to_finance.py)
```python
import django.db.models  # ← ADICIONADO na linha 15
```

### Decimal Places (inventory/services.py)
```python
# Antes
total_cost = movement.quantity * (movement.unit_cost or Decimal("0"))

# Depois
total_cost = movement.quantity * (movement.unit_cost or Decimal("0"))
total_cost = total_cost.quantize(Decimal("0.01"))  # ← Arredonda para 2 casas
```

---

## 🚀 Próximas Execuções

### Em Produção (Com Backup Antes)
```bash
# 1. Fazer backup do DB
# (seu comando de backup aqui)

# 2. Executar backfill
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance --dry-run
docker exec climatrak-api python manage.py backfill_inventory_movements_to_finance

# 3. Verificar resultado
docker exec climatrak-api python manage.py shell -c "..."

# 4. Monitorar logs
docker logs -f climatrak-api | grep -i "cost"
```

---

## 📝 Opções do Comando

```
--dry-run              Apenas mostra o que seria feito (seguro)
--tenant=SCHEMA        Processa apenas este tenant (ex: COMG)
--since=YYYY-MM-DD     Processa movimentações após esta data
--limit=N              Máximo N movimentações (default: 1000)
```

---

## ✅ Checklist

- [x] Código corrigido
- [x] Container rodando
- [x] Backfill testado (dry-run)
- [x] Backfill executado
- [x] Idempotência verificada
- [x] Sem duplicatas
- [x] Pronto para produção

**Status Final**: ✅ **PRONTO**

