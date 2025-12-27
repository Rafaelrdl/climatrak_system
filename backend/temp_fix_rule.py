import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule, RuleParameter

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name__icontains='CHILLER').first()
    
    if not rule:
        print("❌ Regra não encontrada")
    else:
        print(f"📋 Regra: {rule.name}")
        print(f"   Equipamento: {rule.equipment.tag}")
        
        print(f"\n🔧 Corrigindo parâmetros...")
        
        # Atualizar parâmetros
        params = rule.parameters.all()
        
        for param in params:
            old_key = param.parameter_key
            
            # Corrigir os IDs para usar as tags completas
            if param.parameter_key == 'sensor_43':
                param.parameter_key = 'F80332010002C873_temperatura_saida'
                param.unit = 'celsius'
                param.save()
                print(f"\n   ✅ Corrigido: {old_key} → {param.parameter_key}")
                print(f"      Condição: {param.operator} {param.threshold}")
            elif param.parameter_key == 'sensor_44':
                param.parameter_key = 'F80332010002C873_temperatura_retorno'
                param.unit = 'celsius'
                param.save()
                print(f"\n   ✅ Corrigido: {old_key} → {param.parameter_key}")
                print(f"      Condição: {param.operator} {param.threshold}")
        
        print(f"\n✨ Parâmetros atualizados com sucesso!")
        print(f"\n📊 Configuração final:")
        for param in rule.parameters.all():
            print(f"\n   - {param.parameter_key}")
            print(f"     {param.operator} {param.threshold} {param.unit}")
            print(f"     Severidade: {param.severity}")
