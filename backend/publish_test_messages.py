#!/usr/bin/env python
"""
Publica mensagens MQTT de teste para disparar alertas.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

import paho.mqtt.client as mqtt
import time
from django_tenants.utils import schema_context
from apps.alerts.models import Rule, RuleParameter
from apps.assets.models import Sensor

schema = 'umc'

# Configuração MQTT
MQTT_BROKER = 'localhost'
MQTT_PORT = 1883

print("=" * 80)
print("🚀 PUBLICANDO MENSAGENS MQTT PARA DISPARAR ALERTAS")
print("=" * 80)

with schema_context(schema):
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("\n❌ Regra não encontrada!")
        exit(1)
    
    device = rule.equipment.devices.first()
    
    if not device:
        print("\n❌ Device não encontrado!")
        exit(1)
    
    params = RuleParameter.objects.filter(rule=rule).order_by('order')
    
    print(f"\nTenant: {schema}")
    print(f"Device ID: {device.mqtt_client_id}")
    print(f"Equipment: {rule.equipment.name}\n")
    
    # Criar client MQTT
    client = mqtt.Client()
    
    try:
        print(f"📡 Conectando ao broker MQTT em {MQTT_BROKER}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        print("✅ Conectado!\n")
        
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
            
            # Tópico MQTT
            topic = f'traksense/{schema}/sensor/{device.mqtt_client_id}/{sensor_tag}'
            
            print(f"📤 Publicando:")
            print(f"   Parâmetro {param.order + 1}: {sensor_tag} {param.operator} {param.threshold}")
            print(f"   Topic: {topic}")
            print(f"   Value: {test_value}")
            
            # Publicar
            result = client.publish(topic, str(test_value))
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"   ✅ Publicado com sucesso!\n")
            else:
                print(f"   ❌ Erro ao publicar: {result.rc}\n")
            
            time.sleep(0.5)  # Pequeno delay entre mensagens
        
        print("\n" + "=" * 80)
        print("✅ TODAS AS MENSAGENS PUBLICADAS!")
        print("=" * 80)
        print("\n💡 Próximos passos:")
        print("   1. Aguarde até 5 minutos para o Celery avaliar automaticamente")
        print("   2. OU execute: docker exec traksense-api python test_rule_evaluation_fixed.py")
        print("   3. Verifique os alertas em: /api/alerts/ ou no frontend /alerts")
        print()
        
    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        exit(1)
    finally:
        client.disconnect()
