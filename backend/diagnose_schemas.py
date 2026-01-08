#!/usr/bin/env python
"""
Script para identificar e corrigir o schema problemático.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection
from apps.tenants.models import Tenant

print("=== DIAGNÓSTICO COMPLETO ===\n")

schemas = ['public', 'COMG', 'UMC']

for schema in schemas:
    print(f"=== {schema} ===")
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        
        # Migrations do trakledger
        print("\n1. Migrations trakledger:")
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger' 
            ORDER BY name
        """)
        for row in cursor.fetchall():
            print(f"  [x] {row[0]}")
        
        # Content types
        print("\n2. Content types (finance/trakledger):")
        cursor.execute("""
            SELECT id, app_label, model 
            FROM django_content_type 
            WHERE app_label IN ('finance', 'trakledger')
            ORDER BY app_label, model
        """)
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}.{row[2]}")
        
        # Tabelas
        print("\n3. Tabelas trakledger:")
        cursor.execute(f"""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '{schema}' 
            AND table_name LIKE 'trakledger_%'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"  Total: {len(tables)}")
        if tables:
            for t in tables:
                print(f"  - {t}")
        
        # Tabelas finance (se existirem)
        cursor.execute(f"""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '{schema}' 
            AND table_name LIKE 'finance_%'
            ORDER BY table_name
        """)
        finance_tables = [row[0] for row in cursor.fetchall()]
        if finance_tables:
            print(f"\n  ⚠️ Tabelas finance ainda existem: {finance_tables}")
    
    print("\n" + "="*50 + "\n")
