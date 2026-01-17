#!/usr/bin/env python
"""Testar novo endpoint /api/telemetry/assets/<asset_tag>/history/"""
from datetime import datetime, timedelta
import os


def main() -> None:
    import django
    import requests

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    os.environ["DB_HOST"] = "localhost"
    django.setup()

    from apps.accounts.models import User
    from rest_framework_simplejwt.tokens import RefreshToken

    # Obter token de autenticaÇõÇœo
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("ƒ?O Nenhum superuser encontrado!")
        raise SystemExit(1)

    token = RefreshToken.for_user(user)
    access_token = str(token.access_token)

    # Configurar headers
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Host": "umc.localhost:8000",  # Tenant UMC
    }

    base_url = "http://localhost:8000"

    # Testar novo endpoint
    print("\n" + "=" * 80)
    print("ÐYõ¦ TESTANDO NOVO ENDPOINT: /api/telemetry/assets/<asset_tag>/history/")
    print("=" * 80)

    # ParÇ½metros
    asset_tag = "CHILLER-001"
    to_time = datetime.now()
    from_time = to_time - timedelta(hours=24)

    params = {
        "from": from_time.isoformat(),
        "to": to_time.isoformat(),
        "interval": "auto",
    }

    endpoint = f"{base_url}/api/telemetry/assets/{asset_tag}/history/"
    print(f"\nÐY\"­ Endpoint: {endpoint}")
    print(f"ÐY\"< ParÇ½metros: {params}")
    print(f"ÐY\"' Token: {access_token[:20]}...")

    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=10)
        print(f"\nƒo. Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("\nÐY\"S Resposta:")
            print(f"  Asset Tag: {data.get('asset_tag')}")
            print(f"  PerÇðodo: {data.get('from')} ƒÅ' {data.get('to')}")
            print(f"  Intervalo: {data.get('interval')}")
            print(f"  Total de pontos: {data.get('count')}")

            if data.get("data"):
                print("\nÐY\"^ Primeiros 3 pontos de dados:")
                for point in data["data"][:3]:
                    sensor_id = point.get("sensor_id", "N/A")
                    ts = point.get("ts", "N/A")
                    avg_value = point.get("avg_value", point.get("value", "N/A"))
                    print(f"    ƒ?½ {sensor_id}: {avg_value} @ {ts}")
            else:
                print(
                    "\nƒsÿ‹÷?  Nenhum dado retornado (asset_tag ainda nÇœo tem "
                    "readings com o campo preenchido)"
                )
                print("   Aguarde novos dados MQTT ou force um envio de teste")
        else:
            print(f"\nƒ?O Erro: {response.status_code}")
            print(f"Resposta: {response.text[:500]}")

    except requests.exceptions.ConnectionError:
        print("\nƒ?O Erro: NÇœo foi possÇðvel conectar ao backend")
        print("   Verifique se o servidor estÇ­ rodando em http://localhost:8000")
    except Exception as exc:
        print(f"\nƒ?O Erro inesperado: {exc}")

    print("\n" + "=" * 80)
    print("ƒo. Teste concluÇðdo!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
