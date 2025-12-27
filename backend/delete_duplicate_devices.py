"""
Remove devices duplicados com serial number F8033201
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.assets.models import Device
from django_tenants.utils import schema_context

# Execute no schema do tenant UMC
with schema_context('umc'):
    # Buscar devices duplicados
    devices = Device.objects.filter(serial_number__startswith='F8033201').order_by('created_at')
    
    print(f"📊 Total de devices encontrados: {devices.count()}")
    print()
    
    for device in devices:
        asset_tag = device.asset.tag if device.asset else "SEM ASSET"
        print(f"ID: {device.id}")
        print(f"  Serial: {device.serial_number}")
        print(f"  Name: {device.name}")
        print(f"  Asset: {asset_tag}")
        print(f"  Status: {device.status}")
        print(f"  Online: {device.last_seen}")
        print(f"  Criado: {device.created_at}")
        print()
    
    # Manter apenas o mais recente (último criado)
    if devices.count() > 1:
        devices_to_delete = devices[:-1]  # Todos exceto o último
        keep_device = devices.last()
        
        print(f"✅ Mantendo device ID {keep_device.id} (mais recente)")
        print(f"❌ Deletando {devices_to_delete.count()} device(s) duplicado(s)")
        print()
        
        for device in devices_to_delete:
            print(f"   🗑️  Deletando device ID {device.id} ({device.serial_number})")
            device.delete()
        
        print()
        print("✅ Limpeza concluída!")
    else:
        print("✅ Nenhum device duplicado encontrado!")
