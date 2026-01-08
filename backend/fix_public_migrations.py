#!/usr/bin/env python
"""
Script para reinserir migrations do trakledger no schema public como fake.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

MIGRATIONS = [
    '0001_initial',
    '0002_ledger_costtransaction',
    '0003_add_commitment_model',
    '0004_add_savings_event_model',
    '0005_add_v2_energy_baseline_risk',
    '0006_budgetmonth_contingency_amount',
    '0007_rename_finance_to_trakledger',
    '0008_rename_indexes_to_trakledger',
]

print("=== REINSERINDO MIGRATIONS NO PUBLIC ===\n")

with connection.cursor() as cursor:
    cursor.execute('SET search_path TO "public"')
    
    for migration in MIGRATIONS:
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('trakledger', %s, NOW())
            ON CONFLICT DO NOTHING
        """, [migration])
        print(f"  Inserido: {migration}")

print("\n✅ Concluído!")
