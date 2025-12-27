#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Alert

schema='umc'

with schema_context(schema):
    alerts = Alert.objects.all().order_by('-triggered_at')[:10]
    
    print("\n" + "=" * 80)
    print("🚨 ALERTAS NO BANCO DE DADOS")
    print("=" * 80)
    
    if alerts.exists():
        print(f"\nTotal: {alerts.count()} alertas\n")
        for a in alerts:
            status = "✅" if a.resolved else ("⏸️" if a.acknowledged else "🚨")
            print(f"{status} ID {a.id} | {a.triggered_at.strftime('%d/%m %H:%M:%S')} | {a.severity:6} | {a.asset_tag}")
            print(f"   {a.message[:100]}")
            print()
    else:
        print("\n❌ Nenhum alerta encontrado no banco!\n")
    
    print("=" * 80)
