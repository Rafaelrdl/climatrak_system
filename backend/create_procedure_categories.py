# Script para criar categorias de procedimento
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.cmms.models import ProcedureCategory

with schema_context('umc'):
    categories = [
        {'name': 'Elétrico', 'description': 'Procedimentos elétricos', 'color': '#f59e0b'},
        {'name': 'Higienização', 'description': 'Procedimentos de limpeza e higienização', 'color': '#10b981'},
        {'name': 'HVAC', 'description': 'Procedimentos de climatização', 'color': '#3b82f6'},
        {'name': 'Segurança', 'description': 'Procedimentos de segurança', 'color': '#ef4444'},
        {'name': 'Manutenção Preventiva', 'description': 'Procedimentos preventivos', 'color': '#8b5cf6'},
    ]

    for cat_data in categories:
        cat, created = ProcedureCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults=cat_data
        )
        if created:
            print(f'Criada: {cat.name}')
        else:
            print(f'Já existe: {cat.name}')

    print(f'Total: {ProcedureCategory.objects.count()} categorias')
