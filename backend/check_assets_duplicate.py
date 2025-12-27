#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule
from apps.assets.models import Asset

schema='umc'

with schema_context(schema):
    print("🔍 Análise de Assets e Regras\n")
    
    # Listar todos os assets
    assets = Asset.objects.all()
    print(f"📦 Total de Assets: {assets.count()}\n")
    
    for asset in assets:
        print(f"Asset ID: {asset.id}")
        print(f"   Nome: {asset.name}")
        print(f"   Tag: {asset.tag}")
        
        # Verificar se há regras vinculadas
        rules = Rule.objects.filter(equipment=asset)
        if rules.exists():
            print(f"   ✅ {rules.count()} regra(s) vinculada(s):")
            for rule in rules:
                print(f"      - {rule.name} (ID: {rule.id})")
        else:
            print(f"   ❌ Sem regras")
        print()
    
    # Análise da regra específica
    print("\n" + "="*60)
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    if rule:
        print(f"📋 Regra 'Alerta CHILLER-001':")
        print(f"   Rule ID: {rule.id}")
        print(f"   Equipment ID: {rule.equipment.id}")
        print(f"   Equipment Name: {rule.equipment.name}")
        print(f"   Equipment Tag: {rule.equipment.tag}")
        print(f"\n   🎯 O código busca readings com device_id='{rule.equipment.tag}'")
