#!/usr/bin/env python
"""
Script de diagnóstico completo para o sistema de alertas.
Verifica:
1. Se existem regras habilitadas
2. Se as regras têm parâmetros válidos
3. Se existem leituras recentes para os sensores das regras
4. Se as condições das regras estão sendo avaliadas corretamente
"""

import os
import sys
import django
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from apps.alerts.models import Rule, Alert
from apps.assets.models import Sensor
from apps.ingest.models import Reading

def main():
    print("=" * 80)
    print("DIAGNÓSTICO COMPLETO DO SISTEMA DE ALERTAS")
    print("=" * 80)
    
    tenants = Tenant.objects.exclude(slug='public').all()
    print(f"\n📦 Tenants encontrados: {tenants.count()}")
    
    for tenant in tenants:
        print(f"\n{'='*40}")
        print(f"TENANT: {tenant.slug} (schema: {tenant.schema_name})")
        print(f"{'='*40}")
        
        with schema_context(tenant.schema_name):
            # 1. Verificar regras
            all_rules = Rule.objects.all()
            enabled_rules = Rule.objects.filter(enabled=True)
            
            print(f"\n📋 REGRAS:")
            print(f"  - Total: {all_rules.count()}")
            print(f"  - Habilitadas: {enabled_rules.count()}")
            
            if not enabled_rules.exists():
                print("  ⚠️ PROBLEMA: Nenhuma regra habilitada!")
                continue
            
            for rule in enabled_rules:
                print(f"\n  📌 Regra #{rule.id}: {rule.name}")
                print(f"     - Equipment: {rule.equipment.tag if rule.equipment else 'N/A'}")
                print(f"     - Enabled: {rule.enabled}")
                print(f"     - Created: {rule.created_at}")
                
                # 2. Verificar parâmetros
                params = rule.parameters.all()
                print(f"     - Parâmetros: {params.count()}")
                
                if not params.exists() and rule.parameter_key:
                    print(f"     - Formato antigo: {rule.parameter_key}")
                    params = [{'parameter_key': rule.parameter_key, 'operator': rule.operator, 
                              'threshold': rule.threshold, 'duration': rule.duration}]
                
                for param in params if isinstance(params, list) else params:
                    if isinstance(param, dict):
                        pk = param['parameter_key']
                        op = param['operator']
                        thresh = param['threshold']
                    else:
                        pk = param.parameter_key
                        op = param.operator
                        thresh = param.threshold
                    
                    print(f"\n       🔧 Parâmetro: {pk}")
                    print(f"          - Condição: {op} {thresh}")
                    
                    # 3. Verificar sensor
                    sensor_tag = pk
                    if pk.startswith('sensor_'):
                        try:
                            sensor_id = int(pk.replace('sensor_', ''))
                            sensor = Sensor.objects.filter(id=sensor_id).select_related('device').first()
                            if sensor:
                                sensor_tag = sensor.tag
                                print(f"          - Sensor ID: {sensor_id} -> Tag: {sensor_tag}")
                                print(f"          - Device: {sensor.device.name if sensor.device else 'N/A'}")
                                print(f"          - MQTT Client ID: {sensor.device.mqtt_client_id if sensor.device else 'N/A'}")
                                
                                # 4. Verificar leituras
                                if sensor.device and sensor.device.mqtt_client_id:
                                    readings = Reading.objects.filter(
                                        device_id=sensor.device.mqtt_client_id,
                                        sensor_id=sensor_tag
                                    ).order_by('-ts')[:5]
                                    
                                    if readings.exists():
                                        print(f"          - Leituras (últimas 5):")
                                        for r in readings:
                                            age = timezone.now() - r.ts
                                            age_min = age.total_seconds() / 60
                                            fresh = "✅" if age_min < 15 else "⚠️"
                                            print(f"            {fresh} ts={r.ts}, value={r.value}, age={age_min:.1f}min")
                                    else:
                                        print(f"          ⚠️ PROBLEMA: Nenhuma leitura encontrada!")
                                        # Verificar se o sensor_id está correto
                                        alt_readings = Reading.objects.filter(
                                            device_id=sensor.device.mqtt_client_id
                                        ).order_by('-ts')[:3]
                                        if alt_readings.exists():
                                            print(f"          📍 Leituras do device (sensor_ids disponíveis):")
                                            sensor_ids = set()
                                            for r in alt_readings:
                                                sensor_ids.add(r.sensor_id)
                                            print(f"             {', '.join(sensor_ids)}")
                            else:
                                print(f"          ⚠️ PROBLEMA: Sensor ID {sensor_id} não encontrado!")
                        except ValueError:
                            print(f"          ⚠️ PROBLEMA: Formato inválido de parameter_key!")
                    else:
                        # Formato antigo - tag direto
                        sensor = Sensor.objects.filter(tag=pk).select_related('device').first()
                        if sensor:
                            print(f"          - Sensor Tag: {pk}")
                            if sensor.device and sensor.device.mqtt_client_id:
                                latest = Reading.objects.filter(
                                    device_id=sensor.device.mqtt_client_id,
                                    sensor_id=pk
                                ).order_by('-ts').first()
                                if latest:
                                    age = (timezone.now() - latest.ts).total_seconds() / 60
                                    print(f"          - Última leitura: {latest.value} (age={age:.1f}min)")
                                else:
                                    print(f"          ⚠️ PROBLEMA: Sem leituras!")
                
                # 5. Verificar alertas gerados
                alerts = Alert.objects.filter(rule=rule).order_by('-triggered_at')[:5]
                print(f"\n     📣 Alertas gerados: {Alert.objects.filter(rule=rule).count()}")
                if alerts.exists():
                    print(f"        Últimos 5:")
                    for a in alerts:
                        print(f"        - #{a.id}: {a.severity} @ {a.triggered_at} - {a.message[:50]}...")
    
    # 6. Status geral
    print(f"\n{'='*80}")
    print("RESUMO DO DIAGNÓSTICO")
    print("=" * 80)
    print("""
PRÓXIMOS PASSOS:
1. Se não há regras habilitadas -> Habilitar regras via UI ou API
2. Se não há leituras recentes -> Verificar se MQTT/EMQ X está enviando dados
3. Se há leituras mas não alertas -> Executar manualmente:
   python manage.py shell -c "from apps.alerts.tasks import evaluate_rules_task; print(evaluate_rules_task())"
4. Verificar logs do Celery Worker para erros
""")

if __name__ == '__main__':
    main()
