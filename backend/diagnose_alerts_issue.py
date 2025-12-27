#!/usr/bin/env python
import os,django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.ingest.models import Reading
from apps.alerts.models import Rule, RuleParameter, Alert
from apps.assets.models import Sensor
from django.utils import timezone
from datetime import timedelta

schema='umc'

print("=" * 80)
print("🔍 DIAGNÓSTICO: Por que os alertas não dispararam?")
print("=" * 80)

with schema_context(schema):
    # 1. Verificar readings recentes
    print("\n📊 PASSO 1: Verificando readings recentes (últimos 15 min)")
    print("-" * 80)
    
    cutoff = timezone.now() - timedelta(minutes=15)
    
    readings = Reading.objects.filter(
        device_id='4b686f6d70107115',
        ts__gte=cutoff
    ).order_by('-ts')[:10]
    
    if readings.exists():
        print(f"✅ {readings.count()} readings encontradas:\n")
        for r in readings:
            print(f"   {r.ts.strftime('%H:%M:%S')} | {r.sensor_id:40} | {r.value}")
    else:
        print("❌ PROBLEMA: Nenhuma reading encontrada nos últimos 15 minutos!")
        print("\n   Possíveis causas:")
        print("   - Mensagens MQTT não foram publicadas")
        print("   - Parser não processou as mensagens")
        print("   - Device ID ou tenant incorretos")
        
        # Verificar se há readings antigas
        old_readings = Reading.objects.filter(
            device_id='4b686f6d70107115'
        ).order_by('-ts')[:5]
        
        if old_readings.exists():
            last = old_readings.first()
            age = timezone.now() - last.ts
            print(f"\n   ⚠️  Última reading antiga: {last.value} há {age.seconds // 60} min")
    
    # 2. Verificar a regra
    print("\n\n⚙️  PASSO 2: Verificando configuração da regra")
    print("-" * 80)
    
    rule = Rule.objects.filter(name='Alerta CHILLER-001').first()
    
    if not rule:
        print("❌ PROBLEMA: Regra não encontrada!")
    else:
        print(f"✅ Regra encontrada: {rule.name}")
        print(f"   Enabled: {rule.enabled}")
        print(f"   Equipment: {rule.equipment.name}")
        
        device = rule.equipment.devices.first()
        if device:
            print(f"   Device MQTT ID: {device.mqtt_client_id}")
        
        params = RuleParameter.objects.filter(rule=rule).order_by('order')
        print(f"   Parâmetros: {params.count()}")
        
        for param in params:
            print(f"\n   Param {param.order + 1}: {param.parameter_key} {param.operator} {param.threshold}")
    
    # 3. Verificar últimos alertas
    print("\n\n🚨 PASSO 3: Verificando alertas recentes (últimos 30 min)")
    print("-" * 80)
    
    recent_cutoff = timezone.now() - timedelta(minutes=30)
    recent_alerts = Alert.objects.filter(
        triggered_at__gte=recent_cutoff
    ).order_by('-triggered_at')
    
    if recent_alerts.exists():
        print(f"✅ {recent_alerts.count()} alerta(s) disparado(s):\n")
        for alert in recent_alerts:
            print(f"   ID {alert.id} | {alert.triggered_at.strftime('%H:%M:%S')} | {alert.message[:60]}...")
    else:
        print("❌ Nenhum alerta disparado nos últimos 30 minutos")
    
    # 4. Verificar logs de execução do Celery
    print("\n\n⏱️  PASSO 4: Status do Celery")
    print("-" * 80)
    print("Verificando última execução da task...")
    
    # Tentar executar a avaliação manualmente
    print("\n🧪 Executando avaliação manual da regra...\n")
    
    if not readings.exists():
        print("❌ Não é possível avaliar: sem readings recentes!")
    elif not rule:
        print("❌ Não é possível avaliar: regra não encontrada!")
    else:
        # Importar a função de avaliação
        from apps.alerts.tasks import evaluate_single_rule
        from apps.alerts.services import NotificationService
        
        try:
            alert = evaluate_single_rule(rule)
            
            if alert:
                print(f"✅ ALERTA DISPARADO!")
                print(f"   ID: {alert.id}")
                print(f"   Mensagem: {alert.message}")
                print(f"   Severity: {alert.severity}")
                
                # Tentar enviar notificação
                notification_service = NotificationService()
                results = notification_service.send_alert_notifications(alert)
                print(f"\n   Notificações: {len(results['sent'])} enviadas, {len(results['failed'])} falharam")
            else:
                print("❌ Nenhum alerta disparado na avaliação manual")
                print("\n   Possíveis causas:")
                print("   - Condições não atendidas")
                print("   - Dados muito antigos (> 15 min)")
                print("   - Em período de cooldown")
                
        except Exception as e:
            print(f"❌ ERRO ao avaliar regra: {str(e)}")
            import traceback
            traceback.print_exc()

print("\n" + "=" * 80)
