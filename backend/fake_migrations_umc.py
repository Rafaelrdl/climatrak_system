#!/usr/bin/env python
"""
Script para marcar migrations 0007 e 0008 do trakledger como aplicadas no UMC
sem executá-las (fake), já que as tabelas já existem com nomes corretos.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

# Inserir registros na tabela django_migrations do UMC
# para marcar 0007 e 0008 como aplicadas

print("Conectando ao schema UMC...")

with connection.cursor() as cursor:
    cursor.execute("SET search_path TO umc")
    
    # Verificar quais migrations já existem
    cursor.execute("""
        SELECT name FROM django_migrations 
        WHERE app = 'trakledger' 
        ORDER BY name
    """)
    existing = [row[0] for row in cursor.fetchall()]
    print(f"Migrations existentes no UMC: {existing}")
    
    # Inserir 0007 se não existir
    if '0007_rename_finance_to_trakledger' not in existing:
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('trakledger', '0007_rename_finance_to_trakledger', NOW())
        """)
        print("✓ Migration 0007 marcada como aplicada (fake)")
    else:
        print("- Migration 0007 já existe")
    
    # Inserir 0008 se não existir
    if '0008_alter_costtransaction_cost_center' not in existing:
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('trakledger', '0008_alter_costtransaction_cost_center', NOW())
        """)
        print("✓ Migration 0008 marcada como aplicada (fake)")
    else:
        print("- Migration 0008 já existe")

    # Verificar resultado final
    cursor.execute("""
        SELECT name FROM django_migrations 
        WHERE app = 'trakledger' 
        ORDER BY name
    """)
    final = [row[0] for row in cursor.fetchall()]
    print(f"\nMigrations finais no UMC: {final}")
    
    # Verificar se as tabelas existem
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'umc' 
        AND table_name LIKE 'trakledger_%'
        ORDER BY table_name
    """)
    tables = [row[0] for row in cursor.fetchall()]
    print(f"\nTabelas trakledger no UMC: {tables}")

print("\n✓ Script concluído!")
