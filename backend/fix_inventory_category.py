#!/usr/bin/env python
"""
Script para atualizar categoria de lançamentos de inventário.

Atualiza:
1. Lançamentos com source='inventory_movement' de 'other' para 'parts'
2. Atualiza meta.reason para label amigável em português (opcional)

Uso:
    python fix_inventory_category.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection
from django_tenants.utils import schema_context


def fix_inventory_transactions():
    """Corrige categoria de lançamentos de inventário."""
    from apps.trakledger.models import CostTransaction
    from apps.tenants.models import Tenant
    
    tenants = Tenant.objects.exclude(schema_name='public')
    
    for tenant in tenants:
        print(f"\n{'='*60}")
        print(f"Processando tenant: {tenant.schema_name}")
        print('='*60)
        
        with schema_context(tenant.schema_name):
            # Buscar lançamentos de inventário com categoria 'other'
            transactions = CostTransaction.objects.filter(
                meta__source='inventory_movement',
                category='other'
            )
            
            count = transactions.count()
            print(f"Encontrados {count} lançamentos para atualizar")
            
            if count > 0:
                # Atualizar para 'parts'
                updated = transactions.update(category='parts')
                print(f"Atualizados {updated} lançamentos para categoria 'parts'")
            
            # Verificar resultado
            remaining = CostTransaction.objects.filter(
                meta__source='inventory_movement',
                category='other'
            ).count()
            
            parts_count = CostTransaction.objects.filter(
                meta__source='inventory_movement',
                category='parts'
            ).count()
            
            print(f"Restantes com 'other': {remaining}")
            print(f"Total com 'parts': {parts_count}")


if __name__ == '__main__':
    print("Iniciando correção de categorias de inventário...")
    fix_inventory_transactions()
    print("\nConcluído!")
