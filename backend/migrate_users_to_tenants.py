#!/usr/bin/env python
"""
Migra usuários do schema public para os schemas de tenant.
Este script copia usuários baseado no TenantMembership.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context, get_tenant_model
from apps.public_identity.models import TenantMembership

User = get_user_model()
Tenant = get_tenant_model()

print('=== Iniciando migração de usuários ===\n')

# 1. Buscar todos os usuários no schema public
with schema_context('public'):
    public_users = User.objects.all()
    print(f'📊 Encontrados {public_users.count()} usuários no schema public\n')
    
    for user in public_users:
        print(f'\n👤 Processando usuário: {user.email}')
        
        # 2. Buscar tenants do usuário via TenantMembership
        tenants_info = TenantMembership.get_user_tenants(user.email)
        
        if not tenants_info:
            print(f'   ⚠️  Nenhum TenantMembership encontrado para {user.email}')
            continue
        
        for tenant_info in tenants_info:
            schema_name = tenant_info['schema_name']
            print(f'   📍 Tenant: {schema_name} ({tenant_info["name"]}) - Role: {tenant_info["role"]}')
            
            # 3. Verificar se usuário já existe no schema do tenant
            with schema_context(schema_name):
                existing_user = User.objects.filter(username=user.username).first()
                
                if existing_user:
                    print(f'   ✅ Usuário já existe no schema {schema_name}')
                    continue
                
                # 4. Criar usuário no schema do tenant
                print(f'   🔄 Criando usuário no schema {schema_name}...')
                new_user = User.objects.create(
                    username=user.username,
                    email=user.email,
                    password=user.password,  # Já está hasheado
                    first_name=user.first_name,
                    last_name=user.last_name,
                    is_staff=user.is_staff,
                    is_active=user.is_active,
                    is_superuser=user.is_superuser,
                    last_login=user.last_login,
                    date_joined=user.date_joined,
                )
                
                # Copiar campos customizados (com verificação de existência)
                for field in ['avatar', 'phone', 'bio', 'timezone', 'email_verified', 
                             'time_format', 'alert_cooldown_minutes']:
                    if hasattr(user, field):
                        setattr(new_user, field, getattr(user, field))
                
                new_user.save()
                print(f'   ✅ Usuário criado com sucesso no schema {schema_name} (ID: {new_user.id})')

print('\n\n=== Migração concluída! ===')
print('\n📊 Verificação final:')

for tenant in Tenant.objects.exclude(schema_name='public'):
    with schema_context(tenant.schema_name):
        user_count = User.objects.count()
        users = User.objects.all()
        print(f'   {tenant.schema_name}: {user_count} usuários')
        for u in users:
            print(f'      - {u.username} ({u.email})')
