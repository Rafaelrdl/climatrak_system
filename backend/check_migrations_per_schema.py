#!/usr/bin/env python
"""
Script para verificar e corrigir migrations no UMC.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

print("=== MIGRATIONS DO TRAKLEDGER POR SCHEMA ===\n")

for schema in ['public', 'COMG', 'UMC']:
    print(f"--- {schema} ---")
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        
        cursor.execute("""
            SELECT name, applied 
            FROM django_migrations 
            WHERE app = 'trakledger' 
            ORDER BY name
        """)
        rows = cursor.fetchall()
        if rows:
            for name, applied in rows:
                print(f"  [x] {name} ({applied})")
        else:
            print("  (nenhuma migration)")
    print()

print("=== VERIFICANDO CONTENT_TYPE NO UMC ===\n")
with connection.cursor() as cursor:
    cursor.execute('SET search_path TO "UMC"')
    cursor.execute("""
        SELECT id, app_label, model 
        FROM django_content_type 
        WHERE app_label IN ('finance', 'trakledger')
        ORDER BY app_label, model
    """)
    rows = cursor.fetchall()
    for row in rows:
        print(f"  {row[0]}: {row[1]}.{row[2]}")
