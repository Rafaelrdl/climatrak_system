"""
Script para verificar a disponibilidade dos devices após migração.
"""
import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.assets.models import Device, Site
from django_tenants.utils import schema_context

print("\n" + "="*60)
print("VERIFICAÇÃO DE DISPONIBILIDADE DOS DEVICES")
print("="*60 + "\n")

# Usar schema UMC
schema = 'umc'

with schema_context(schema):
    # Sites
    sites = Site.objects.all()
    print(f"📍 Sites encontrados: {sites.count()}")
    for site in sites[:3]:
        print(f"   • {site.name} (ID: {site.id})")
    
    print()
    
    # Devices
    devices = Device.objects.filter(is_active=True)
    print(f"🔌 Devices ativos: {devices.count()}")
    
    if devices.exists():
        print("\nDetalhes dos devices:")
        print("-" * 80)
        for device in devices[:10]:
            status_icon = "🟢" if device.status == "ONLINE" else "🔴"
            print(f"{status_icon} {device.name}")
            print(f"   Status: {device.status}")
            print(f"   Availability: {device.availability}%")
            print(f"   Last Seen: {device.last_seen or 'Nunca'}")
            print()
        
        # Estatísticas gerais
        print("\n" + "="*60)
        print("ESTATÍSTICAS GERAIS")
        print("="*60)
        
        from django.db.models import Avg, Count, Q
        
        stats = devices.aggregate(
            total=Count('id'),
            online=Count('id', filter=Q(status='ONLINE')),
            avg_availability=Avg('availability')
        )
        
        print(f"Total de devices: {stats['total']}")
        print(f"Devices online: {stats['online']}")
        print(f"Disponibilidade média: {stats['avg_availability']:.1f}%")
        
        # Testar endpoint
        if sites.exists():
            site = sites.first()
            print(f"\n📊 Testando cálculo para site '{site.name}'...")
            
            site_devices = Device.objects.filter(asset__site=site, is_active=True)
            site_stats = site_devices.aggregate(
                total=Count('id'),
                online=Count('id', filter=Q(status='ONLINE')),
                avg_availability=Avg('availability')
            )
            
            print(f"   Total devices do site: {site_stats['total']}")
            print(f"   Devices online: {site_stats['online']}")
            print(f"   Disponibilidade média: {site_stats['avg_availability']:.1f}%")
            print(f"\n✅ Este valor será retornado no endpoint /api/sites/{site.id}/stats/")
    else:
        print("⚠️  Nenhum device ativo encontrado")

print("\n" + "="*60 + "\n")
