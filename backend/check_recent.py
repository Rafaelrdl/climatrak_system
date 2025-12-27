#!/usr/bin/env python
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.ingest.models import Reading
from django.utils import timezone
from datetime import timedelta

schema='umc'
with schema_context(schema):
    cutoff=timezone.now()-timedelta(hours=1)
    recent=Reading.objects.filter(ts__gte=cutoff).values('device_id', 'sensor_id').distinct()
    print(f"Readings recentes (última hora): {recent.count()}")
    
    if recent.count() > 0:
        print("\nSensores com dados recentes:")
        for r in recent:
            latest = Reading.objects.filter(
                device_id=r['device_id'],
                sensor_id=r['sensor_id']
            ).order_by('-ts').first()
            print(f"  {r['device_id']}/{r['sensor_id']}: {latest.value} em {latest.ts}")
    else:
        print("\n⚠️  Nenhum dado recente! Sensores não estão enviando dados.")
