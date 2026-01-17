#!/usr/bin/env python
"""
Script para testar se o SensorSerializer estÇ­ retornando device_mqtt_client_id
"""
import os
import sys


def main() -> None:
    import django

    # Setup Django
    sys.path.insert(0, "/app")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "traksense_backend.settings")
    django.setup()

    from django_tenants.utils import schema_context
    from apps.tenants.models import Tenant
    from apps.assets.models import Asset, Sensor
    from apps.assets.serializers import SensorSerializer

    def test_sensor_serializer() -> None:
        """Testa se o serializer estÇ­ retornando os campos corretos"""

        tenants = Tenant.objects.exclude(schema_name="public")

        for tenant in tenants:
            with schema_context(tenant.schema_name):
                print(f"\n{'=' * 80}")
                print(f"ÐY?½ Tenant: {tenant.schema_name}")
                print(f"{'=' * 80}\n")

                # Buscar o asset CHILLER-001
                try:
                    asset = Asset.objects.get(tag="CHILLER-001")
                    print(f"ƒo. Asset encontrado: {asset.tag} (ID: {asset.id})")

                    # Buscar sensores do asset
                    sensors = Sensor.objects.filter(device__asset=asset)
                    print(f"ÐY\"S Total de sensores: {sensors.count()}\n")

                    if sensors.count() > 0:
                        print("ÐY\"< Testando SensorSerializer:\n")

                        for sensor in sensors:
                            serializer = SensorSerializer(sensor)
                            data = serializer.data

                            print(f"  Sensor: {data['tag']}")
                            print(f"    - ID: {data['id']}")
                            print(f"    - metric_type: {data['metric_type']}")
                            print(f"    - unit: {data['unit']}")
                            print(f"    - device_name: {data.get('device_name', 'N/A')}")
                            print(
                                "    - device_mqtt_client_id: "
                                f"{data.get('device_mqtt_client_id', 'ƒ?O CAMPO NÇŸO ENCONTRADO!')}"
                            )
                            print(f"    - asset_tag: {data.get('asset_tag', 'N/A')}")
                            print(f"    - is_online: {data.get('is_online', False)}")
                            print(f"    - last_value: {data.get('last_value', 'N/A')}")
                            print()

                        # Verificar se o campo device_mqtt_client_id estÇ­ presente
                        first_sensor_data = SensorSerializer(sensors.first()).data
                        if "device_mqtt_client_id" in first_sensor_data:
                            print(
                                "ƒo. Campo 'device_mqtt_client_id' PRESENTE no serializer!"
                            )
                            print(
                                f"   Valor: {first_sensor_data['device_mqtt_client_id']}"
                            )
                        else:
                            print(
                                "ƒ?O Campo 'device_mqtt_client_id' AUSENTE no serializer!"
                            )
                            print(
                                "   Campos disponÇðveis:",
                                list(first_sensor_data.keys()),
                            )
                    else:
                        print("ƒsÿ‹÷? Nenhum sensor encontrado para este asset")

                except Asset.DoesNotExist:
                    print(
                        "ƒsÿ‹÷? Asset CHILLER-001 nÇœo encontrado no tenant "
                        f"{tenant.schema_name}"
                    )

    print("=" * 80)
    print("ÐYõ¦ TESTE DO SENSOR SERIALIZER")
    print("=" * 80)
    test_sensor_serializer()
    print("\n" + "=" * 80)
    print("ƒo. TESTE CONCLUÇ?DO")
    print("=" * 80)


if __name__ == "__main__":
    main()
