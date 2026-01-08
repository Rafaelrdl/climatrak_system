#!/usr/bin/env python
"""
Script para verificar todas as tabelas no schema UMC.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

print("Verificando tabelas no schema UMC...")

with connection.cursor() as cursor:
    cursor.execute("SET search_path TO umc")
    
    # Listar TODAS as tabelas
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'umc' 
        ORDER BY table_name
    """)
    all_tables = [row[0] for row in cursor.fetchall()]
    
    print(f"\nTotal de tabelas no UMC: {len(all_tables)}")
    print("\nTabelas que contêm 'finance' ou 'trakledger' ou 'cost' ou 'budget':")
    for t in all_tables:
        if any(x in t.lower() for x in ['finance', 'trakledger', 'cost', 'budget', 'envelope', 'commitment', 'savings', 'energy', 'baseline', 'risk']):
            print(f"  - {t}")
    
    print("\nTodas as tabelas:")
    for t in all_tables:
        print(f"  {t}")
