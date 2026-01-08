#!/usr/bin/env python
"""Verifica tabelas TrakLedger em todos os schemas."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import get_tenant_model, schema_context

TenantModel = get_tenant_model()
schemas = ['public'] + [t.schema_name for t in TenantModel.objects.exclude(schema_name='public')]

for schema in schemas:
    print(f'\n=== {schema} ===')
    with schema_context(schema):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = %s AND table_name LIKE 'trakledger%%'
                ORDER BY table_name
            """, [schema])
            tables = [r[0] for r in cursor.fetchall()]
            if tables:
                for t in tables:
                    print(f'  - {t}')
            else:
                print('  (nenhuma tabela)')
