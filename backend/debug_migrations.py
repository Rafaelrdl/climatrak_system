#!/usr/bin/env python
"""
Script para debugar porque a migration está sendo reaplicada.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection
from django.db.migrations.loader import MigrationLoader

# Carregar as migrations
loader = MigrationLoader(connection)

print("=== MIGRATIONS DO TRAKLEDGER NO LOADER ===\n")
trakledger_migrations = [
    key for key in loader.migrated_apps 
    if 'trakledger' in key
]
print(f"Apps com trakledger: {trakledger_migrations}")

print("\n=== TODAS AS MIGRATIONS TRAKLEDGER NO DISCO ===\n")
for key, migration in loader.disk_migrations.items():
    if key[0] == 'trakledger':
        print(f"  {key}: {migration}")

print("\n=== MIGRATIONS APLICADAS POR SCHEMA ===\n")
schemas = ['public', 'COMG', 'UMC']
for schema in schemas:
    print(f"--- {schema} ---")
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO "{schema}"')
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'trakledger'
            ORDER BY name
        """)
        for row in cursor.fetchall():
            print(f"  {row[0]}")
    print()

print("\n=== VERIFICANDO O PLANO DE MIGRATION ===\n")
# Verificar o que o migrate vai fazer
from django.db.migrations.executor import MigrationExecutor
from django.db import connections

with connection.cursor() as cursor:
    cursor.execute('SET search_path TO "UMC"')

executor = MigrationExecutor(connections['default'])
plan = executor.migration_plan(executor.loader.graph.leaf_nodes())

if plan:
    print("Migrations pendentes:")
    for migration, backwards in plan:
        print(f"  {'BACKWARDS' if backwards else 'FORWARDS'}: {migration.app_label}.{migration.name}")
else:
    print("Nenhuma migration pendente!")
