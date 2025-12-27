"""Script para testar o serializer de fotos."""
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'

import django
django.setup()

from django_tenants.utils import schema_context
from apps.cmms.serializers import WorkOrderSerializer, WorkOrderPhotoSerializer

with schema_context('umc'):
    from apps.cmms.models import WorkOrder, WorkOrderPhoto
    
    wo = WorkOrder.objects.prefetch_related('photos').get(id=24)
    print(f'Work Order: {wo.number}')
    print(f'Photos count in queryset: {wo.photos.count()}')
    
    # Testar serializer de foto
    for p in wo.photos.all():
        serializer = WorkOrderPhotoSerializer(p)
        print(f'Photo serialized: {serializer.data}')
    
    # Testar serializer completo
    wo_serializer = WorkOrderSerializer(wo)
    print(f'\nWork Order serialized photos: {wo_serializer.data.get("photos", [])}')
