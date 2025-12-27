#!/usr/bin/env python
"""
Script de debug para testar se o parser Khomp está funcionando.
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
os.environ['DB_HOST'] = 'localhost'
django.setup()

from apps.ingest.parsers.khomp_senml import KhompSenMLParser
import json

print("=" * 80)
print("🧪 TESTE: Parser Khomp SenML")
print("=" * 80)

# Payload EXATO que o gateway envia
payload_real = [
  {
    "bn": "F80332010002C857",
    "bt": 1762301178
  },
  {
    "n": "rssi",
    "u": "dBW",
    "v": -54
  },
  {
    "n": "snr",
    "u": "dB",
    "v": 13.8
  },
  {
    "n": "model",
    "vs": "nit21li"
  },
  {
    "n": "Temperatura de retorno",
    "u": "Cel",
    "v": 31.14
  },
  {
    "n": "Humidade ambiente",
    "u": "%RH",
    "v": 56.7
  },
  {
    "n": "Temperatura de saida",
    "u": "Cel",
    "v": 19.87
  },
  {
    "n": "gateway",
    "vs": "F8033202CB040000"
  }
]

# Estrutura como viria do EMQX
data_from_emqx = {
    'client_id': 'khomp-gateway',
    'topic': 'tenants/umc/sites/Uberlândia Medical Center/assets/CHILLER-001/telemetry',
    'payload': payload_real,
    'qos': 0,
    'ts': 1762301178000
}

print("\n📦 Payload recebido:")
print(json.dumps(data_from_emqx, indent=2, ensure_ascii=False))

# Instanciar parser
parser = KhompSenMLParser()

print("\n" + "=" * 80)
print("1️⃣ TESTE: can_parse()")
print("=" * 80)

topic = data_from_emqx['topic']
can_parse = parser.can_parse(data_from_emqx, topic)

print(f"\n✓ Parser reconhece formato: {can_parse}")

if not can_parse:
    print("\n❌ ERRO: Parser NÃO reconheceu o formato!")
    print("   Verificando estrutura...")
    
    # Debug: verificar payload
    payload = data_from_emqx.get('payload')
    print(f"   - Payload é lista: {isinstance(payload, list)}")
    if isinstance(payload, list):
        print(f"   - Tamanho: {len(payload)}")
        if len(payload) > 0:
            first = payload[0]
            print(f"   - Primeiro elemento: {first}")
            print(f"   - Tem 'bn': {'bn' in first}")
            print(f"   - Tem 'bt': {'bt' in first}")
    sys.exit(1)

print("\n" + "=" * 80)
print("2️⃣ TESTE: parse()")
print("=" * 80)

try:
    parsed = parser.parse(data_from_emqx, topic)
    print("\n✅ Payload parseado com sucesso!")
    print(f"\n📊 Resultado:")
    print(json.dumps(parsed, indent=2, default=str, ensure_ascii=False))
    
    print(f"\n📈 Estatísticas:")
    print(f"   - Device ID: {parsed.get('device_id')}")
    print(f"   - Timestamp: {parsed.get('timestamp')}")
    print(f"   - Número de sensores: {len(parsed.get('sensors', []))}")
    
    if 'metadata' in parsed:
        print(f"\n🏷️ Metadata:")
        for key, value in parsed['metadata'].items():
            print(f"   - {key}: {value}")
    
    print(f"\n🌡️ Sensores parseados:")
    for sensor in parsed.get('sensors', []):
        print(f"   - {sensor['sensor_id']}: {sensor['value']} {sensor.get('labels', {}).get('unit', '')}")
    
    print("\n✅ TESTE COMPLETO: Parser está funcionando corretamente!")
    
except Exception as e:
    print(f"\n❌ ERRO ao parsear: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 80)
print("✅ TODOS OS TESTES PASSARAM!")
print("=" * 80)
