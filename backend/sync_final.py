#!/usr/bin/env python
"""
Sincroniza TODAS as migrations em TODOS os schemas.
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import get_tenant_model, schema_context

TenantModel = get_tenant_model()

# TODAS as migrations que precisam existir
ALL_MIGRATIONS = [
    ('trakledger', '0001_initial'),
    ('trakledger', '0002_ledger_costtransaction'),
    ('trakledger', '0003_add_commitment_model'),
    ('trakledger', '0004_add_savings_event_model'),
    ('trakledger', '0005_add_v2_energy_baseline_risk'),
    ('trakledger', '0006_budgetmonth_contingency_amount'),
    ('trakledger', '0007_rename_finance_to_trakledger'),
    ('trakledger', '0008_rename_indexes_to_trakledger'),
    ('cmms', '0008_add_work_order_cost_center'),
    ('cmms', '0009_add_commitment_model'),
    ('cmms', '0010_add_signature_fields'),
    ('cmms', '0011_add_part_usage_source'),
]

schemas = ['public'] + [t.schema_name for t in TenantModel.objects.exclude(schema_name='public')]

for schema in schemas:
    print(f'\n=== {schema} ===')
    with schema_context(schema):
        with connection.cursor() as cursor:
            for app, name in ALL_MIGRATIONS:
                cursor.execute(
                    "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                    [app, name]
                )
                if cursor.fetchone()[0] == 0:
                    cursor.execute(
                        "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                        [app, name]
                    )
                    print(f'  ✓ Added: {app}.{name}')

print('\n✓ Done!')
