#!/usr/bin/env python
"""
Marca migrations 0007 e 0008 como aplicadas (já foram parcialmente aplicadas).
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import get_tenant_model, schema_context

TenantModel = get_tenant_model()

MIGRATIONS_TO_FAKE = [
    ('trakledger', '0007_rename_finance_to_trakledger'),
    ('trakledger', '0008_rename_indexes_to_trakledger'),
]

tenants = TenantModel.objects.exclude(schema_name='public')

for tenant in tenants:
    print(f'\n=== {tenant.schema_name} ===')
    with schema_context(tenant.schema_name):
        with connection.cursor() as cursor:
            for app, name in MIGRATIONS_TO_FAKE:
                cursor.execute(
                    "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                    [app, name]
                )
                if cursor.fetchone()[0] == 0:
                    cursor.execute(
                        "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                        [app, name]
                    )
                    print(f'  ✓ Fake: {app}.{name}')
                else:
                    print(f'  - Exists: {app}.{name}')

print('\n✓ Done!')
