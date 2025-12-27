#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.ingest.models import Reading
from apps.assets.models import Asset
from django.utils import timezone
from datetime import timedelta

schema='umc'

with schema_context(schema):
    print("📊 Analisando mapeamento Equipment → Device ID\n")
    
    # Listar equipamentos
    assets = Asset.objects.all()
    print(f"Total de equipamentos cadastrados: {assets.count()}\n")
    
    for asset in assets:
        print(f"🏢 Equipamento: {asset.name}")
        print(f"   Tag: {asset.tag}")
        
        # Buscar readings recentes para este tag
        cutoff = timezone.now() - timedelta(hours=1)
        readings_by_tag = Reading.objects.filter(
            device_id=asset.tag,
            ts__gte=cutoff
        ).count()
        
        print(f"   Readings com device_id='{asset.tag}': {readings_by_tag}")
        
        # Buscar se há readings com outro device_id que mencione o nome
        all_recent = Reading.objects.filter(ts__gte=cutoff).values('device_id').distinct()
        
        print(f"   Device IDs recentes no sistema:")
        for d in all_recent:
            count = Reading.objects.filter(device_id=d['device_id'], ts__gte=cutoff).count()
            print(f"      - {d['device_id']}: {count} readings")
        
        print()
