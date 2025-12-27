"""Script para verificar as fotos das ordens de serviço."""
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'

import django
django.setup()

from django_tenants.utils import schema_context

with schema_context('umc'):
    from apps.cmms.models import WorkOrder, WorkOrderPhoto
    
    wo = WorkOrder.objects.get(id=24)
    print(f'Work Order: {wo.number}')
    print(f'Photos count: {wo.photos.count()}')
    
    for p in wo.photos.all():
        print(f'  Photo {p.id}:')
        print(f'    File: {p.file}')
        print(f'    URL: {p.file.url if p.file else "No file"}')
