#!/usr/bin/env python
"""
Script para verificar e corrigir content_types em todos os schemas.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

schemas = ['public', 'COMG', 'UMC']

print("=== VERIFICANDO CONTENT_TYPES ===\n")

for schema in schemas:
    print(f"--- {schema} ---")
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        
        # Content types finance
        cursor.execute("""
            SELECT COUNT(*) FROM django_content_type 
            WHERE app_label = 'finance'
        """)
        finance_count = cursor.fetchone()[0]
        
        # Content types trakledger
        cursor.execute("""
            SELECT COUNT(*) FROM django_content_type 
            WHERE app_label = 'trakledger'
        """)
        trakledger_count = cursor.fetchone()[0]
        
        print(f"  finance: {finance_count}, trakledger: {trakledger_count}")
        
        if finance_count > 0:
            print(f"  ⚠️ Ainda tem {finance_count} content_types com app_label='finance'!")
            cursor.execute("""
                SELECT model FROM django_content_type 
                WHERE app_label = 'finance'
            """)
            for row in cursor.fetchall():
                print(f"    - finance.{row[0]}")
    print()

# Identificar qual schema vai executar a migration
print("=== VERIFICANDO QUAL SCHEMA ESTÁ FALTANDO A MIGRATION ===\n")

for schema in schemas:
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger' AND name = '0007_rename_finance_to_trakledger'
        """)
        has_0007 = cursor.fetchone() is not None
        print(f"  {schema}: 0007 aplicada = {has_0007}")
