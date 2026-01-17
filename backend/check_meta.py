#!/usr/bin/env python
"""Script para verificar meta das transações."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django_tenants.utils import schema_context
from apps.trakledger.models import CostTransaction
import json

with schema_context('COMG'):
    print('=== Transacoes inventory_movement ===')
    for tx in CostTransaction.objects.filter(meta__source='inventory_movement')[:12]:
        print(f'type:{tx.transaction_type} mt:{tx.meta.get("movement_type")} amount:{tx.amount}')
        print(f'  meta: {json.dumps(tx.meta, indent=2, default=str)}')
        print()
