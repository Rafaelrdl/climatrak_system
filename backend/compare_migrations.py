#!/usr/bin/env python
"""
Script para verificar diferenças entre migrations no banco e no disco.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

# Migrations no disco
disk_migrations = [
    '0001_initial',
    '0002_ledger_costtransaction',
    '0003_add_commitment_model',
    '0004_add_savings_event_model',
    '0005_add_v2_energy_baseline_risk',
    '0006_budgetmonth_contingency_amount',
    '0007_rename_finance_to_trakledger',
    '0008_rename_indexes_to_trakledger',
]

schemas = ['public', 'COMG', 'UMC']

print("=== COMPARANDO MIGRATIONS BANCO vs DISCO ===\n")

for schema in schemas:
    print(f"--- {schema} ---")
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger'
        """)
        db_migrations = [row[0] for row in cursor.fetchall()]
        
        # No disco mas não no banco
        missing_in_db = [m for m in disk_migrations if m not in db_migrations]
        # No banco mas não no disco
        extra_in_db = [m for m in db_migrations if m not in disk_migrations]
        
        if missing_in_db:
            print(f"  ⚠️ Faltando no banco: {missing_in_db}")
        if extra_in_db:
            print(f"  ℹ️ Extra no banco (não está no disco): {extra_in_db}")
        if not missing_in_db and not extra_in_db:
            print("  ✅ OK")
        
        # Listar todas do banco
        print(f"  Total no banco: {len(db_migrations)}")
    print()

# Verificar se a migration foi renomeada no disco
print("\n=== VERIFICANDO ARQUIVOS DE MIGRATION NO DISCO ===\n")
import glob
migrations_dir = '/app/apps/trakledger/migrations/'
files = sorted(glob.glob(f'{migrations_dir}0*.py'))
for f in files:
    print(f"  {os.path.basename(f)}")
