#!/usr/bin/env python
"""
Script para verificar e corrigir todas as migrations pendentes.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

EXPECTED_MIGRATIONS = [
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

print("=== VERIFICANDO MIGRATIONS POR SCHEMA ===\n")

for schema in schemas:
    print(f"--- {schema} ---")
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger' 
            ORDER BY name
        """)
        existing = [row[0] for row in cursor.fetchall()]
        
        missing = [m for m in EXPECTED_MIGRATIONS if m not in existing]
        extra = [e for e in existing if e not in EXPECTED_MIGRATIONS]
        
        print(f"  Existentes: {len(existing)}")
        print(f"  Esperadas:  {len(EXPECTED_MIGRATIONS)}")
        
        if missing:
            print(f"  ⚠️ FALTANDO: {missing}")
        if extra:
            print(f"  ℹ️ Extra: {extra}")
        if not missing and not extra:
            print("  ✅ OK")
    print()

# Corrigir os schemas com migrations faltando
print("=== CORRIGINDO MIGRATIONS FALTANDO ===\n")

for schema in schemas:
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger'
        """)
        existing = [row[0] for row in cursor.fetchall()]
        
        missing = [m for m in EXPECTED_MIGRATIONS if m not in existing]
        
        for migration in missing:
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('trakledger', %s, NOW())
            """, [migration])
            print(f"  [{schema}] Inserido: {migration}")

print("\n✅ Concluído!")
