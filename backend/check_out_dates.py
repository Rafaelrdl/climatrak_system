#!/usr/bin/env python
"""Script para verificar datas das transações OUT."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django_tenants.utils import schema_context
from apps.trakledger.models import CostTransaction
from django.db.models import Q

with schema_context('COMG'):
    print('=== Filter operations com datas ===')
    ops = CostTransaction.objects.filter(
        Q(transaction_type='labor')
        | (Q(meta__source='inventory_movement') & Q(meta__movement_type='OUT'))
    )
    print(f'Total operations: {ops.count()}')
    for tx in ops:
        mt = tx.meta.get('movement_type', 'N/A')
        print(f'  ID:{str(tx.id)[:8]}... type:{tx.transaction_type} mt:{mt} amount:{tx.amount} date:{tx.occurred_at}')
