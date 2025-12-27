import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule, Alert
from apps.assets.models import Sensor
from apps.ingest.models import Reading
from apps.alerts.tasks import evaluate_condition, generate_alert_message_from_template
from django.utils import timezone
from datetime import timedelta

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name__icontains='CHILLER').first()
    
    print(f"📋 Regra: {rule.name}")
    print(f"   Equipamento: {rule.equipment.tag}\n")
    
    parameters = rule.parameters.all()
    
    # Prefetch sensors (como faz a task)
    sensor_tags = [param.parameter_key for param in parameters]
    sensors_dict = {
        sensor.tag: sensor 
        for sensor in Sensor.objects.filter(tag__in=sensor_tags).select_related('device')
    }
    
    print(f"📊 Sensores carregados: {len(sensors_dict)}")
    for tag, sensor in sensors_dict.items():
        print(f"   - {tag} → Device: {sensor.device.mqtt_client_id}")
    
    print(f"\n🔍 Avaliando parâmetros:\n")
    
    for param in parameters:
        print(f"Parâmetro: {param.parameter_key}")
        print(f"Condição: {param.operator} {param.threshold}")
        
        # Buscar sensor (como na task)
        sensor_obj = sensors_dict.get(param.parameter_key)
        
        if not sensor_obj or not sensor_obj.device:
            print(f"   ❌ Sensor ou device não encontrado\n")
            continue
        
        device = sensor_obj.device
        print(f"   Device: {device.mqtt_client_id}")
        
        # Buscar leitura (como na task)
        latest_reading = Reading.objects.filter(
            device_id=device.mqtt_client_id,
            sensor_id=param.parameter_key
        ).order_by('-ts').first()
        
        if not latest_reading:
            print(f"   ❌ Nenhuma leitura encontrada")
            print(f"      Buscando: device_id='{device.mqtt_client_id}', sensor_id='{param.parameter_key}'\n")
            continue
        
        age_minutes = (timezone.now() - latest_reading.ts).total_seconds() / 60
        print(f"   ✅ Leitura encontrada:")
        print(f"      Valor: {latest_reading.value}")
        print(f"      Idade: {age_minutes:.1f} min")
        
        # Verificar se está muito antiga (>15 min)
        if latest_reading.ts < timezone.now() - timedelta(minutes=15):
            print(f"   ⚠️ Leitura muito antiga (> 15 min)\n")
            continue
        
        # Avaliar condição
        value = latest_reading.value
        condition_met = evaluate_condition(value, param.operator, param.threshold)
        
        print(f"\n   🎯 Avaliação: {value} {param.operator} {param.threshold}")
        print(f"      Resultado: {'✅ ATENDIDA' if condition_met else '❌ NÃO atendida'}")
        
        if condition_met:
            # Verificar cooldown
            cooldown_period = timedelta(minutes=param.duration)
            last_alert = Alert.objects.filter(
                rule=rule,
                parameter_key=param.parameter_key,
                triggered_at__gte=timezone.now() - cooldown_period
            ).first()
            
            if last_alert:
                print(f"      ⏱️ Em cooldown (último alerta: {last_alert.triggered_at})")
            else:
                print(f"      🚨 DEVE GERAR ALERTA!")
                
                # Gerar mensagem
                message = generate_alert_message_from_template(
                    param.message_template,
                    param,
                    latest_reading,
                    value
                )
                print(f"      Mensagem: {message}")
        
        print()
