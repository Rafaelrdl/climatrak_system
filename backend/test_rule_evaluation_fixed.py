#!/usr/bin/env python
import os
from datetime import timedelta


def main() -> None:
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

    from django_tenants.utils import schema_context
    from apps.alerts.models import Rule, RuleParameter, Alert
    from apps.assets.models import Sensor
    from apps.ingest.models import Reading
    from django.utils import timezone

    schema = "umc"

    with schema_context(schema):
        print("=" * 80)
        print("ÐYõ¦ TESTE COMPLETO: AvaliaÇõÇœo de Regra com CorreÇõÇœo")
        print("=" * 80)

        # Buscar a regra
        rule = Rule.objects.filter(name="Alerta CHILLER-001").first()

        if not rule:
            print("\nƒ?O Regra nÇœo encontrada!")
            raise SystemExit(1)

        print(f"\nÐY\"< Regra: {rule.name}")
        print(f"   Equipment: {rule.equipment.name} (tag: {rule.equipment.tag})")

        # Buscar o device
        device = rule.equipment.devices.first()

        if not device:
            print("\nƒ?O Device nÇœo encontrado!")
            raise SystemExit(1)

        print("\nÐY\"ñ Device:")
        print(f"   Nome: {device.name}")
        print(f"   MQTT Client ID: {device.mqtt_client_id}")

        # Buscar parÇ½metros
        params = RuleParameter.objects.filter(rule=rule).order_by("order")

        print(f"\nƒsT‹÷?  ParÇ½metros da Regra ({params.count()}):")

        results = {
            "total": params.count(),
            "conditions_met": 0,
            "no_data": 0,
            "old_data": 0,
            "condition_not_met": 0,
        }

        for param in params:
            print(f"\n   {'=' * 70}")
            print(f"   ÐY\"O ParÇ½metro {param.order + 1}:")
            print(f"      parameter_key: {param.parameter_key}")
            print(f"      CondiÇõÇœo: {param.operator} {param.threshold}")

            # 1. Resolver sensor_tag
            sensor_tag = param.parameter_key
            if param.parameter_key.startswith("sensor_"):
                try:
                    sensor_id = int(param.parameter_key.replace("sensor_", ""))
                    sensor = Sensor.objects.filter(pk=sensor_id).first()
                    if sensor:
                        sensor_tag = sensor.tag
                        print(
                            f"      ƒo. Sensor ID {sensor_id} ƒÅ' sensor_tag: "
                            f"{sensor_tag}"
                        )
                    else:
                        print(f"      ƒ?O Sensor ID {sensor_id} nÇœo encontrado!")
                        results["no_data"] += 1
                        continue
                except ValueError:
                    print("      ƒ?O Erro ao parsear sensor ID!")
                    results["no_data"] += 1
                    continue

            # 2. Buscar reading
            cutoff = timezone.now() - timedelta(minutes=15)

            print("\n      ÐY\"S Buscando readings:")
            print(f"         device_id: {device.mqtt_client_id}")
            print(f"         sensor_id: {sensor_tag}")
            print(f"         ts >= {cutoff.strftime('%H:%M:%S')}")

            latest_reading = Reading.objects.filter(
                device_id=device.mqtt_client_id,
                sensor_id=sensor_tag,
                ts__gte=cutoff,
            ).order_by("-ts").first()

            if not latest_reading:
                print("      ƒ?O Nenhuma reading encontrada (Ç§ltimos 15 min)")
                results["no_data"] += 1

                # Buscar qualquer reading deste sensor
                any_reading = Reading.objects.filter(
                    device_id=device.mqtt_client_id,
                    sensor_id=sensor_tag,
                ).order_by("-ts").first()

                if any_reading:
                    age = timezone.now() - any_reading.ts
                    print(
                        "         Çsltima reading: "
                        f"{any_reading.value} hÇ­ {age.seconds // 60} min"
                    )
                    results["old_data"] += 1
                continue

            # 3. Avaliar condiÇõÇœo
            value = float(latest_reading.value)
            threshold = float(param.threshold)

            print("\n      ƒo. Reading encontrada:")
            print(f"         Valor: {value}")
            print(f"         Timestamp: {latest_reading.ts.strftime('%H:%M:%S')}")

            # Avaliar
            if param.operator == ">":
                condition_met = value > threshold
            elif param.operator == "<":
                condition_met = value < threshold
            elif param.operator == ">=":
                condition_met = value >= threshold
            elif param.operator == "<=":
                condition_met = value <= threshold
            elif param.operator == "==":
                condition_met = value == threshold
            else:
                condition_met = False

            print(f"\n      ÐYZî AvaliaÇõÇœo: {value} {param.operator} {threshold}")

            if condition_met:
                print("      ƒo. CONDIÇÎÇŸO ATENDIDA!")
                results["conditions_met"] += 1

                # Verificar se jÇ­ existe alerta recente
                cooldown_period = timedelta(minutes=param.duration)
                last_alert = Alert.objects.filter(
                    rule=rule,
                    parameter_key=param.parameter_key,
                    triggered_at__gte=timezone.now() - cooldown_period,
                ).first()

                if last_alert:
                    print(
                        "      ƒ?ñ‹÷?  Em cooldown "
                        f"(Ç§ltimo alerta: {last_alert.triggered_at.strftime('%H:%M:%S')})"
                    )
                else:
                    print("      ÐYsù ALERTA SERIA DISPARADO!")
            else:
                print("      ƒ?O CondiÇõÇœo nÇœo atendida")
                results["condition_not_met"] += 1

        # Resumo
        print(f"\n\n" + "=" * 80)
        print("ÐY\"S RESUMO DO TESTE")
        print("=" * 80)
        print(f"   Total de parÇ½metros: {results['total']}")
        print(f"   ƒo. CondiÇõÇæes atendidas: {results['conditions_met']}")
        print(f"   ƒ?O CondiÇõÇæes nÇœo atendidas: {results['condition_not_met']}")
        print(f"   ƒsÿ‹÷?  Sem dados recentes: {results['no_data']}")
        print(f"   ƒ?ø Dados antigos (>15 min): {results['old_data']}")

        if results["conditions_met"] > 0:
            print("\n   ÐYZ% SUCESSO! A correÇõÇœo funcionou!")
            print(
                f"   {results['conditions_met']} parÇ½metro(s) atendendo condiÇõÇæes."
            )
            print(
                "\n   ƒ?ñ‹÷?  Aguarde atÇ¸ 5 minutos para o Celery avaliar automaticamente,"
            )
            print(
                "   ou verifique os logs do scheduler: docker logs traksense-scheduler"
            )
        else:
            print("\n   ƒsÿ‹÷?  Nenhuma condiÇõÇœo atendida no momento.")

        print("\n")


if __name__ == "__main__":
    main()
