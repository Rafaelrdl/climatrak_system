import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.assets.models import Asset, Sensor
from apps.ingest.models import Reading
from django.utils import timezone

schema = 'umc'

with schema_context(schema):
    # Buscar o CHILLER-001
    chiller = Asset.objects.filter(tag__icontains='CHILLER').first()
    
    if not chiller:
        print("❌ CHILLER não encontrado")
    else:
        print(f"🏭 Equipamento: {chiller.name} ({chiller.tag})")
        
        # Buscar sensores associados
        sensors = Sensor.objects.filter(device__asset=chiller)
        print(f"\n📊 Sensores encontrados: {sensors.count()}")
        
        for sensor in sensors:
            print(f"\n   Sensor ID: {sensor.id}")
            print(f"   Tag: {sensor.tag}")
            print(f"   Metric Type: {sensor.metric_type}")
            print(f"   Unit: {sensor.unit}")
            print(f"   Device: {sensor.device.mqtt_client_id}")
            
            # Buscar última leitura
            reading = Reading.objects.filter(
                device_id=sensor.device.mqtt_client_id,
                sensor_id=sensor.tag
            ).order_by('-ts').first()
            
            if reading:
                age = (timezone.now() - reading.ts).total_seconds() / 60
                print(f"   ✅ Última leitura: {reading.value} (há {age:.1f} min)")
            else:
                print(f"   ⚠️ Sem leituras")
        
        # Verificar leituras por device_id
        device = chiller.devices.first()
        if device:
            print(f"\n🔍 Verificando leituras do device {device.mqtt_client_id}:")
            recent_readings = Reading.objects.filter(
                device_id=device.mqtt_client_id
            ).order_by('-ts')[:10]
            
            print(f"\n   Últimas 10 leituras:")
            for reading in recent_readings:
                age = (timezone.now() - reading.ts).total_seconds() / 60
                print(f"   - sensor_id: {reading.sensor_id}, value: {reading.value}, age: {age:.1f} min")
