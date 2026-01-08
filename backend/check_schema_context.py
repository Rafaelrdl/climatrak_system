#!/usr/bin/env python
"""
Script para verificar o contexto de tenant durante migrate.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

print("=== VERIFICANDO COM DIFERENTES CONTEXTOS ===\n")

# 1. Default connection
print("--- Default Connection ---")
with connection.cursor() as cursor:
    cursor.execute("SELECT current_schema()")
    print(f"  Current schema: {cursor.fetchone()[0]}")
    
    cursor.execute("""
        SELECT name FROM django_migrations 
        WHERE app = 'trakledger'
        ORDER BY name
    """)
    migs = [row[0] for row in cursor.fetchall()]
    print(f"  Migrations: {len(migs)}")
    for m in migs:
        print(f"    - {m}")

# 2. Com schema_context UMC
print("\n--- Schema Context UMC ---")
with schema_context('UMC'):
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_schema()")
        print(f"  Current schema: {cursor.fetchone()[0]}")
        
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger'
            ORDER BY name
        """)
        migs = [row[0] for row in cursor.fetchall()]
        print(f"  Migrations: {len(migs)}")
        for m in migs:
            print(f"    - {m}")

# 3. Com SET search_path direto
print("\n--- SET search_path TO 'UMC' ---")
with connection.cursor() as cursor:
    cursor.execute("SET search_path TO 'UMC'")
    cursor.execute("SELECT current_schema()")
    print(f"  Current schema: {cursor.fetchone()[0]}")
    
    cursor.execute("""
        SELECT name FROM django_migrations 
        WHERE app = 'trakledger'
        ORDER BY name
    """)
    migs = [row[0] for row in cursor.fetchall()]
    print(f"  Migrations: {len(migs)}")
    for m in migs:
        print(f"    - {m}")

# 4. Verificar se é case-sensitive
print("\n--- Case Sensitivity Test ---")
with connection.cursor() as cursor:
    for case in ['umc', 'UMC', '"UMC"', '"umc"']:
        try:
            cursor.execute(f"SET search_path TO {case}")
            cursor.execute("SELECT current_schema()")
            schema = cursor.fetchone()[0]
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'trakledger'
            """)
            count = cursor.fetchone()[0]
            print(f"  {case}: schema={schema}, migrations={count}")
        except Exception as e:
            print(f"  {case}: ERROR - {e}")
