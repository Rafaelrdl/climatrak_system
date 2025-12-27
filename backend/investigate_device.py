#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.ingest.models import Reading
from django.utils import timezone
from datetime import timedelta

schema='umc'

with schema_context(schema):
    print("🔍 Investigando origem dos dados do device 4b686f6d70107115\n")
    
    cutoff = timezone.now() - timedelta(minutes=30)
    
    # Buscar readings recentes
    readings = Reading.objects.filter(
        device_id='4b686f6d70107115',
        ts__gte=cutoff
    ).order_by('-ts')[:5]
    
    print(f"📊 Últimas 5 readings (últimos 30 min):\n")
    
    for r in readings:
        print(f"⏰ Timestamp: {r.ts}")
        print(f"   Device ID: {r.device_id}")
        print(f"   Sensor ID: {r.sensor_id}")
        print(f"   Valor: {r.value}")
        print(f"   Tenant: {r.tenant_id if hasattr(r, 'tenant_id') else 'N/A'}")
        print()
    
    # Listar todos sensor_ids deste device
    sensors = Reading.objects.filter(
        device_id='4b686f6d70107115',
        ts__gte=cutoff
    ).values('sensor_id').distinct()
    
    print(f"\n📡 Todos os sensores do device 4b686f6d70107115:")
    for s in sensors:
        count = Reading.objects.filter(
            device_id='4b686f6d70107115',
            sensor_id=s['sensor_id'],
            ts__gte=cutoff
        ).count()
        
        # Pegar último valor
        last = Reading.objects.filter(
            device_id='4b686f6d70107115',
            sensor_id=s['sensor_id']
        ).order_by('-ts').first()
        
        print(f"   • {s['sensor_id']}: {count} readings")
        if last:
            print(f"     Último valor: {last.value} (em {last.ts.strftime('%H:%M:%S')})")
