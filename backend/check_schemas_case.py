#!/usr/bin/env python
"""
Script para verificar tabelas nos schemas COMG e UMC (case-sensitive).
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

print('=== TABELAS POR SCHEMA (case-sensitive) ===')
with connection.cursor() as cursor:
    for schema in ['public', 'COMG', 'UMC']:
        cursor.execute(f"""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = '{schema}'
        """)
        count = cursor.fetchone()[0]
        print(f'  {schema}: {count} tabelas')

print('\n=== TABELAS TRAKLEDGER NO COMG ===')
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'COMG' 
        AND table_name LIKE 'trakledger_%'
        ORDER BY table_name
    """)
    for row in cursor.fetchall():
        print(f'  {row[0]}')

print('\n=== TABELAS TRAKLEDGER NO UMC ===')
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'UMC' 
        AND table_name LIKE 'trakledger_%'
        ORDER BY table_name
    """)
    for row in cursor.fetchall():
        print(f'  {row[0]}')
