#!/usr/bin/env python
"""Script para habilitar TrakService para o tenant COMG."""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.tenants.models import Tenant
from apps.tenants.features import FeatureService

def main():
    # Listar tenants disponíveis
    tenants = Tenant.objects.all()
    print("Tenants disponíveis:")
    for t in tenants:
        print(f"  - {t.schema_name}")

    # Buscar tenant COMG (case-insensitive)
    try:
        tenant = Tenant.objects.get(schema_name__iexact="comg")
        print(f"\nTenant encontrado: {tenant.schema_name}")
        
        # Habilitar TrakService
        FeatureService.set_features(tenant.id, {
            "trakservice.enabled": True,
            "trakservice.dispatch": True,
            "trakservice.tracking": True,
            "trakservice.routing": True,
            "trakservice.km": True,
            "trakservice.quotes": True,
        })
        
        # Verificar
        features = FeatureService.get_features(tenant.id)
        print(f"\nFeatures habilitadas para {tenant.schema_name}:")
        for k, v in features.items():
            if v:
                print(f"  ✅ {k}")
        
        print("\n✅ TrakService habilitado com sucesso para COMG!")
        
    except Tenant.DoesNotExist:
        print("❌ Tenant COMG não encontrado!")
        sys.exit(1)

if __name__ == "__main__":
    main()
