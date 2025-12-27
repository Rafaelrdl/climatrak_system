"""
Script para testar a contagem de ativos com alertas ativos.
"""
import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.assets.models import Asset, Site
from apps.alerts.models import Alert
from django_tenants.utils import schema_context

print("\n" + "="*60)
print("TESTE: ATIVOS COM ALERTAS ATIVOS")
print("="*60 + "\n")

schema = 'umc'

with schema_context(schema):
    site = Site.objects.first()
    
    if not site:
        print("⚠️  Nenhum site encontrado")
    else:
        print(f"📍 Site: {site.name} (ID: {site.id})")
        print()
        
        # Buscar assets do site
        assets = Asset.objects.filter(site=site)
        asset_tags = list(assets.values_list('tag', flat=True))
        
        print(f"📦 Total de assets: {len(asset_tags)}")
        if asset_tags:
            print(f"   Exemplos: {', '.join(asset_tags[:5])}")
        print()
        
        # Buscar alertas ativos
        total_alerts = Alert.objects.count()
        print(f"🔔 Total de alertas no sistema: {total_alerts}")
        
        active_alerts = Alert.objects.filter(
            resolved=False,
            acknowledged=False
        )
        print(f"🔴 Alertas ativos (não resolvidos e não reconhecidos): {active_alerts.count()}")
        
        # Alertas do site
        site_alerts = Alert.objects.filter(
            asset_tag__in=asset_tags,
            resolved=False,
            acknowledged=False
        )
        print(f"📊 Alertas ativos do site: {site_alerts.count()}")
        
        # Ativos únicos com alertas
        assets_with_alerts = site_alerts.values('asset_tag').distinct().count()
        print(f"✅ Ativos com alertas ativos: {assets_with_alerts}")
        
        if site_alerts.exists():
            print("\n🔍 Detalhes dos alertas:")
            for alert in site_alerts[:5]:
                print(f"   • {alert.asset_tag}: {alert.message[:60]}")

print("\n" + "="*60 + "\n")
