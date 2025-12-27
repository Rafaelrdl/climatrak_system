#!/usr/bin/env python
"""
Script para verificar dados de telemetria disponíveis para o device CHILLER-001
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'traksense_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from apps.assets.models import Asset, Device, Sensor
from apps.ingest.models import Telemetry, Reading

def check_telemetry_data():
    """Verifica dados de telemetria disponíveis"""
    
    tenants = Tenant.objects.exclude(schema_name='public')
    
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            print(f"\n{'='*80}")
            print(f"🏢 Tenant: {tenant.schema_name}")
            print(f"{'='*80}\n")
            
            try:
                # Buscar asset CHILLER-001
                asset = Asset.objects.get(tag='CHILLER-001')
                print(f"✅ Asset: {asset.tag} (ID: {asset.id})")
                
                # Buscar device do asset
                devices = Device.objects.filter(asset=asset)
                print(f"📱 Devices: {devices.count()}\n")
                
                for device in devices:
                    print(f"  Device ID: {device.id}")
                    print(f"  Device Name: {device.name}")
                    print(f"  MQTT Client ID: {device.mqtt_client_id}")
                    print(f"  Status: {device.status}")
                    print()
                    
                    # Buscar sensores do device
                    sensors = Sensor.objects.filter(device=device)
                    print(f"  📊 Sensores: {sensors.count()}")
                    
                    for sensor in sensors:
                        print(f"    - Sensor ID: {sensor.id}")
                        print(f"      Tag: {sensor.tag}")
                        print(f"      Metric Type: {sensor.metric_type}")
                        print(f"      Unit: {sensor.unit}")
                        
                        # Verificar readings do sensor (últimas 24h)
                        now = datetime.now()
                        start = now - timedelta(hours=24)
                        
                        readings_24h = Reading.objects.filter(
                            sensor_id=sensor.tag,
                            ts__gte=start
                        ).count()
                        
                        # Verificar readings dos últimos 7 dias
                        start_7d = now - timedelta(days=7)
                        readings_7d = Reading.objects.filter(
                            sensor_id=sensor.tag,
                            ts__gte=start_7d
                        ).count()
                        
                        # Verificar última reading
                        last_reading = Reading.objects.filter(
                            sensor_id=sensor.tag
                        ).order_by('-ts').first()
                        
                        print(f"      Readings (24h): {readings_24h}")
                        print(f"      Readings (7d): {readings_7d}")
                        
                        if last_reading:
                            print(f"      Última reading: {last_reading.ts}")
                            print(f"      Valor: {last_reading.value}")
                        else:
                            print(f"      ❌ Nenhuma reading encontrada!")
                        print()
                    
                    # Total de readings do device (últimas 24h)
                    print(f"\n  📈 RESUMO DO DEVICE {device.mqtt_client_id}:")
                    
                    # Buscar por device_id
                    total_readings_24h = Reading.objects.filter(
                        device_id=device.mqtt_client_id,
                        ts__gte=start
                    ).count()
                    
                    total_readings_7d = Reading.objects.filter(
                        device_id=device.mqtt_client_id,
                        ts__gte=start_7d
                    ).count()
                    
                    print(f"    Total readings (24h): {total_readings_24h}")
                    print(f"    Total readings (7d): {total_readings_7d}")
                    
                    if total_readings_24h > 0:
                        print(f"    ✅ Dados disponíveis para telemetria!")
                        
                        # Mostrar amostra
                        sample = Reading.objects.filter(
                            device_id=device.mqtt_client_id,
                            ts__gte=start
                        ).order_by('-ts')[:5]
                        
                        print(f"\n    📋 Amostra (5 readings mais recentes):")
                        for reading in sample:
                            print(f"      {reading.ts} | {reading.sensor_id} = {reading.value}")
                    else:
                        print(f"    ❌ NENHUM DADO de telemetria nas últimas 24h!")
                        print(f"    ⚠️  Verifique se o device está enviando dados via MQTT")
                    
                    print()
                    
            except Asset.DoesNotExist:
                print(f"⚠️ Asset CHILLER-001 não encontrado no tenant {tenant.schema_name}")
            except Exception as e:
                print(f"❌ Erro: {str(e)}")
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    print("="*80)
    print("🔍 VERIFICAÇÃO DE DADOS DE TELEMETRIA")
    print("="*80)
    check_telemetry_data()
    print("\n" + "="*80)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("="*80)
