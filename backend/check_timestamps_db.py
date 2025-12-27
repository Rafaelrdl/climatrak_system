#!/usr/bin/env python
"""
Script para verificar os timestamps armazenados no banco de dados
após receber mensagens MQTT.
"""
import os
import sys
import django
from datetime import datetime, timezone

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.ingest.models import Reading
from django.db import connection

def check_timestamps():
    """Verifica os timestamps mais recentes no banco de dados"""
    
    print("\n" + "="*80)
    print("🔍 VERIFICAÇÃO DE TIMESTAMPS NO BANCO DE DADOS")
    print("="*80)
    
    # Timestamp atual
    now = datetime.now(timezone.utc)
    print(f"\n⏰ Horário atual (UTC): {now.isoformat()}")
    print(f"   Unix timestamp: {now.timestamp()}")
    
    # Schema do tenant TrakSense
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO traksense, public;")
    
    # Verificar últimas leituras do dispositivo CHILLER-001
    device_id = 'F80332010002C873'
    
    print(f"\n📡 Últimas 10 leituras do dispositivo {device_id}:")
    print("-" * 80)
    
    readings = Reading.objects.filter(
        device_id=device_id
    ).order_by('-ts')[:10]
    
    if not readings:
        print(f"❌ Nenhuma leitura encontrada para o dispositivo {device_id}")
        return
    
    for idx, reading in enumerate(readings, 1):
        age_seconds = (now - reading.ts).total_seconds()
        age_minutes = age_seconds / 60
        
        print(f"\n{idx}. Sensor: {reading.sensor_id}")
        print(f"   Valor: {reading.value}")
        print(f"   Timestamp (UTC): {reading.ts.isoformat()}")
        print(f"   Unix timestamp: {reading.ts.timestamp()}")
        print(f"   Idade: {age_minutes:.2f} minutos ({age_seconds:.2f} segundos)")
        
        if age_minutes < 15:
            print(f"   ✅ FRESCO - Dentro da janela de 15 minutos")
        else:
            print(f"   ⚠️ ANTIGO - Fora da janela de 15 minutos")
    
    # Verificar leituras dos sensores específicos das regras
    print("\n" + "="*80)
    print("📊 SENSORES DAS REGRAS DE ALERTA")
    print("="*80)
    
    sensors_of_interest = [
        ('F80332010002C873_temperatura_saida', 'Temperatura Saída'),
        ('F80332010002C873_temperatura_retorno', 'Temperatura Retorno'),
        ('F80332010002C873_estado', 'Estado')
    ]
    
    for sensor_id, sensor_name in sensors_of_interest:
        print(f"\n🔹 {sensor_name} ({sensor_id}):")
        
        reading = Reading.objects.filter(
            device_id=device_id,
            sensor_id=sensor_id
        ).order_by('-ts').first()
        
        if reading:
            age_seconds = (now - reading.ts).total_seconds()
            age_minutes = age_seconds / 60
            
            print(f"   Valor: {reading.value}")
            print(f"   Timestamp: {reading.ts.isoformat()}")
            print(f"   Idade: {age_minutes:.2f} minutos")
            
            if age_minutes < 15:
                print(f"   ✅ FRESCO - Será avaliado pelas regras")
            else:
                print(f"   ⚠️ ANTIGO - NÃO será avaliado pelas regras")
        else:
            print(f"   ❌ Nenhuma leitura encontrada")
    
    # Query SQL para verificar timestamps diretamente
    print("\n" + "="*80)
    print("📋 QUERY SQL DIRETA")
    print("="*80)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                sensor_id,
                value,
                ts,
                EXTRACT(EPOCH FROM ts) as unix_timestamp,
                EXTRACT(EPOCH FROM (NOW() - ts)) as age_seconds
            FROM reading
            WHERE device_id = %s
            ORDER BY ts DESC
            LIMIT 5;
        """, [device_id])
        
        rows = cursor.fetchall()
        
        if rows:
            print("\nÚltimas 5 leituras (via SQL):")
            for row in rows:
                sensor_id, value, ts, unix_ts, age_secs = row
                print(f"\n  Sensor: {sensor_id}")
                print(f"  Valor: {value}")
                print(f"  Timestamp: {ts}")
                print(f"  Unix: {unix_ts}")
                print(f"  Idade: {age_secs:.2f} segundos ({age_secs/60:.2f} minutos)")
        else:
            print("\n❌ Nenhum resultado da query SQL")

if __name__ == "__main__":
    check_timestamps()
