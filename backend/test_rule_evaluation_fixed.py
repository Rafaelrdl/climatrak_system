#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule, RuleParameter, Alert
from apps.assets.models import Sensor
from apps.ingest.models import Reading
from django.utils import timezone
from datetime import timedelta

schema='umc'

with schema_context(schema):
    print("=" * 80)
    print("🧪 TESTE COMPLETO: Avaliação de Regra com Correção")
    print("=" * 80)
    
    # Buscar a regra
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("\n❌ Regra não encontrada!")
        exit(1)
    
    print(f"\n📋 Regra: {rule.name}")
    print(f"   Equipment: {rule.equipment.name} (tag: {rule.equipment.tag})")
    
    # Buscar o device
    device = rule.equipment.devices.first()
    
    if not device:
        print("\n❌ Device não encontrado!")
        exit(1)
    
    print(f"\n📱 Device:")
    print(f"   Nome: {device.name}")
    print(f"   MQTT Client ID: {device.mqtt_client_id}")
    
    # Buscar parâmetros
    params = RuleParameter.objects.filter(rule=rule).order_by('order')
    
    print(f"\n⚙️  Parâmetros da Regra ({params.count()}):")
    
    results = {
        'total': params.count(),
        'conditions_met': 0,
        'no_data': 0,
        'old_data': 0,
        'condition_not_met': 0
    }
    
    for param in params:
        print(f"\n   {'='*70}")
        print(f"   📌 Parâmetro {param.order + 1}:")
        print(f"      parameter_key: {param.parameter_key}")
        print(f"      Condição: {param.operator} {param.threshold}")
        
        # 1. Resolver sensor_tag
        sensor_tag = param.parameter_key
        if param.parameter_key.startswith('sensor_'):
            try:
                sensor_id = int(param.parameter_key.replace('sensor_', ''))
                sensor = Sensor.objects.filter(pk=sensor_id).first()
                if sensor:
                    sensor_tag = sensor.tag
                    print(f"      ✅ Sensor ID {sensor_id} → sensor_tag: {sensor_tag}")
                else:
                    print(f"      ❌ Sensor ID {sensor_id} não encontrado!")
                    results['no_data'] += 1
                    continue
            except ValueError:
                print(f"      ❌ Erro ao parsear sensor ID!")
                results['no_data'] += 1
                continue
        
        # 2. Buscar reading
        cutoff = timezone.now() - timedelta(minutes=15)
        
        print(f"\n      📊 Buscando readings:")
        print(f"         device_id: {device.mqtt_client_id}")
        print(f"         sensor_id: {sensor_tag}")
        print(f"         ts >= {cutoff.strftime('%H:%M:%S')}")
        
        latest_reading = Reading.objects.filter(
            device_id=device.mqtt_client_id,
            sensor_id=sensor_tag,
            ts__gte=cutoff
        ).order_by('-ts').first()
        
        if not latest_reading:
            print(f"      ❌ Nenhuma reading encontrada (últimos 15 min)")
            results['no_data'] += 1
            
            # Buscar qualquer reading deste sensor
            any_reading = Reading.objects.filter(
                device_id=device.mqtt_client_id,
                sensor_id=sensor_tag
            ).order_by('-ts').first()
            
            if any_reading:
                age = timezone.now() - any_reading.ts
                print(f"         Última reading: {any_reading.value} há {age.seconds // 60} min")
                results['old_data'] += 1
            continue
        
        # 3. Avaliar condição
        value = float(latest_reading.value)
        threshold = float(param.threshold)
        
        print(f"\n      ✅ Reading encontrada:")
        print(f"         Valor: {value}")
        print(f"         Timestamp: {latest_reading.ts.strftime('%H:%M:%S')}")
        
        # Avaliar
        if param.operator == '>':
            condition_met = value > threshold
        elif param.operator == '<':
            condition_met = value < threshold
        elif param.operator == '>=':
            condition_met = value >= threshold
        elif param.operator == '<=':
            condition_met = value <= threshold
        elif param.operator == '==':
            condition_met = value == threshold
        else:
            condition_met = False
        
        print(f"\n      🎯 Avaliação: {value} {param.operator} {threshold}")
        
        if condition_met:
            print(f"      ✅ CONDIÇÃO ATENDIDA!")
            results['conditions_met'] += 1
            
            # Verificar se já existe alerta recente
            cooldown_period = timedelta(minutes=param.duration)
            last_alert = Alert.objects.filter(
                rule=rule,
                parameter_key=param.parameter_key,
                triggered_at__gte=timezone.now() - cooldown_period
            ).first()
            
            if last_alert:
                print(f"      ⏱️  Em cooldown (último alerta: {last_alert.triggered_at.strftime('%H:%M:%S')})")
            else:
                print(f"      🚨 ALERTA SERIA DISPARADO!")
        else:
            print(f"      ❌ Condição não atendida")
            results['condition_not_met'] += 1
    
    # Resumo
    print(f"\n\n" + "=" * 80)
    print(f"📊 RESUMO DO TESTE")
    print(f"=" * 80)
    print(f"   Total de parâmetros: {results['total']}")
    print(f"   ✅ Condições atendidas: {results['conditions_met']}")
    print(f"   ❌ Condições não atendidas: {results['condition_not_met']}")
    print(f"   ⚠️  Sem dados recentes: {results['no_data']}")
    print(f"   ⏰ Dados antigos (>15 min): {results['old_data']}")
    
    if results['conditions_met'] > 0:
        print(f"\n   🎉 SUCESSO! A correção funcionou!")
        print(f"   {results['conditions_met']} parâmetro(s) atendendo condições.")
        print(f"\n   ⏱️  Aguarde até 5 minutos para o Celery avaliar automaticamente,")
        print(f"   ou verifique os logs do scheduler: docker logs traksense-scheduler")
    else:
        print(f"\n   ⚠️  Nenhuma condição atendida no momento.")
    
    print("\n")
