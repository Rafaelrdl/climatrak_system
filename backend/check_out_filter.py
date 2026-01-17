#!/usr/bin/env python
"""Script para verificar filtro de saídas."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django_tenants.utils import schema_context
from apps.trakledger.models import CostTransaction
from django.db.models import Q

with schema_context('COMG'):
    print('=== Todas transacoes inventory_movement ===')
    txs = CostTransaction.objects.filter(meta__source='inventory_movement')
    for tx in txs[:15]:
        mt = tx.meta.get('movement_type', 'N/A')
        print(f'ID:{tx.id} type:{tx.transaction_type} mt:{mt} amount:{tx.amount}')
    
    print()
    print('=== Filter operations (labor + OUT) ===')
    ops = CostTransaction.objects.filter(
        Q(transaction_type='labor')
        | (Q(meta__source='inventory_movement') & Q(meta__movement_type='OUT'))
    )
    print(f'Total operations: {ops.count()}')
    for tx in ops[:10]:
        mt = tx.meta.get('movement_type', 'N/A')
        print(f'  ID:{tx.id} type:{tx.transaction_type} mt:{mt} amount:{tx.amount}')
    
    print()
    print('=== Filter entries (commitment + IN) ===')
    entries = CostTransaction.objects.filter(
        Q(meta__source='commitment')
        | (Q(meta__source='inventory_movement') & Q(meta__movement_type='IN'))
    ).exclude(transaction_type='labor')
    print(f'Total entries: {entries.count()}')
    for tx in entries[:10]:
        mt = tx.meta.get('movement_type', 'N/A')
        print(f'  ID:{tx.id} type:{tx.transaction_type} mt:{mt} amount:{tx.amount}')
