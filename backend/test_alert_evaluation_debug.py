"""
Script para testar manualmente a avaliaÇõÇœo de regras de alerta
e identificar por que os alertas nÇœo estÇœo sendo disparados.
"""
import os


def main() -> None:
    import django
    from datetime import timedelta

    # Setup Django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    django.setup()

    from django.utils import timezone
    from django_tenants.utils import schema_context
    from apps.alerts.models import Rule, RuleParameter
    from apps.ingest.models import Reading
    from apps.assets.models import Sensor

    def test_alert_evaluation() -> None:
        print("\n" + "=" * 80)
        print("ÐY\"? TESTE DE AVALIAÇÎÇŸO DE ALERTAS - CHILLER-001")
        print("=" * 80 + "\n")

        # Usar contexto do tenant umc
        with schema_context("umc"):
            # 1. Verificar regra
            try:
                rule = Rule.objects.get(id=11)
                print(f"ƒo. Regra encontrada: {rule.name} (ID: {rule.id})")
                print(
                    f"   Equipment: {rule.equipment.tag} (ID: {rule.equipment_id})"
                )
                print(f"   Enabled: {rule.enabled}")
            except Rule.DoesNotExist:
                print("ƒ?O Regra ID 11 nÇœo encontrada!")
                return

        # 2. Verificar parÇ½metros
        parameters = RuleParameter.objects.filter(rule=rule).order_by("id")
        print(f"\nÐY\"S ParÇ½metros da regra ({parameters.count()}):")

        for param in parameters:
            print(f"\n   ParÇ½metro #{param.id}:")
            print(f"   - parameter_key: {param.parameter_key}")
            print(f"   - operator: {param.operator}")
            print(f"   - threshold: {param.threshold}")
            print(f"   - duration: {param.duration} minutos")
            print(f"   - severity: {param.severity}")

            # 3. Buscar sensor
            try:
                sensor = Sensor.objects.select_related("device").get(
                    tag=param.parameter_key
                )
                print(f"   ƒo. Sensor encontrado: {sensor.tag}")
                print(
                    f"      Device: {sensor.device.mqtt_client_id} "
                    f"(ID: {sensor.device_id})"
                )
            except Sensor.DoesNotExist:
                print(f"   ƒ?O Sensor nÇœo encontrado com tag: {param.parameter_key}")
                continue

            # 4. Buscar Ç§ltima leitura
            latest_reading = Reading.objects.filter(
                device_id=sensor.device.mqtt_client_id,
                sensor_id=param.parameter_key,
            ).order_by("-ts").first()

            if not latest_reading:
                print("   ƒ?O Nenhuma leitura encontrada!")
                continue

            print("   ƒo. Çsltima leitura encontrada:")
            print(f"      Valor: {latest_reading.value}")
            print(f"      Timestamp: {latest_reading.ts}")
            print(f"      Timezone: {latest_reading.ts.tzinfo}")

            # 5. Verificar se a leitura Ç¸ recente
            now = timezone.now()
            if latest_reading.ts.tzinfo:
                now_in_reading_tz = now.astimezone(latest_reading.ts.tzinfo)
                time_diff = now_in_reading_tz - latest_reading.ts
            else:
                time_diff = now - latest_reading.ts

            age_minutes = time_diff.total_seconds() / 60
            is_fresh = time_diff <= timedelta(minutes=15)

            print(f"      Idade: {age_minutes:.1f} minutos")
            print(
                "      Status: "
                f"{'ƒo. FRESCA' if is_fresh else 'ƒ?O ANTIGA'} (limite: 15 min)"
            )

            if not is_fresh:
                print("      ƒsÿ‹÷? Leitura muito antiga, alerta NÇŸO serÇ­ disparado")
                continue

            # 6. Avaliar condiÇõÇœo
            value = latest_reading.value
            threshold = param.threshold
            operator = param.operator

            print("\n   ÐYZî AvaliaÇõÇœo da condiÇõÇœo:")
            print(f"      {value} {operator} {threshold}")

            if operator == ">":
                condition_met = value > threshold
            elif operator == ">=":
                condition_met = value >= threshold
            elif operator == "<":
                condition_met = value < threshold
            elif operator == "<=":
                condition_met = value <= threshold
            elif operator == "==":
                condition_met = value == threshold
            elif operator == "!=":
                condition_met = value != threshold
            else:
                print(f"      ƒ?O Operador desconhecido: {operator}")
                continue

            if condition_met:
                print(
                    "      ƒo. CONDIÇÎÇŸO ATENDIDA! "
                    "Alerta DEVERIA ser disparado!"
                )
            else:
                print(
                    "      ƒ?O CondiÇõÇœo NÇŸO atendida, "
                    "alerta nÇœo serÇ­ disparado"
                )

        print("\n" + "=" * 80)
        print("ƒo. Teste concluÇðdo")
        print("=" * 80 + "\n")

    test_alert_evaluation()


if __name__ == "__main__":
    main()
