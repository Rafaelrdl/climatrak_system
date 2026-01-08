#!/usr/bin/env python
"""
Script para adicionar migrations faltantes no schema UMC usando contexto correto.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

MIGRATIONS_TO_ADD = [
    '0007_rename_finance_to_trakledger',
    '0008_rename_indexes_to_trakledger',
]

print("=== ADICIONANDO MIGRATIONS FALTANTES NO UMC ===\n")

with schema_context('UMC'):
    with connection.cursor() as cursor:
        # Verificar migrations existentes
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger'
            ORDER BY name
        """)
        existing = [row[0] for row in cursor.fetchall()]
        print(f"Migrations existentes: {len(existing)}")
        for m in existing:
            print(f"  [x] {m}")
        
        # Adicionar faltantes
        print("\nAdicionando faltantes:")
        for migration in MIGRATIONS_TO_ADD:
            if migration not in existing:
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('trakledger', %s, NOW())
                """, [migration])
                print(f"  ✅ Adicionado: {migration}")
            else:
                print(f"  - Já existe: {migration}")
        
        # Verificar resultado
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger'
            ORDER BY name
        """)
        final = [row[0] for row in cursor.fetchall()]
        print(f"\nMigrations finais: {len(final)}")
        for m in final:
            print(f"  [x] {m}")

print("\n✅ Concluído!")
