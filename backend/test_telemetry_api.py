#!/usr/bin/env python
"""
Script para testar a API de telemetria e ver o formato da resposta
"""
import os
import sys
import django
import json
from datetime import datetime, timedelta

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'traksense_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from django.test import RequestFactory
from apps.ingest.api_views_extended import DeviceHistoryView

def test_telemetry_api():
    """Testa a API de telemetry para ver o formato da resposta"""
    
    tenants = Tenant.objects.exclude(schema_name='public')
    
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            print(f"\n{'='*80}")
            print(f"🏢 Tenant: {tenant.schema_name}")
            print(f"{'='*80}\n")
            
            # Device ID do CHILLER-001
            device_id = "4b686f6d70107115"
            
            print(f"📡 Testando API de telemetria para device: {device_id}")
            print(f"   Endpoint: GET /api/telemetry/history/{device_id}/\n")
            
            # Criar request simulado
            factory = RequestFactory()
            
            # Teste 1: Últimas 24 horas (sem parâmetros)
            print("🧪 TESTE 1: Últimas 24 horas (padrão)")
            print("-" * 80)
            
            request = factory.get(f'/api/telemetry/history/{device_id}/')
            view = DeviceHistoryView.as_view()
            response = view(request, device_id=device_id)
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"   ✅ Sucesso!")
                print(f"   Device ID: {data.get('device_id')}")
                print(f"   Sensor ID: {data.get('sensor_id')}")
                print(f"   Interval: {data.get('interval')}")
                print(f"   From: {data.get('from')}")
                print(f"   To: {data.get('to')}")
                print(f"   Count: {data.get('count')}")
                
                if data.get('count', 0) > 0:
                    print(f"\n   📊 Amostra dos dados (primeiros 3):")
                    for i, item in enumerate(data.get('data', [])[:3]):
                        print(f"      [{i+1}] {item}")
                else:
                    print(f"\n   ⚠️  NENHUM DADO RETORNADO! (count=0)")
                    print(f"   ⚠️  Mas sabemos que há 64 readings nas últimas 24h no banco!")
                    
                # Mostrar estrutura completa da resposta
                print(f"\n   📋 Estrutura completa da resposta:")
                print(f"   {json.dumps(dict(response.data), indent=2, default=str)}")
                
            else:
                print(f"   ❌ Erro: {response.status_code}")
                print(f"   Response: {response.data}")
            
            # Teste 2: Com parâmetros explícitos (últimas 24h)
            print(f"\n{'='*80}")
            print("🧪 TESTE 2: Com parâmetros from/to explícitos")
            print("-" * 80)
            
            now = datetime.now()
            to_time = now.isoformat()
            from_time = (now - timedelta(hours=24)).isoformat()
            
            request = factory.get(
                f'/api/telemetry/history/{device_id}/?from={from_time}&to={to_time}'
            )
            response = view(request, device_id=device_id)
            
            print(f"   Status Code: {response.status_code}")
            print(f"   From: {from_time}")
            print(f"   To: {to_time}")
            
            if response.status_code == 200:
                data = response.data
                print(f"   Count: {data.get('count')}")
                print(f"   Interval: {data.get('interval')}")
                
                if data.get('count', 0) > 0:
                    print(f"\n   ✅ Dados retornados!")
                    print(f"   Amostra: {data.get('data', [])[:2]}")
                else:
                    print(f"\n   ❌ NENHUM DADO RETORNADO!")
            
            # Teste 3: Buscar dados RAW (sem agregação)
            print(f"\n{'='*80}")
            print("🧪 TESTE 3: Dados RAW (interval=raw)")
            print("-" * 80)
            
            request = factory.get(
                f'/api/telemetry/history/{device_id}/?interval=raw'
            )
            response = view(request, device_id=device_id)
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"   Count: {data.get('count')}")
                print(f"   Interval: {data.get('interval')}")
                
                if data.get('count', 0) > 0:
                    print(f"\n   ✅ Dados retornados!")
                    print(f"   Amostra (primeiros 5):")
                    for i, item in enumerate(data.get('data', [])[:5]):
                        print(f"      [{i+1}] ts={item.get('ts')}, sensor={item.get('sensor_id')}, value={item.get('value')}")
                else:
                    print(f"\n   ❌ NENHUM DADO RETORNADO!")
            
            # Teste 4: Verificar diretamente no banco via SQL
            print(f"\n{'='*80}")
            print("🧪 TESTE 4: Query SQL direta no banco")
            print("-" * 80)
            
            from django.db import connection
            
            sql = """
                SELECT COUNT(*) as count,
                       MIN(ts) as min_ts,
                       MAX(ts) as max_ts,
                       COUNT(DISTINCT sensor_id) as sensor_count
                FROM reading
                WHERE device_id = %s
                  AND ts >= NOW() - INTERVAL '24 hours'
            """
            
            with connection.cursor() as cursor:
                cursor.execute(sql, [device_id])
                result = cursor.fetchone()
                
                print(f"   Total readings (24h): {result[0]}")
                print(f"   Data mais antiga: {result[1]}")
                print(f"   Data mais recente: {result[2]}")
                print(f"   Sensores únicos: {result[3]}")
                
                if result[0] > 0:
                    print(f"\n   ✅ Há dados no banco!")
                    
                    # Buscar amostra
                    sql_sample = """
                        SELECT ts, sensor_id, value
                        FROM reading
                        WHERE device_id = %s
                          AND ts >= NOW() - INTERVAL '24 hours'
                        ORDER BY ts DESC
                        LIMIT 5
                    """
                    cursor.execute(sql_sample, [device_id])
                    samples = cursor.fetchall()
                    
                    print(f"\n   📋 Amostra dos dados no banco:")
                    for i, (ts, sensor_id, value) in enumerate(samples):
                        print(f"      [{i+1}] {ts} | {sensor_id} = {value}")

if __name__ == '__main__':
    print("="*80)
    print("🧪 TESTE DA API DE TELEMETRIA")
    print("="*80)
    test_telemetry_api()
    print("\n" + "="*80)
    print("✅ TESTES CONCLUÍDOS")
    print("="*80)
