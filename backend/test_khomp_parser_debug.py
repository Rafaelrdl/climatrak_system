#!/usr/bin/env python
"""
Script de debug para testar se o parser Khomp estÇ­ funcionando.
"""
import os
import sys
import json


def main() -> None:
    import django

    # Configurar Django
    sys.path.insert(0, os.path.dirname(__file__))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    os.environ["DB_HOST"] = "localhost"
    django.setup()

    from apps.ingest.parsers.khomp_senml import KhompSenMLParser

    print("=" * 80)
    print("ÐYõ¦ TESTE: Parser Khomp SenML")
    print("=" * 80)

    # Payload EXATO que o gateway envia
    payload_real = [
        {"bn": "F80332010002C857", "bt": 1762301178},
        {"n": "rssi", "u": "dBW", "v": -54},
        {"n": "snr", "u": "dB", "v": 13.8},
        {"n": "model", "vs": "nit21li"},
        {"n": "Temperatura de retorno", "u": "Cel", "v": 31.14},
        {"n": "Humidade ambiente", "u": "%RH", "v": 56.7},
        {"n": "Temperatura de saida", "u": "Cel", "v": 19.87},
        {"n": "gateway", "vs": "F8033202CB040000"},
    ]

    # Estrutura como viria do EMQX
    data_from_emqx = {
        "client_id": "khomp-gateway",
        "topic": "tenants/umc/sites/UberlÇ½ndia Medical Center/assets/CHILLER-001/telemetry",
        "payload": payload_real,
        "qos": 0,
        "ts": 1762301178000,
    }

    print("\nÐY\"Ý Payload recebido:")
    print(json.dumps(data_from_emqx, indent=2, ensure_ascii=False))

    # Instanciar parser
    parser = KhompSenMLParser()

    print("\n" + "=" * 80)
    print("1‹÷?ƒŸœ TESTE: can_parse()")
    print("=" * 80)

    topic = data_from_emqx["topic"]
    can_parse = parser.can_parse(data_from_emqx, topic)

    print(f"\nƒo\" Parser reconhece formato: {can_parse}")

    if not can_parse:
        print("\nƒ?O ERRO: Parser NÇŸO reconheceu o formato!")
        print("   Verificando estrutura...")

        # Debug: verificar payload
        payload = data_from_emqx.get("payload")
        print(f"   - Payload Ç¸ lista: {isinstance(payload, list)}")
        if isinstance(payload, list):
            print(f"   - Tamanho: {len(payload)}")
            if len(payload) > 0:
                first = payload[0]
                print(f"   - Primeiro elemento: {first}")
                print(f"   - Tem 'bn': {'bn' in first}")
                print(f"   - Tem 'bt': {'bt' in first}")
        raise SystemExit(1)

    print("\n" + "=" * 80)
    print("2‹÷?ƒŸœ TESTE: parse()")
    print("=" * 80)

    try:
        parsed = parser.parse(data_from_emqx, topic)
        print("\nƒo. Payload parseado com sucesso!")
        print("\nÐY\"S Resultado:")
        print(json.dumps(parsed, indent=2, default=str, ensure_ascii=False))

        print("\nÐY\"^ EstatÇðsticas:")
        print(f"   - Device ID: {parsed.get('device_id')}")
        print(f"   - Timestamp: {parsed.get('timestamp')}")
        print(f"   - NÇ§mero de sensores: {len(parsed.get('sensors', []))}")

        if "metadata" in parsed:
            print("\nÐY?ú‹÷? Metadata:")
            for key, value in parsed["metadata"].items():
                print(f"   - {key}: {value}")

        print("\nÐYO­‹÷? Sensores parseados:")
        for sensor in parsed.get("sensors", []):
            print(
                f"   - {sensor['sensor_id']}: {sensor['value']} "
                f"{sensor.get('labels', {}).get('unit', '')}"
            )

        print("\nƒo. TESTE COMPLETO: Parser estÇ­ funcionando corretamente!")

    except Exception as exc:
        print(f"\nƒ?O ERRO ao parsear: {exc}")
        import traceback

        traceback.print_exc()
        raise SystemExit(1)

    print("\n" + "=" * 80)
    print("ƒo. TODOS OS TESTES PASSARAM!")
    print("=" * 80)


if __name__ == "__main__":
    main()
