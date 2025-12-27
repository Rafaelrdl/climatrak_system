import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.ingest.models import Reading
from django.utils import timezone
from datetime import timedelta

schema = 'umc'

with schema_context(schema):
    # Verificar últimas leituras do device F80332010002C873
    device_id = 'F80332010002C873'
    
    print(f"📡 Verificando leituras do device: {device_id}\n")
    
    # Últimas 5 leituras
    recent = Reading.objects.filter(
        device_id=device_id
    ).order_by('-ts')[:5]
    
    print(f"🕐 Últimas 5 leituras:")
    for r in recent:
        age = (timezone.now() - r.ts).total_seconds() / 60
        print(f"   {r.sensor_id}: {r.value} (há {age:.1f} min)")
    
    # Verificar se há leituras nos últimos 15 minutos
    cutoff = timezone.now() - timedelta(minutes=15)
    fresh = Reading.objects.filter(
        device_id=device_id,
        ts__gte=cutoff
    ).count()
    
    print(f"\n📊 Leituras nos últimos 15 minutos: {fresh}")
    
    if fresh == 0:
        print(f"\n⚠️ PROBLEMA IDENTIFICADO:")
        print(f"   O device {device_id} não está enviando dados há mais de 15 minutos")
        print(f"   O sistema de alertas só avalia dados recentes (<15 min)")
        print(f"\n💡 SOLUÇÕES:")
        print(f"   1. Verificar conectividade MQTT do device")
        print(f"   2. Publicar mensagem de teste via MQTT")
        print(f"   3. Verificar se o device está ligado e conectado")
        print(f"\n📝 Comando para teste MQTT:")
        print(f'   mosquitto_pub -h localhost -p 1883 -t "tenants/umc/sites/Uberlândia Medical Center/assets/CHILLER-001/telemetry" -m \'{{...}}\'')
