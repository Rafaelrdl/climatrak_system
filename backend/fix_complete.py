#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.assets.models import Asset
from apps.ingest.models import Reading
from apps.alerts.models import Rule, RuleParameter
from django.utils import timezone
from datetime import timedelta

schema='umc'

with schema_context(schema):
    print("=" * 70)
    print("🔧 CORREÇÃO AUTOMÁTICA - Equipment Tag e Sugestão de Sensores")
    print("=" * 70)
    
    # 1. Atualizar Equipment Tag
    print("\n📝 PASSO 1: Atualizando Equipment Tag")
    print("-" * 70)
    
    asset = Asset.objects.filter(tag='CHILLER-001').first()
    
    if asset:
        print(f"✅ Equipamento encontrado: {asset.name}")
        print(f"   Tag ANTIGA: {asset.tag}")
        
        # Atualizar tag
        asset.tag = '4b686f6d70107115'
        asset.save()
        
        asset.refresh_from_db()
        print(f"   Tag NOVA: {asset.tag}")
        print(f"   ✅ Atualizado com sucesso!")
    else:
        print("❌ Equipamento não encontrado!")
        exit(1)
    
    # 2. Listar sensores disponíveis
    print("\n\n📡 PASSO 2: Sensores Disponíveis (últimos 30 min)")
    print("-" * 70)
    
    cutoff = timezone.now() - timedelta(minutes=30)
    
    sensors = Reading.objects.filter(
        device_id='4b686f6d70107115',
        ts__gte=cutoff
    ).values('sensor_id').distinct()
    
    sensor_data = []
    
    for s in sensors:
        last = Reading.objects.filter(
            device_id='4b686f6d70107115',
            sensor_id=s['sensor_id']
        ).order_by('-ts').first()
        
        if last:
            sensor_data.append({
                'id': s['sensor_id'],
                'value': last.value,
                'ts': last.ts
            })
    
    # Ordenar por sensor_id
    sensor_data.sort(key=lambda x: x['id'])
    
    print("\n📊 Sensores encontrados:")
    for i, sensor in enumerate(sensor_data, 1):
        print(f"\n   {i}. Sensor ID: {sensor['id']}")
        print(f"      Último valor: {sensor['value']}")
        print(f"      Timestamp: {sensor['ts'].strftime('%H:%M:%S')}")
    
    # 3. Verificar regra atual
    print("\n\n⚙️  PASSO 3: Configuração Atual da Regra")
    print("-" * 70)
    
    rule = Rule.objects.filter(equipment=asset).first()
    
    if rule:
        print(f"\n📋 Regra encontrada: {rule.name}")
        params = RuleParameter.objects.filter(rule=rule).order_by('order')
        
        print(f"\n   Parâmetros configurados ({params.count()}):")
        for param in params:
            print(f"\n   • Parâmetro {param.order + 1}:")
            print(f"     Sensor ID: {param.parameter_key}")
            print(f"     Condição: {param.operator} {param.threshold}")
            
            # Verificar se sensor existe
            exists = any(s['id'] == param.parameter_key for s in sensor_data)
            if exists:
                print(f"     Status: ✅ Sensor encontrado")
                # Buscar valor atual
                current = next((s for s in sensor_data if s['id'] == param.parameter_key), None)
                if current:
                    print(f"     Valor atual: {current['value']}")
            else:
                print(f"     Status: ❌ Sensor NÃO encontrado")
    else:
        print("❌ Nenhuma regra encontrada para este equipamento")
    
    # 4. Sugestão de correção
    print("\n\n💡 PASSO 4: Sugestão de Correção")
    print("-" * 70)
    
    if rule and params.count() > 0:
        print("\n⚠️  AÇÃO NECESSÁRIA: Editar regra no frontend")
        print("\nVocê precisa atualizar os sensores na regra para:")
        print("\n📝 Sensores disponíveis para selecionar:")
        
        for i, sensor in enumerate(sensor_data, 1):
            sensor_type = ""
            if "temp" in sensor['id'].lower():
                sensor_type = "🌡️  (Temperatura)"
            elif "humid" in sensor['id'].lower():
                sensor_type = "💧 (Umidade)"
            elif "rssi" in sensor['id'].lower():
                sensor_type = "📶 (Sinal)"
            
            print(f"\n   {i}. {sensor['id']} {sensor_type}")
            print(f"      Valor atual: {sensor['value']}")
    
    print("\n\n" + "=" * 70)
    print("✅ CORREÇÃO CONCLUÍDA")
    print("=" * 70)
    print("\n📌 PRÓXIMOS PASSOS:")
    print("   1. Abra o frontend e edite a regra")
    print("   2. Selecione os sensores corretos da lista acima")
    print("   3. Configure os thresholds desejados")
    print("   4. Salve a regra")
    print("   5. Os alertas começarão a funcionar automaticamente!")
    print("\n")
