#!/usr/bin/env python
"""
Script para corrigir unit_cost de movimentações existentes
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.inventory.models import InventoryMovement

def fix_movement_costs():
    """Corrigir unit_cost de movimentações que não têm valor."""
    print("🔧 Corrigindo unit_cost das movimentações...")
    
    # Usar contexto do schema umc
    with schema_context('umc'):
        movements_without_cost = InventoryMovement.objects.filter(unit_cost__isnull=True)
        updated_count = 0
        
        for movement in movements_without_cost:
            if movement.item.unit_cost > 0:
                movement.unit_cost = movement.item.unit_cost
                movement.save(update_fields=['unit_cost'])
                updated_count += 1
                print(f"✅ Movimentação {movement.id}: {movement.item.code} - {movement.unit_cost}")
        
        print(f"\n📊 Resultado:")
        print(f"   Total de movimentações sem custo: {movements_without_cost.count()}")
        print(f"   Movimentações atualizadas: {updated_count}")
        
        # Verificar resultado
        print("\n🔍 Verificando resultado...")
        all_movements = InventoryMovement.objects.all()
        for movement in all_movements:
            total_value = movement.total_value
            print(f"   Movimentação {movement.id}: {movement.item.code} - Custo: {movement.unit_cost} - Total: {total_value}")

if __name__ == '__main__':
    fix_movement_costs()