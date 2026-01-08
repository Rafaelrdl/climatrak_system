#!/usr/bin/env python
"""
Script para verificar tenants e schemas existentes.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from apps.tenants.models import Tenant
from django.db import connection

print('=== TENANTS ===')
for t in Tenant.objects.all():
    print(f'{t.schema_name}: {t.name} (domain: {t.domain_url})')

print('\n=== SCHEMAS NO BANCO ===')
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT schema_name 
        FROM information_schema.schemata 
        ORDER BY schema_name
    """)
    for row in cursor.fetchall():
        print(f'  {row[0]}')

print('\n=== TABELAS POR SCHEMA ===')
with connection.cursor() as cursor:
    for schema in ['public', 'comg', 'umc']:
        cursor.execute(f"""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = '{schema}'
        """)
        count = cursor.fetchone()[0]
        print(f'  {schema}: {count} tabelas')
