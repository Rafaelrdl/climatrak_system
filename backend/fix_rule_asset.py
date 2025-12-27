#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule
from apps.assets.models import Asset

schema='umc'

with schema_context(schema):
    print("🔧 CORREÇÃO: Vincular regra ao Asset correto\n")
    print("="*60)
    
    # Buscar o Asset correto (aquele que tem o device_id real)
    correct_asset = Asset.objects.filter(tag='4b686f6d70107115').first()
    
    if not correct_asset:
        print("❌ Asset com tag='4b686f6d70107115' não encontrado!")
        exit(1)
    
    print(f"✅ Asset correto encontrado:")
    print(f"   ID: {correct_asset.id}")
    print(f"   Nome: {correct_asset.name}")
    print(f"   Tag: {correct_asset.tag}")
    
    # Buscar a regra
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("\n❌ Regra 'Alerta CHILLER-001' não encontrada!")
        exit(1)
    
    print(f"\n📋 Regra encontrada:")
    print(f"   ID: {rule.id}")
    print(f"   Nome: {rule.name}")
    print(f"   Equipment ATUAL: {rule.equipment.name} (ID: {rule.equipment.id}, tag: {rule.equipment.tag})")
    
    print(f"\n⚠️  Atualizando equipment da regra...")
    
    rule.equipment = correct_asset
    rule.save()
    
    rule.refresh_from_db()
    
    print(f"\n✅ ATUALIZADO COM SUCESSO!")
    print(f"   Equipment NOVO: {rule.equipment.name} (ID: {rule.equipment.id}, tag: {rule.equipment.tag})")
    
    print("\n" + "="*60)
    print("🎉 Correção concluída!")
    print("\nAgora o código vai buscar readings com:")
    print(f"   device_id = '{rule.equipment.tag}'")
    print(f"\nE vai ENCONTRAR as readings publicadas pelo device {rule.equipment.tag}!")
    print("\n⏱️  Aguarde até 5 minutos para o Celery avaliar a regra automaticamente,")
    print("   ou execute test_rules_manual.py para testar imediatamente.")
