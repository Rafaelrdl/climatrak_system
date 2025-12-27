"""
Remove sensores específicos do device F80332010002C857
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.assets.models import Sensor, Device
from django_tenants.utils import schema_context

# Execute no schema do tenant UMC
with schema_context('umc'):
    # Buscar o device pelo serial number
    try:
        device = Device.objects.get(serial_number='F80332010002C857')
        print(f"✅ Device encontrado: {device.name} (ID: {device.id})")
        print()
        
        # Tags dos sensores a serem removidos (usando busca por padrão)
        sensor_patterns_to_remove = [
            'humidade_ambiente',
            'Humidade ambiente',
            'temperatura_de_retorno',
            'Temperatura de retorno',
            'temperatura_de_saida',
            'Temperatura de saida',
            'battery'
        ]
        
        # Buscar e deletar sensores que contenham esses padrões
        deleted_count = 0
        for pattern in sensor_patterns_to_remove:
            sensors = Sensor.objects.filter(device=device, tag__icontains=pattern)
            for sensor in sensors:
                sensor_name = sensor.tag
                sensor_id = sensor.id
                sensor.delete()
                print(f"🗑️  Sensor deletado: {sensor_name} (ID: {sensor_id})")
                deleted_count += 1
        
        print()
        print(f"✅ Total de sensores deletados: {deleted_count}")
        
        # Mostrar sensores restantes do device
        remaining_sensors = Sensor.objects.filter(device=device)
        print()
        print(f"📊 Sensores restantes no device ({remaining_sensors.count()}):")
        for sensor in remaining_sensors:
            print(f"   - {sensor.tag} ({sensor.metric_type})")
        
    except Device.DoesNotExist:
        print("❌ Device F80332010002C857 não encontrado!")
