#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule, RuleParameter

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name='teasdas').first()
    if rule:
        print(f"✅ Regra encontrada: {rule.name}")
        print(f"📊 Total de parâmetros: {rule.parameters.count()}")
        print(f"\nParâmetros salvos:")
        for p in rule.parameters.all():
            print(f"  {p.order + 1}. {p.parameter_key} {p.operator} {p.threshold} {p.unit}")
            print(f"     Severidade: {p.severity}")
            print(f"     Duração: {p.duration} min")
            print(f"     Mensagem: {p.message_template[:50]}...")
    else:
        print("❌ Regra não encontrada")
