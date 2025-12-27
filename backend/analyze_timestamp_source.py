#!/usr/bin/env python
"""
Script para analisar de onde vem o timestamp e comparar EMQX vs SenML
"""
import os
import sys
import django
from datetime import datetime, timezone

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.ingest.models import Telemetry
from django.db import connection

def analyze_timestamps():
    """Analisa os timestamps de mensagens recentes"""
    
    print("\n" + "="*80)
    print("🔍 ANÁLISE DE TIMESTAMPS - EMQX vs SenML")
    print("="*80)
    
    # Schema do tenant TrakSense
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO traksense, public;")
    
    # Pegar últimas mensagens de telemetria
    device_id = 'F80332010002C873'
    
    telemetries = Telemetry.objects.filter(
        device_id=device_id
    ).order_by('-created_at')[:5]
    
    if not telemetries:
        print(f"❌ Nenhuma telemetria encontrada para {device_id}")
        return
    
    print(f"\n📡 Últimas 5 mensagens de telemetria do dispositivo {device_id}:\n")
    
    for idx, telem in enumerate(telemetries, 1):
        print(f"\n{'='*80}")
        print(f"Mensagem #{idx} - ID: {telem.id}")
        print('='*80)
        
        # Parse do payload
        import json
        try:
            if isinstance(telem.raw_payload, str):
                payload = json.loads(telem.raw_payload)
            else:
                payload = telem.raw_payload
            
            # Extrair timestamps
            emqx_ts = payload.get('ts')  # Timestamp do EMQX
            senml_data = payload.get('payload', [])
            
            print(f"\n⏰ TIMESTAMP DO EMQX:")
            if emqx_ts:
                emqx_dt = datetime.fromtimestamp(emqx_ts / 1000.0, tz=timezone.utc)
                print(f"   ts (ms): {emqx_ts}")
                print(f"   Convertido: {emqx_dt.isoformat()}")
                print(f"   Data/Hora: {emqx_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}")
            else:
                print("   ❌ Não encontrado")
            
            print(f"\n📊 TIMESTAMP DO EQUIPAMENTO (SenML bt):")
            if isinstance(senml_data, list) and len(senml_data) > 0:
                base_element = senml_data[0]
                bt = base_element.get('bt')  # Base time em segundos
                
                if bt:
                    bt_dt = datetime.fromtimestamp(bt, tz=timezone.utc)
                    print(f"   bt (s): {bt}")
                    print(f"   Convertido: {bt_dt.isoformat()}")
                    print(f"   Data/Hora: {bt_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}")
                    
                    # Calcular diferença
                    if emqx_ts:
                        diff_seconds = (emqx_ts / 1000.0) - bt
                        diff_hours = diff_seconds / 3600
                        print(f"\n⚠️ DIFERENÇA:")
                        print(f"   {diff_seconds:.2f} segundos")
                        print(f"   {diff_hours:.2f} horas")
                        
                        if abs(diff_hours) >= 2:
                            print(f"   🔴 PROBLEMA: Diferença de {diff_hours:.1f} horas!")
                            print(f"   Possível causa: Timezone ou clock desajustado")
                else:
                    print("   ❌ Campo 'bt' não encontrado no SenML")
            else:
                print("   ❌ Payload SenML inválido")
            
            print(f"\n📝 Payload completo:")
            print(json.dumps(payload, indent=2))
            
        except Exception as e:
            print(f"❌ Erro ao processar payload: {e}")
    
    print("\n" + "="*80)
    print("💡 RECOMENDAÇÕES")
    print("="*80)
    print("""
1. Se a diferença for ~3 horas:
   - Problema de timezone (EMQX está em UTC, equipamento em UTC-3)
   - Solução: Usar bt (base time) do SenML em vez de ts do EMQX

2. Se timestamps são próximos:
   - Sistema está funcionando corretamente
   - Investigar por que readings aparecem antigas

3. Para corrigir:
   - Modificar views.py para usar bt do payload SenML
   - Não usar ts do EMQX como base de tempo
""")

if __name__ == "__main__":
    analyze_timestamps()
