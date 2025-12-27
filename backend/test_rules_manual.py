#!/usr/bin/env python
"""
Script para testar avaliação de regras manualmente com suporte multi-tenant
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context, get_tenant_model
from apps.alerts.models import Rule
from apps.alerts.tasks import evaluate_single_rule
from apps.alerts.services import NotificationService

print("🔍 Iniciando avaliação manual de regras...\n")

# Obter todos os tenants
TenantModel = get_tenant_model()
tenants = TenantModel.objects.exclude(schema_name='public')

notification_service = NotificationService()
total_evaluated = 0
total_triggered = 0

for tenant in tenants:
    print(f"📋 Tenant: {tenant.schema_name}")
    
    with schema_context(tenant.schema_name):
        # Buscar regras ativas
        rules = Rule.objects.filter(enabled=True).select_related('equipment')
        
        if not rules.exists():
            print(f"   ⚠️  Nenhuma regra ativa encontrada\n")
            continue
        
        print(f"   ✅ {rules.count()} regra(s) ativa(s) encontrada(s)")
        
        for rule in rules:
            total_evaluated += 1
            print(f"\n   🔎 Avaliando regra: {rule.name}")
            print(f"      Equipamento: {rule.equipment.name} ({rule.equipment.tag})")
            
            # Verificar se tem parâmetros
            params_count = rule.parameters.count()
            print(f"      Parâmetros: {params_count}")
            
            if params_count > 0:
                for param in rule.parameters.all():
                    print(f"         - {param.parameter_key} {param.operator} {param.threshold}")
            
            try:
                # Avaliar regra
                alert = evaluate_single_rule(rule)
                
                if alert:
                    total_triggered += 1
                    print(f"      🚨 ALERTA DISPARADO! ID: {alert.id}")
                    print(f"         Mensagem: {alert.message}")
                    print(f"         Severidade: {alert.severity}")
                    
                    # Enviar notificações
                    try:
                        results = notification_service.send_alert_notifications(alert)
                        print(f"         📧 Notificações: {len(results['sent'])} enviadas, {len(results['failed'])} falharam")
                    except Exception as e:
                        print(f"         ❌ Erro ao enviar notificações: {str(e)}")
                else:
                    print(f"      ✓ Condição não atendida (nenhum alerta disparado)")
                    
            except Exception as e:
                print(f"      ❌ Erro ao avaliar: {str(e)}")
        
        print()

print(f"\n📊 Resumo:")
print(f"   Regras avaliadas: {total_evaluated}")
print(f"   Alertas disparados: {total_triggered}")
