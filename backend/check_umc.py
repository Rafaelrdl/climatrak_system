#!/usr/bin/env python
"""Script para verificar movimentos em UMC."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django_tenants.utils import schema_context
from apps.inventory.models import InventoryMovement
from apps.trakledger.models import CostTransaction
from django.db.models import Q

print('=== UMC ===')
with schema_context('UMC'):
    print('--- Movimentos de inventário ---')
    for m in InventoryMovement.objects.all().order_by('-created_at')[:20]:
        idem_key = f'inventory_movement:UMC:{m.id}'
        has_txn = CostTransaction.objects.filter(idempotency_key=idem_key).exists()
        print(f'ID:{m.id} type:{m.type} qty:{m.quantity} cost:{m.unit_cost} created:{m.created_at.date()} has_txn:{has_txn}')
    
    print()
    print('--- Transacoes operations ---')
    ops = CostTransaction.objects.filter(
        Q(transaction_type='labor')
        | (Q(meta__source='inventory_movement') & Q(meta__movement_type='OUT'))
    )
    print(f'Total: {ops.count()}')
    for tx in ops[:10]:
        mt = tx.meta.get('movement_type', 'N/A')
        print(f'  type:{tx.transaction_type} mt:{mt} amount:{tx.amount} date:{tx.occurred_at.date()}')
