#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.assets.models import Asset, Device, Sensor

schema='umc'

with schema_context(schema):
    print("=" * 80)
    print("🔍 ANÁLISE DA SITUAÇÃO ATUAL")
    print("=" * 80)
    
    # Listar todos os Assets
    assets = Asset.objects.all()
    print(f"\n📦 Assets cadastrados ({assets.count()}):\n")
    
    for asset in assets:
        print(f"Asset ID: {asset.id}")
        print(f"   Nome: {asset.name}")
        print(f"   Tag: {asset.tag}")
        
        # Listar devices deste asset
        devices = Device.objects.filter(asset=asset)
        print(f"   Devices: {devices.count()}")
        
        for device in devices:
            print(f"      - Device ID {device.id}: {device.name} (MQTT: {device.mqtt_client_id})")
            
            # Listar sensores deste device
            sensors = Sensor.objects.filter(device=device)
            print(f"        Sensores: {sensors.count()}")
            for sensor in sensors:
                print(f"          • Sensor ID {sensor.id}: {sensor.tag}")
        
        print()
    
    print("=" * 80)
    print("\n🎯 PLANO DE AÇÃO:")
    print("   1. Mover sensores do Asset duplicado para o Asset CHILLER-001 correto")
    print("   2. Excluir o Asset duplicado (4b686f6d70107115)")
    print()
