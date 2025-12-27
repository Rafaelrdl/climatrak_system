#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.assets.models import Asset, Device, Sensor

schema='umc'

with schema_context(schema):
    print("🔍 Investigando relacionamento Asset → Device → Sensor\n")
    
    # Asset ID 7 (o que tem as regras)
    asset = Asset.objects.filter(id=7).first()
    
    if not asset:
        print("❌ Asset ID 7 não encontrado!")
        exit(1)
    
    print(f"📦 Asset ID 7:")
    print(f"   Nome: {asset.name}")
    print(f"   Tag: {asset.tag}")
    
    # Buscar devices deste asset
    devices = Device.objects.filter(asset=asset)
    
    print(f"\n📱 Devices vinculados ao Asset ({devices.count()}):")
    
    for device in devices:
        print(f"\n   Device ID: {device.id}")
        print(f"   Nome: {device.name}")
        print(f"   Serial: {device.serial_number}")
        print(f"   MQTT Client ID: {device.mqtt_client_id}")
        
        # Buscar sensores deste device
        sensors = Sensor.objects.filter(device=device)
        print(f"   Sensores: {sensors.count()}")
        
        for sensor in sensors:
            print(f"      • Sensor ID {sensor.id}: {sensor.tag}")
    
    print("\n" + "="*60)
    print("💡 CONCLUSÃO:")
    print("   As readings devem usar:")
    print(f"   - device_id = Device.mqtt_client_id ou Device.serial_number")
    print(f"   - sensor_id = Sensor.tag")
