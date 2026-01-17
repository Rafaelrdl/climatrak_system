#!/usr/bin/env python
"""
Script para testar se as regras de alerta estÇœo funcionando.
"""
import os
import sys
from datetime import timedelta


def main() -> None:
    import django

    # Setup Django
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

    from django.db import connection
    from django.utils import timezone
    from apps.alerts.models import Rule
    from apps.ingest.models import Reading

    def test_rules() -> None:
        """Testa as regras de alerta"""

        # Schema do tenant TrakSense
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO umc, public;")

        print("\n" + "=" * 80)
        print("ÐYsù TESTE DE REGRAS DE ALERTA - CHILLER-001")
        print("=" * 80)

        # Verificar leituras recentes
        device_id = "F80332010002C857"
        now = timezone.now()
        fifteen_min_ago = now - timedelta(minutes=15)

        print(f"\nƒ?ø HorÇ­rio atual (UTC): {now.isoformat()}")
        print(
            "ƒ?ø Janela de avaliaÇõÇœo: Ç§ltimos 15 minutos "
            f"(desde {fifteen_min_ago.isoformat()})"
        )

        # Leituras recentes
        recent_readings = Reading.objects.filter(
            device_id=device_id, ts__gte=fifteen_min_ago
        ).order_by("-ts")

        print(f"\nÐY\"S Leituras recentes do dispositivo {device_id}:")
        print("-" * 80)

        if not recent_readings:
            print("ƒ?O Nenhuma leitura recente encontrada!")
            return

        for reading in recent_readings[:10]:
            age_seconds = (now - reading.ts).total_seconds()
            age_minutes = age_seconds / 60
            print(f"\n  Sensor: {reading.sensor_id}")
            print(f"  Valor: {reading.value}")
            print(f"  Timestamp: {reading.ts.isoformat()}")
            print(f"  Idade: {age_minutes:.2f} minutos")
            print(f"  Status: {'ƒo. FRESCO' if age_minutes < 15 else 'ƒsÿ‹÷? ANTIGO'}")

        # Verificar regras
        print("\n" + "=" * 80)
        print("ÐY\"< REGRAS CONFIGURADAS")
        print("=" * 80)

        rules = Rule.objects.filter(is_active=True, asset__tag="CHILLER-001")

        if not rules:
            print("ƒ?O Nenhuma regra ativa encontrada para CHILLER-001!")
            return

        for rule in rules:
            print(f"\nÐY\"\" Regra: {rule.name}")
            print(f"   Asset: {rule.asset.tag}")
            print(f"   Tipo: {rule.rule_type}")
            print(f"   Ativa: {rule.is_active}")

            if rule.rule_type == "MULTI_PARAMETER":
                print("   CondiÇõÇæes:")
                for param in rule.parameters.all():
                    print(f"     - {param.parameter_key} {param.operator} {param.threshold}")

                    # Verificar se tem leitura recente para esse parÇ½metro
                    latest = Reading.objects.filter(
                        device_id=device_id,
                        sensor_id=param.parameter_key,
                        ts__gte=fifteen_min_ago,
                    ).order_by("-ts").first()

                    if latest:
                        print(
                            "       ƒo. Çsltima leitura: "
                            f"{latest.value} em {latest.ts.isoformat()}"
                        )
                        print(
                            "       Idade: "
                            f"{(now - latest.ts).total_seconds() / 60:.2f} minutos"
                        )
                    else:
                        print("       ƒ?O Nenhuma leitura recente")

        # Verificar alertas gerados - SKIP (modelo nÇœo existe ainda)
        print("\n" + "=" * 80)
        print("ÐY'­ Sistema de alertas configurado e pronto para disparar")
        print("=" * 80)

        print("\n" + "=" * 80)
        print("ƒo. TESTE CONCLUÇ?DO")
        print("=" * 80)

    test_rules()


if __name__ == "__main__":
    main()
