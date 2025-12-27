#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule
from apps.alerts.serializers import RuleSerializer
import json

schema='umc'

with schema_context(schema):
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("❌ Regra não encontrada!")
        exit(1)
    
    serializer = RuleSerializer(rule)
    data = serializer.data
    
    print("=" * 80)
    print("🔍 DADOS RETORNADOS PELA API (GET /api/rules/{id}/)")
    print("=" * 80)
    print(json.dumps(data, indent=2, default=str))
    print("\n" + "=" * 80)
    print("\n📋 PARÂMETROS:")
    
    for i, param in enumerate(data.get('parameters', []), 1):
        print(f"\nParâmetro {i}:")
        print(f"   ID: {param.get('id')}")
        print(f"   parameter_key: {param.get('parameter_key')}")
        print(f"   severity: '{param.get('severity')}'")
        print(f"   operator: {param.get('operator')}")
        print(f"   threshold: {param.get('threshold')}")
        print(f"   duration: {param.get('duration')}")
        print(f"   message_template: {param.get('message_template')}")
