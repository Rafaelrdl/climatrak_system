#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.assets.models import Asset

schema='umc'

with schema_context(schema):
    print("🔧 Corrigindo Equipment Tag\n")
    
    # Buscar o equipamento CHILLER-001
    asset = Asset.objects.filter(tag='CHILLER-001').first()
    
    if asset:
        print(f"📋 Equipamento encontrado:")
        print(f"   Nome: {asset.name}")
        print(f"   Tag atual: {asset.tag}")
        print(f"   ID: {asset.id}")
        
        print(f"\n⚠️  ATENÇÃO: Vou atualizar o tag para '4b686f6d70107115'")
        print(f"   Este é o device_id real que está enviando dados.\n")
        
        resposta = input("Deseja continuar? (s/n): ")
        
        if resposta.lower() == 's':
            asset.tag = '4b686f6d70107115'
            asset.save()
            print(f"\n✅ Equipment atualizado com sucesso!")
            print(f"   Novo tag: {asset.tag}")
            
            # Verificar
            asset.refresh_from_db()
            print(f"\n🔍 Verificação:")
            print(f"   Tag no banco: {asset.tag}")
        else:
            print("\n❌ Operação cancelada.")
    else:
        print("❌ Equipamento CHILLER-001 não encontrado!")
