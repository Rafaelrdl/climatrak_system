import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django_tenants.utils import schema_context
from apps.alerts.models import Rule

schema = 'umc'

with schema_context(schema):
    rule = Rule.objects.filter(name__icontains='CHILLER').first()
    
    print(f"📋 Regra: {rule.name}\n")
    
    for param in rule.parameters.all():
        print(f"Parâmetro: {param.parameter_key}")
        print(f"   ANTES: {param.operator} {param.threshold}")
        
        # Corrigir operador do temperatura_retorno
        if 'retorno' in param.parameter_key:
            if param.operator == '<':
                param.operator = '>'
                param.save()
                print(f"   DEPOIS: {param.operator} {param.threshold} ✅ CORRIGIDO!")
                print(f"   Motivo: Temperatura de retorno ALTA (37°C) deve disparar alerta\n")
            else:
                print(f"   ✅ Já está correto\n")
        else:
            print(f"   ✅ Está correto\n")
    
    print(f"\n📊 Configuração final da regra:")
    for param in rule.parameters.all():
        print(f"\n   {param.parameter_key}:")
        print(f"      Se valor {param.operator} {param.threshold}°C")
        print(f"      Então: Gerar alerta de severidade {param.severity}")
        print(f"      Mensagem: {param.message_template}")
