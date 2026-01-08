#!/usr/bin/env python
"""
Corrige tabelas faltantes do TrakLedger nos tenants.
Remove migrations fake e reaplica de verdade.
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import get_tenant_model, schema_context

TenantModel = get_tenant_model()

# Tabelas que DEVEM existir (da migration 0001 até 0005)
EXPECTED_TABLES = [
    'trakledger_costcenter',
    'trakledger_ratecard',
    'trakledger_budgetplan',
    'trakledger_budgetenvelope',
    'trakledger_budgetmonth',
    'trakledger_costtransaction',      # 0002
    'trakledger_ledgeradjustment',     # 0002
    'trakledger_commitment',           # 0003
    'trakledger_savingsevent',         # 0004
    'trakledger_energytariff',         # 0005
    'trakledger_energyreading',        # 0005
    'trakledger_energybaseline',       # 0005
    'trakledger_risksnapshot',         # 0005
]

# Migrations que precisam ser reaplicadas se tabelas faltarem
MIGRATIONS_TO_REAPPLY = [
    ('trakledger', '0002_ledger_costtransaction'),
    ('trakledger', '0003_add_commitment_model'),
    ('trakledger', '0004_add_savings_event_model'),
    ('trakledger', '0005_add_v2_energy_baseline_risk'),
    ('trakledger', '0006_budgetmonth_contingency_amount'),
    ('trakledger', '0007_rename_finance_to_trakledger'),
    ('trakledger', '0008_rename_indexes_to_trakledger'),
]

tenants = TenantModel.objects.exclude(schema_name='public')

for tenant in tenants:
    print(f'\n=== {tenant.schema_name} ===')
    with schema_context(tenant.schema_name):
        with connection.cursor() as cursor:
            # Verificar tabelas existentes
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = %s AND table_name LIKE 'trakledger%%'
            """, [tenant.schema_name])
            existing_tables = {r[0] for r in cursor.fetchall()}
            
            missing_tables = [t for t in EXPECTED_TABLES if t not in existing_tables]
            
            if missing_tables:
                print(f'  Tabelas faltantes: {missing_tables}')
                print(f'  Removendo migrations fake para recriar...')
                
                # Remover migrations para reaplicar
                for app, name in MIGRATIONS_TO_REAPPLY:
                    cursor.execute(
                        "DELETE FROM django_migrations WHERE app = %s AND name = %s",
                        [app, name]
                    )
                print(f'  ✓ Migrations removidas')
            else:
                print(f'  ✓ Todas as tabelas existem')

print('\n✓ Verificação completa!')
print('\nAgora execute: python manage.py migrate_schemas')
