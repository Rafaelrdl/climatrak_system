#!/usr/bin/env python
"""
Diagnóstico completo: Regra vs Sensores vs Condições
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule
from apps.ingest.models import Reading
from django.utils import timezone
from datetime import timedelta

schema = 'umc'

print("="*80)
print("🔍 DIAGNÓSTICO COMPLETO - SISTEMA DE ALERTAS")
print("="*80)

with schema_context(schema):
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("❌ Regra não encontrada!")
        exit()
    
    print(f"\n📋 REGRA: {rule.name}")
    print(f"   Equipamento: {rule.equipment.name} ({rule.equipment.tag})")
    print(f"   Status: {'✅ Ativa' if rule.enabled else '❌ Desativada'}")
    print(f"   Total de parâmetros: {rule.parameters.count()}")
    
    print("\n" + "-"*80)
    print("📊 SENSORES REAIS DO EQUIPAMENTO (device_id = {})".format(rule.equipment.tag))
    print("-"*80)
    
    # Buscar TODOS os sensores desse device (últimas 2 horas)
    cutoff = timezone.now() - timedelta(hours=2)
    all_sensors = Reading.objects.filter(
        device_id=rule.equipment.tag,
        ts__gte=cutoff
    ).values('sensor_id').distinct()
    
    print(f"\nTotal de sensores encontrados: {all_sensors.count()}")
    
    sensor_data = {}
    for s in all_sensors:
        sensor_id = s['sensor_id']
        latest = Reading.objects.filter(
            device_id=rule.equipment.tag,
            sensor_id=sensor_id
        ).order_by('-ts').first()
        
        if latest:
            sensor_data[sensor_id] = {
                'value': latest.value,
                'ts': latest.ts,
                'age_minutes': (timezone.now() - latest.ts).total_seconds() / 60
            }
            
            age_str = f"{sensor_data[sensor_id]['age_minutes']:.1f} min atrás"
            is_recent = sensor_data[sensor_id]['age_minutes'] < 15
            status = "✅ RECENTE" if is_recent else "⚠️  ANTIGO"
            
            print(f"  • {sensor_id}")
            print(f"      Valor: {latest.value}")
            print(f"      Timestamp: {latest.ts} ({age_str}) {status}")
    
    print("\n" + "-"*80)
    print("🎯 PARÂMETROS CONFIGURADOS NA REGRA")
    print("-"*80)
    
    for idx, param in enumerate(rule.parameters.all(), 1):
        print(f"\n  Parâmetro {idx}:")
        print(f"     Sensor ID configurado: {param.parameter_key}")
        print(f"     Condição: {param.operator} {param.threshold}")
        print(f"     Severidade: {param.severity}")
        print(f"     Duração (cooldown): {param.duration} minutos")
        
        # Verificar se o sensor existe
        if param.parameter_key in sensor_data:
            data = sensor_data[param.parameter_key]
            print(f"     ✅ Sensor encontrado!")
            print(f"     Valor atual: {data['value']}")
            print(f"     Idade do dado: {data['age_minutes']:.1f} minutos")
            
            # Verificar se está dentro da janela de 15 minutos
            if data['age_minutes'] > 15:
                print(f"     ❌ PROBLEMA: Dado muito antigo (> 15 min)!")
                print(f"        A task só considera dados dos últimos 15 minutos")
            else:
                print(f"     ✅ Dado recente (< 15 min)")
                
                # Avaliar condição
                value = float(data['value'])
                threshold = float(param.threshold)
                condition_met = False
                
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
                elif param.operator == '!=':
                    condition_met = value != threshold
                
                if condition_met:
                    print(f"     ✅ CONDIÇÃO ATENDIDA: {value} {param.operator} {threshold}")
                    print(f"     🚨 DEVERIA DISPARAR ALERTA!")
                else:
                    print(f"     ❌ Condição NÃO atendida: {value} {param.operator} {threshold}")
        else:
            print(f"     ❌ PROBLEMA: Sensor '{param.parameter_key}' NÃO encontrado!")
            print(f"        Este sensor não está enviando dados ou o ID está errado")
            
            # Sugerir sensores similares
            print(f"\n     💡 Sensores disponíveis para este equipamento:")
            for sensor_id in sensor_data.keys():
                print(f"        - {sensor_id}")
    
    print("\n" + "="*80)
    print("📝 RESUMO DO DIAGNÓSTICO")
    print("="*80)
    
    # Contar problemas
    params_ok = 0
    params_problem = 0
    params_should_alert = 0
    
    for param in rule.parameters.all():
        if param.parameter_key in sensor_data:
            data = sensor_data[param.parameter_key]
            if data['age_minutes'] <= 15:
                params_ok += 1
                
                # Verificar condição
                value = float(data['value'])
                threshold = float(param.threshold)
                if param.operator == '>':
                    if value > threshold:
                        params_should_alert += 1
                elif param.operator == '<':
                    if value < threshold:
                        params_should_alert += 1
                elif param.operator == '>=':
                    if value >= threshold:
                        params_should_alert += 1
                elif param.operator == '<=':
                    if value <= threshold:
                        params_should_alert += 1
            else:
                params_problem += 1
        else:
            params_problem += 1
    
    print(f"\n✅ Parâmetros OK: {params_ok}/{rule.parameters.count()}")
    print(f"❌ Parâmetros com problema: {params_problem}/{rule.parameters.count()}")
    print(f"🚨 Parâmetros que DEVERIAM disparar alerta: {params_should_alert}/{rule.parameters.count()}")
    
    if params_should_alert > 0:
        print(f"\n⚠️  HÁ {params_should_alert} PARÂMETRO(S) QUE DEVERIA(M) DISPARAR ALERTA!")
        print("   Possíveis causas:")
        print("   1. Task do Celery não está rodando")
        print("   2. Regra está em período de cooldown")
        print("   3. Erro na lógica de avaliação")
    
    print("\n" + "="*80)
