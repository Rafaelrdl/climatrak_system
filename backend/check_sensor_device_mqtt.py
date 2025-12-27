#!/usr/bin/env python
"""
Script para verificar se os sensores têm device.mqtt_client_id preenchido.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.assets.models import Sensor, Device, Asset

def check_sensors():
    print("\n" + "="*80)
    print("🔍 VERIFICANDO MQTT CLIENT IDs DOS DEVICES")
    print("="*80 + "\n")
    
    # Buscar asset CHILLER-001
    try:
        asset = Asset.objects.get(tag='CHILLER-001')
        print(f"✅ Asset encontrado: {asset.tag} - {asset.name}")
        print(f"   ID: {asset.id}")
        print(f"   Site: {asset.site.name}")
    except Asset.DoesNotExist:
        print("❌ Asset CHILLER-001 não encontrado!")
        return
    
    print("\n" + "-"*80)
    print("📋 DEVICES DO ASSET:")
    print("-"*80)
    
    devices = Device.objects.filter(asset=asset)
    for device in devices:
        print(f"\n🔧 Device: {device.name} (ID: {device.id})")
        print(f"   Serial: {device.serial_number}")
        print(f"   MQTT Client ID: '{device.mqtt_client_id}' {'✅' if device.mqtt_client_id else '❌ VAZIO!'}")
        print(f"   Tipo: {device.device_type}")
        print(f"   Status: {device.status}")
        
        # Listar sensores deste device
        sensors = Sensor.objects.filter(device=device)
        print(f"\n   📊 Sensores ({sensors.count()}):")
        for sensor in sensors:
            print(f"      - {sensor.tag}")
            print(f"        Metric: {sensor.metric_type}")
            print(f"        Unit: {sensor.unit}")
            print(f"        Device MQTT ID (via FK): '{sensor.device.mqtt_client_id}'")
    
    print("\n" + "="*80)
    print("🔍 VERIFICANDO SERIALIZER")
    print("="*80 + "\n")
    
    from apps.assets.serializers import SensorSerializer
    
    sensors = Sensor.objects.filter(device__asset=asset).select_related('device', 'device__asset', 'device__asset__site')
    
    for sensor in sensors:
        print(f"\n📊 Sensor: {sensor.tag}")
        serialized = SensorSerializer(sensor)
        data = serialized.data
        
        print(f"   device_mqtt_client_id no serializer: '{data.get('device_mqtt_client_id')}'")
        print(f"   device_mqtt_client_id direto do model: '{sensor.device.mqtt_client_id}'")
        
        if not data.get('device_mqtt_client_id'):
            print("   ❌ PROBLEMA: Serializer retorna vazio!")
        else:
            print("   ✅ Serializer OK!")

if __name__ == '__main__':
    check_sensors()
