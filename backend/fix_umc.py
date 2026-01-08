#!/usr/bin/env python
"""
Força criação das tabelas faltantes no UMC.
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

print('=== UMC ===')
with schema_context('UMC'):
    with connection.cursor() as cursor:
        # Remover migrations 0002-0008 para forçar reaplicação
        migrations_to_remove = [
            '0002_ledger_costtransaction',
            '0003_add_commitment_model',
            '0004_add_savings_event_model',
            '0005_add_v2_energy_baseline_risk',
            '0006_budgetmonth_contingency_amount',
            '0007_rename_finance_to_trakledger',
            '0008_rename_indexes_to_trakledger',
        ]
        for name in migrations_to_remove:
            cursor.execute(
                "DELETE FROM django_migrations WHERE app = 'trakledger' AND name = %s",
                [name]
            )
            print(f'  Removed: trakledger.{name}')

print('\n✓ Done! Execute: python manage.py migrate_schemas')
