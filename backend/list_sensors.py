#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.ingest.models import Reading

schema = 'umc'

with schema_context(schema):
    sensors = Reading.objects.filter(device_id='CHILLER-001').values('sensor_id').distinct()
    print("Sensor IDs encontrados para CHILLER-001:")
    for s in sensors:
        # Pegar última leitura
        latest = Reading.objects.filter(
            device_id='CHILLER-001',
            sensor_id=s['sensor_id']
        ).order_by('-ts').first()
        
        if latest:
            print(f"  - {s['sensor_id']}: {latest.value} (última leitura: {latest.ts})")
