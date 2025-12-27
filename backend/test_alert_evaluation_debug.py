"""
Script para testar manualmente a avaliação de regras de alerta
e identificar por que os alertas não estão sendo disparados.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.utils import timezone
from datetime import timedelta
from django_tenants.utils import schema_context
from apps.alerts.models import Rule, RuleParameter
from apps.ingest.models import Reading
from apps.assets.models import Sensor

def test_alert_evaluation():
    print("\n" + "="*80)
    print("🔍 TESTE DE AVALIAÇÃO DE ALERTAS - CHILLER-001")
    print("="*80 + "\n")
    
    # Usar contexto do tenant umc
    with schema_context('umc'):
        # 1. Verificar regra
        try:
            rule = Rule.objects.get(id=11)
            print(f"✅ Regra encontrada: {rule.name} (ID: {rule.id})")
            print(f"   Equipment: {rule.equipment.tag} (ID: {rule.equipment_id})")
            print(f"   Enabled: {rule.enabled}")
        except Rule.DoesNotExist:
            print("❌ Regra ID 11 não encontrada!")
            return
    
    # 2. Verificar parâmetros
    parameters = RuleParameter.objects.filter(rule=rule).order_by('id')
    print(f"\n📊 Parâmetros da regra ({parameters.count()}):")
    
    for param in parameters:
        print(f"\n   Parâmetro #{param.id}:")
        print(f"   - parameter_key: {param.parameter_key}")
        print(f"   - operator: {param.operator}")
        print(f"   - threshold: {param.threshold}")
        print(f"   - duration: {param.duration} minutos")
        print(f"   - severity: {param.severity}")
        
        # 3. Buscar sensor
        try:
            sensor = Sensor.objects.select_related('device').get(tag=param.parameter_key)
            print(f"   ✅ Sensor encontrado: {sensor.tag}")
            print(f"      Device: {sensor.device.mqtt_client_id} (ID: {sensor.device_id})")
        except Sensor.DoesNotExist:
            print(f"   ❌ Sensor não encontrado com tag: {param.parameter_key}")
            continue
        
        # 4. Buscar última leitura
        latest_reading = Reading.objects.filter(
            device_id=sensor.device.mqtt_client_id,
            sensor_id=param.parameter_key
        ).order_by('-ts').first()
        
        if not latest_reading:
            print(f"   ❌ Nenhuma leitura encontrada!")
            continue
        
        print(f"   ✅ Última leitura encontrada:")
        print(f"      Valor: {latest_reading.value}")
        print(f"      Timestamp: {latest_reading.ts}")
        print(f"      Timezone: {latest_reading.ts.tzinfo}")
        
        # 5. Verificar se a leitura é recente
        now = timezone.now()
        if latest_reading.ts.tzinfo:
            now_in_reading_tz = now.astimezone(latest_reading.ts.tzinfo)
            time_diff = now_in_reading_tz - latest_reading.ts
        else:
            now_in_reading_tz = now
            time_diff = now - latest_reading.ts
        
        age_minutes = time_diff.total_seconds() / 60
        is_fresh = time_diff <= timedelta(minutes=15)
        
        print(f"      Idade: {age_minutes:.1f} minutos")
        print(f"      Status: {'✅ FRESCA' if is_fresh else '❌ ANTIGA'} (limite: 15 min)")
        
        if not is_fresh:
            print(f"      ⚠️ Leitura muito antiga, alerta NÃO será disparado")
            continue
        
        # 6. Avaliar condição
        value = latest_reading.value
        threshold = param.threshold
        operator = param.operator
        
        print(f"\n   🎯 Avaliação da condição:")
        print(f"      {value} {operator} {threshold}")
        
        if operator == '>':
            condition_met = value > threshold
        elif operator == '>=':
            condition_met = value >= threshold
        elif operator == '<':
            condition_met = value < threshold
        elif operator == '<=':
            condition_met = value <= threshold
        elif operator == '==':
            condition_met = value == threshold
        elif operator == '!=':
            condition_met = value != threshold
        else:
            print(f"      ❌ Operador desconhecido: {operator}")
            continue
        
        if condition_met:
            print(f"      ✅ CONDIÇÃO ATENDIDA! Alerta DEVERIA ser disparado!")
        else:
            print(f"      ❌ Condição NÃO atendida, alerta não será disparado")
    
        print("\n" + "="*80)
        print("✅ Teste concluído")
        print("="*80 + "\n")

if __name__ == '__main__':
    test_alert_evaluation()
