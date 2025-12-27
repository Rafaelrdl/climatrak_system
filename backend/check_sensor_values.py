#!/usr/bin/env python
"""
Script para verificar valores atuais dos sensores e comparar com as regras
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule
from apps.ingest.models import Reading

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("❌ Regra não encontrada")
        exit()
    
    print(f"📋 Regra: {rule.name}")
    print(f"   Equipamento: {rule.equipment.name} ({rule.equipment.tag})\n")
    
    print("🔍 Verificando parâmetros e valores atuais:\n")
    
    for param in rule.parameters.all():
        print(f"   Parâmetro {param.order + 1}: {param.parameter_key}")
        print(f"      Condição: {param.operator} {param.threshold}")
        
        # Buscar última leitura
        latest_reading = Reading.objects.filter(
            device_id=rule.equipment.tag,
            sensor_id=param.parameter_key
        ).order_by('-ts').first()
        
        if latest_reading:
            value = latest_reading.value
            print(f"      Valor atual: {value}")
            print(f"      Timestamp: {latest_reading.ts}")
            
            # Avaliar condição
            condition_met = False
            if param.operator == '>':
                condition_met = value > param.threshold
            elif param.operator == '<':
                condition_met = value < param.threshold
            elif param.operator == '>=':
                condition_met = value >= param.threshold
            elif param.operator == '<=':
                condition_met = value <= param.threshold
            elif param.operator == '==':
                condition_met = value == param.threshold
            elif param.operator == '!=':
                condition_met = value != param.threshold
            
            if condition_met:
                print(f"      ✅ CONDIÇÃO ATENDIDA! {value} {param.operator} {param.threshold}")
            else:
                print(f"      ❌ Condição NÃO atendida: {value} {param.operator} {param.threshold}")
        else:
            print(f"      ⚠️  Nenhuma leitura encontrada")
        
        print()
