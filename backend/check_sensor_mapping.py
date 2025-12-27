#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.assets.models import Asset, Sensor
from apps.alerts.models import Rule, RuleParameter
from apps.ingest.models import Reading
from django.utils import timezone
from datetime import timedelta

schema='umc'

with schema_context(schema):
    print("=" * 80)
    print("🔍 INVESTIGAÇÃO: Mapeamento Sensor ID → sensor_id")
    print("=" * 80)
    
    # 1. Buscar a regra
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("❌ Regra não encontrada!")
        exit(1)
    
    print(f"\n📋 Regra: {rule.name}")
    print(f"   Equipment: {rule.equipment.name} (tag: {rule.equipment.tag})")
    
    # 2. Buscar os parâmetros da regra
    params = RuleParameter.objects.filter(rule=rule).order_by('order')
    
    print(f"\n⚙️  Parâmetros da Regra ({params.count()}):")
    
    for param in params:
        print(f"\n   📌 Parâmetro {param.order + 1}:")
        print(f"      parameter_key: '{param.parameter_key}'")
        print(f"      Condição: {param.operator} {param.threshold}")
        
        # Tentar interpretar como ID de sensor
        try:
            sensor_pk = int(param.parameter_key.replace('sensor_', ''))
            print(f"      → Interpretado como Sensor PK: {sensor_pk}")
            
            # Buscar o sensor no banco
            sensor = Sensor.objects.filter(pk=sensor_pk).first()
            
            if sensor:
                print(f"      ✅ Sensor encontrado no banco:")
                print(f"         ID: {sensor.id}")
                print(f"         Tag (sensor_id): {sensor.tag}")
                if sensor.device:
                    print(f"         Device: {sensor.device.name}")
                    if sensor.device.asset:
                        print(f"         Asset: {sensor.device.asset.name} (tag: {sensor.device.asset.tag})")
                
                # Buscar readings recentes com esse sensor.tag
                cutoff = timezone.now() - timedelta(minutes=30)
                
                readings = Reading.objects.filter(
                    device_id=rule.equipment.tag,
                    sensor_id=sensor.tag,
                    ts__gte=cutoff
                ).order_by('-ts')[:3]
                
                print(f"\n         📊 Readings recentes (device_id={rule.equipment.tag}, sensor_id={sensor.tag}):")
                
                if readings.exists():
                    print(f"            Total: {readings.count()} readings")
                    for r in readings:
                        print(f"            • {r.ts.strftime('%H:%M:%S')} → {r.value}")
                        
                        # Avaliar condição
                        if param.operator == '>':
                            condition_met = float(r.value) > float(param.threshold)
                        elif param.operator == '<':
                            condition_met = float(r.value) < float(param.threshold)
                        elif param.operator == '>=':
                            condition_met = float(r.value) >= float(param.threshold)
                        elif param.operator == '<=':
                            condition_met = float(r.value) <= float(param.threshold)
                        elif param.operator == '==':
                            condition_met = float(r.value) == float(param.threshold)
                        else:
                            condition_met = False
                        
                        status = "✅ CONDIÇÃO ATENDIDA" if condition_met else "❌ Condição não atendida"
                        print(f"              {status} ({r.value} {param.operator} {param.threshold})")
                else:
                    print(f"            ❌ Nenhuma reading encontrada!")
                    
                    # Verificar se há readings com outro device_id
                    any_readings = Reading.objects.filter(
                        sensor_id=sensor.tag,
                        ts__gte=cutoff
                    ).order_by('-ts')[:3]
                    
                    if any_readings.exists():
                        print(f"\n            ⚠️  MAS existem readings deste sensor com OUTROS device_ids:")
                        for r in any_readings:
                            print(f"               device_id: {r.device_id}, valor: {r.value}, ts: {r.ts.strftime('%H:%M:%S')}")
            else:
                print(f"      ❌ Sensor PK {sensor_pk} NÃO encontrado no banco!")
                
        except ValueError:
            print(f"      ⚠️  parameter_key não é um sensor_XX válido")
    
    # 3. Listar TODOS os sensores do equipamento
    print(f"\n\n📡 TODOS os Sensores do Equipamento {rule.equipment.name}:")
    print("-" * 80)
    
    # Sensores estão linkados via Device → Asset
    all_sensors = Sensor.objects.filter(device__asset=rule.equipment)
    
    for sensor in all_sensors:
        print(f"\n   Sensor ID: {sensor.id}")
        print(f"   Tag: {sensor.tag}")
        
        # Buscar última reading
        cutoff = timezone.now() - timedelta(minutes=30)
        last = Reading.objects.filter(
            device_id=rule.equipment.tag,
            sensor_id=sensor.tag
        ).order_by('-ts').first()
        
        if last:
            print(f"   Última reading: {last.value} em {last.ts.strftime('%H:%M:%S')}")
        else:
            print(f"   ❌ Sem readings recentes")
    
    print("\n" + "=" * 80)
