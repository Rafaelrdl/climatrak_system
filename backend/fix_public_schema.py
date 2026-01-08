#!/usr/bin/env python
"""
Script para criar tabelas trakledger no schema public.
O public não precisa das tabelas reais (é o schema admin), mas o Django
precisa delas para funcionar.

A solução mais limpa é remover as migrations do trakledger do public
e marcar como fake todas elas.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

print("=== CORRIGINDO SCHEMA PUBLIC ===\n")

with connection.cursor() as cursor:
    cursor.execute('SET search_path TO "public"')
    
    # O schema public não deve ter tabelas de tenant
    # Vamos simplesmente remover todas as migrations do trakledger
    # para que elas não sejam consideradas
    
    # Primeiro, verificar se já existem migrations
    cursor.execute("""
        SELECT name FROM django_migrations 
        WHERE app = 'trakledger'
    """)
    existing = [row[0] for row in cursor.fetchall()]
    print(f"Migrations existentes no public: {len(existing)}")
    
    if existing:
        # Vamos manter as migrations mas verificar se as tabelas existem
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'trakledger_%'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tabelas trakledger existentes: {len(tables)}")
        
        if not tables:
            print("\n⚠️ Sem tabelas no public - isso é esperado para schema admin")
            print("O problema é que o Django está tentando executar migrations")
            print("Vamos remover as migrations do trakledger do public")
            
            # Remover migrations do trakledger no public
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'trakledger'
            """)
            deleted = cursor.rowcount
            print(f"\n✅ Removidas {deleted} migrations do trakledger do schema public")

print("\n=== CONCLUÍDO ===")
print("\nAgora rode: python manage.py migrate_schemas")
