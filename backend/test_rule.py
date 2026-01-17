import os


def main() -> None:
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
    django.setup()

    from django_tenants.utils import schema_context
    from apps.alerts.models import Rule, Alert
    from apps.ingest.models import Reading
    from apps.alerts.tasks import evaluate_rules_task
    from django.utils import timezone

    schema = "umc"

    with schema_context(schema):
        rule = Rule.objects.filter(name__icontains="CHILLER").first()
        if not rule:
            print("ƒ?O Regra nÇœo encontrada")
        else:
            print(f"ÐY\"< Regra: {rule.name}")
            print(f"   Equipamento: {rule.equipment.tag}")
            print(f"   Habilitada: {rule.enabled}")
            print("\nÐY\"? ParÇ½metros:")
            for param in rule.parameters.all():
                print(f"\n   - {param.parameter_key}")
                print(f"     CondiÇõÇœo: {param.operator} {param.threshold}")
                print(f"     Severidade: {param.severity}")
                device = rule.equipment.devices.first()
                if device:
                    reading = Reading.objects.filter(
                        device_id=device.mqtt_client_id,
                        sensor_id=param.parameter_key,
                    ).order_by("-ts").first()
                    if reading:
                        age = (timezone.now() - reading.ts).total_seconds() / 60
                        print(f"     Çsltima leitura: {reading.value}, Idade: {age:.1f} min")

                        # Avaliar condiÇõÇœo
                        if param.operator == ">":
                            met = reading.value > param.threshold
                        elif param.operator == "<":
                            met = reading.value < param.threshold
                        else:
                            met = False

                        print(f"     CondiÇõÇœo atendida: {'ƒo. SIM' if met else 'ƒ?O NÇŸO'}")
                    else:
                        print("     ƒsÿ‹÷? Sem leituras")

            # Verificar alertas recentes
            recent = Alert.objects.filter(
                rule=rule,
                triggered_at__gte=timezone.now() - timezone.timedelta(hours=1),
            ).count()
            print(f"\nÐY\"½ Alertas na Ç§ltima hora: {recent}")

            # Executar avaliaÇõÇœo
            print("\nÐY\"\" Executando avaliaÇõÇœo de regras...")
            evaluate_rules_task()

            # Verificar novos alertas
            new_alerts = Alert.objects.filter(
                rule=rule,
                triggered_at__gte=timezone.now() - timezone.timedelta(seconds=30),
            )
            if new_alerts.exists():
                print(f"\nƒo. Novos alertas criados: {new_alerts.count()}")
                for alert in new_alerts:
                    print(f"   - {alert.message}")
            else:
                print("\nƒsÿ‹÷? Nenhum novo alerta criado")


if __name__ == "__main__":
    main()
