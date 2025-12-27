import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule
from apps.assets.models import Sensor
from apps.ingest.models import Reading
from django.utils import timezone

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name__icontains='CHILLER').first()
    
    print(f"📋 Regra: {rule.name}")
    print(f"   Equipamento: {rule.equipment.tag}\n")
    
    device = rule.equipment.devices.first()
    print(f"🔌 Device: {device.mqtt_client_id}\n")
    
    for param in rule.parameters.all():
        print(f"🔍 Parâmetro: {param.parameter_key}")
        print(f"   Condição: {param.operator} {param.threshold}")
        
        # Tentar encontrar o sensor
        sensor_obj = Sensor.objects.filter(tag=param.parameter_key).first()
        
        if sensor_obj:
            print(f"   ✅ Sensor encontrado (ID: {sensor_obj.id})")
            print(f"      Device: {sensor_obj.device.mqtt_client_id}")
        else:
            print(f"   ❌ Sensor NÃO encontrado com tag: {param.parameter_key}")
        
        # Tentar buscar leitura com device_id + sensor_id
        print(f"\n   Buscando leitura com:")
        print(f"      device_id = '{device.mqtt_client_id}'")
        print(f"      sensor_id = '{param.parameter_key}'")
        
        reading = Reading.objects.filter(
            device_id=device.mqtt_client_id,
            sensor_id=param.parameter_key
        ).order_by('-ts').first()
        
        if reading:
            age = (timezone.now() - reading.ts).total_seconds() / 60
            print(f"   ✅ Leitura encontrada!")
            print(f"      Valor: {reading.value}")
            print(f"      Timestamp: {reading.ts}")
            print(f"      Idade: {age:.1f} minutos")
        else:
            print(f"   ❌ Nenhuma leitura encontrada")
            
            # Verificar se há leituras para este device
            all_sensors = Reading.objects.filter(
                device_id=device.mqtt_client_id
            ).values_list('sensor_id', flat=True).distinct()
            
            print(f"\n   📊 Sensor IDs disponíveis para este device:")
            matching = [s for s in all_sensors if 'temperatura' in s.lower()]
            for s in matching[:5]:
                print(f"      - {s}")
        
        print()
