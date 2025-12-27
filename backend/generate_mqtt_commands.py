#!/usr/bin/env python
"""
Script para publicar mensagens MQTT de teste que atendam as condições da regra.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule, RuleParameter
from apps.assets.models import Sensor

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("❌ Regra não encontrada!")
        exit(1)
    
    device = rule.equipment.devices.first()
    
    if not device:
        print("❌ Device não encontrado!")
        exit(1)
    
    params = RuleParameter.objects.filter(rule=rule).order_by('order')
    
    print("=" * 80)
    print("📝 COMANDOS MOSQUITTO PARA DISPARAR ALERTAS")
    print("=" * 80)
    print(f"\nTenant: {schema}")
    print(f"Device ID: {device.mqtt_client_id}")
    print(f"Equipment: {rule.equipment.name}\n")
    
    print("Execute os comandos abaixo no terminal:\n")
    
    for param in params:
        # Resolver sensor_tag
        sensor_tag = param.parameter_key
        if param.parameter_key.startswith('sensor_'):
            sensor_id = int(param.parameter_key.replace('sensor_', ''))
            sensor = Sensor.objects.filter(pk=sensor_id).first()
            if sensor:
                sensor_tag = sensor.tag
        
        # Calcular valor que atende a condição
        if param.operator == '>':
            test_value = float(param.threshold) + 5.0
        elif param.operator == '<':
            test_value = float(param.threshold) - 5.0
        elif param.operator == '>=':
            test_value = float(param.threshold)
        elif param.operator == '<=':
            test_value = float(param.threshold)
        else:
            test_value = float(param.threshold)
        
        print(f"# Parâmetro {param.order + 1}: {sensor_tag} {param.operator} {param.threshold}")
        print(f"mosquitto_pub -h localhost -p 1883 \\")
        print(f"  -t 'traksense/{schema}/sensor/{device.mqtt_client_id}/{sensor_tag}' \\")
        print(f"  -m '{test_value}'\n")
    
    print("\n" + "=" * 80)
    print("💡 DICA:")
    print("   Após publicar, aguarde até 5 minutos para o Celery avaliar,")
    print("   ou execute: docker exec traksense-api python test_rule_evaluation_fixed.py")
    print("=" * 80)
