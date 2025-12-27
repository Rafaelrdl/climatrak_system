#!/usr/bin/env python
"""Testar novo endpoint /api/telemetry/assets/<asset_tag>/history/"""
import os
import django
import requests
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
os.environ['DB_HOST'] = 'localhost'
django.setup()

from apps.accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken

# Obter token de autenticação
user = User.objects.filter(is_superuser=True).first()
if not user:
    print("❌ Nenhum superuser encontrado!")
    exit(1)

token = RefreshToken.for_user(user)
access_token = str(token.access_token)

# Configurar headers
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json',
    'Host': 'umc.localhost:8000',  # Tenant UMC
}

base_url = 'http://localhost:8000'

# Testar novo endpoint
print("\n" + "=" * 80)
print("🧪 TESTANDO NOVO ENDPOINT: /api/telemetry/assets/<asset_tag>/history/")
print("=" * 80)

# Parâmetros
asset_tag = 'CHILLER-001'
to_time = datetime.now()
from_time = to_time - timedelta(hours=24)

params = {
    'from': from_time.isoformat(),
    'to': to_time.isoformat(),
    'interval': 'auto'
}

endpoint = f'{base_url}/api/telemetry/assets/{asset_tag}/history/'
print(f"\n📡 Endpoint: {endpoint}")
print(f"📋 Parâmetros: {params}")
print(f"🔑 Token: {access_token[:20]}...")

try:
    response = requests.get(endpoint, headers=headers, params=params, timeout=10)
    print(f"\n✅ Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n📊 Resposta:")
        print(f"  Asset Tag: {data.get('asset_tag')}")
        print(f"  Período: {data.get('from')} → {data.get('to')}")
        print(f"  Intervalo: {data.get('interval')}")
        print(f"  Total de pontos: {data.get('count')}")
        
        if data.get('data'):
            print(f"\n📈 Primeiros 3 pontos de dados:")
            for point in data['data'][:3]:
                sensor_id = point.get('sensor_id', 'N/A')
                ts = point.get('ts', 'N/A')
                avg_value = point.get('avg_value', point.get('value', 'N/A'))
                print(f"    • {sensor_id}: {avg_value} @ {ts}")
        else:
            print("\n⚠️  Nenhum dado retornado (asset_tag ainda não tem readings com o campo preenchido)")
            print("   Aguarde novos dados MQTT ou force um envio de teste")
    else:
        print(f"\n❌ Erro: {response.status_code}")
        print(f"Resposta: {response.text[:500]}")
        
except requests.exceptions.ConnectionError:
    print("\n❌ Erro: Não foi possível conectar ao backend")
    print("   Verifique se o servidor está rodando em http://localhost:8000")
except Exception as e:
    print(f"\n❌ Erro inesperado: {e}")

print("\n" + "=" * 80)
print("✅ Teste concluído!")
print("=" * 80 + "\n")
