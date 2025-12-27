import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule, Alert
from apps.ingest.models import Reading
from apps.alerts.tasks import evaluate_rules_task
from django.utils import timezone

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name__icontains='CHILLER').first()
    if not rule:
        print("❌ Regra não encontrada")
    else:
        print(f"📋 Regra: {rule.name}")
        print(f"   Equipamento: {rule.equipment.tag}")
        print(f"   Habilitada: {rule.enabled}")
        print(f"\n🔍 Parâmetros:")
        for param in rule.parameters.all():
            print(f"\n   - {param.parameter_key}")
            print(f"     Condição: {param.operator} {param.threshold}")
            print(f"     Severidade: {param.severity}")
            device = rule.equipment.devices.first()
            if device:
                reading = Reading.objects.filter(
                    device_id=device.mqtt_client_id,
                    sensor_id=param.parameter_key
                ).order_by('-ts').first()
                if reading:
                    age = (timezone.now() - reading.ts).total_seconds() / 60
                    print(f"     Última leitura: {reading.value}, Idade: {age:.1f} min")
                    
                    # Avaliar condição
                    if param.operator == '>':
                        met = reading.value > param.threshold
                    elif param.operator == '<':
                        met = reading.value < param.threshold
                    else:
                        met = False
                    
                    print(f"     Condição atendida: {'✅ SIM' if met else '❌ NÃO'}")
                else:
                    print(f"     ⚠️ Sem leituras")
        
        # Verificar alertas recentes
        recent = Alert.objects.filter(
            rule=rule,
            triggered_at__gte=timezone.now() - timezone.timedelta(hours=1)
        ).count()
        print(f"\n📢 Alertas na última hora: {recent}")
        
        # Executar avaliação
        print(f"\n🔄 Executando avaliação de regras...")
        evaluate_rules_task()
        
        # Verificar novos alertas
        new_alerts = Alert.objects.filter(
            rule=rule,
            triggered_at__gte=timezone.now() - timezone.timedelta(seconds=30)
        )
        if new_alerts.exists():
            print(f"\n✅ Novos alertas criados: {new_alerts.count()}")
            for alert in new_alerts:
                print(f"   - {alert.message}")
        else:
            print(f"\n⚠️ Nenhum novo alerta criado")
