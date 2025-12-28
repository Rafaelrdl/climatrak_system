#!/usr/bin/env python
"""
Cria usuário rafael@ascitech.com.br no schema UMC e adiciona TenantMembership
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

email = 'rafael@ascitech.com.br'
password_plaintext = 'muaythay99'  # Senha que você quer usar

print(f'\n=== Criando/Corrigindo {email} no UMC ===\n')

# 1. Buscar tenant UMC
try:
    umc_tenant = Tenant.objects.get(schema_name='UMC')
    print(f'✅ Tenant UMC encontrado: {umc_tenant.name}')
except Tenant.DoesNotExist:
    print('❌ Tenant UMC não encontrado!')
    exit(1)

# 2. Buscar usuário no schema public (para copiar dados)
with schema_context('public'):
    try:
        source_user = User.objects.get(email=email)
        print(f'✅ Usuário encontrado no public: {source_user.username}')
    except User.DoesNotExist:
        print('❌ Usuário não encontrado no public!')
        exit(1)

# 3. Criar usuário no schema UMC
with schema_context('UMC'):
    existing = User.objects.filter(email=email).first()
    
    if existing:
        print(f'⚠️  Usuário já existe no UMC (ID: {existing.id})')
        umc_user = existing
    else:
        print('🔄 Criando usuário no schema UMC...')
        umc_user = User.objects.create(
            username=source_user.username,
            email=source_user.email,
            first_name=source_user.first_name or '',
            last_name=source_user.last_name or '',
            is_staff=source_user.is_staff,
            is_active=True,  # Garantir que está ativo
            is_superuser=source_user.is_superuser,
        )
        
        # Definir senha (será hasheada automaticamente)
        umc_user.set_password(password_plaintext)
        
        # Copiar campos customizados
        for field in ['avatar', 'phone', 'bio', 'timezone', 'email_verified']:
            if hasattr(source_user, field):
                setattr(umc_user, field, getattr(source_user, field))
        
        umc_user.save()
        print(f'✅ Usuário criado no UMC (ID: {umc_user.id})')

# 4. Criar TenantMembership para UMC
print('\n🔄 Criando TenantMembership para UMC...')
membership = TenantMembership.create_membership(
    tenant=umc_tenant,
    user_id=umc_user.id,
    email=email,
    role='owner',  # ou 'admin' se preferir
    display_name='Rafael Lessa'
)
print(f'✅ TenantMembership criado: {membership.tenant.schema_name} - {membership.role}')

# 5. Verificação final
print('\n📊 Verificação final:')
tenants = TenantMembership.get_user_tenants(email)
for t in tenants:
    print(f'   - {t["schema_name"]} ({t["name"]}) - Role: {t["role"]}')

with schema_context('UMC'):
    user = User.objects.get(email=email)
    print(f'\n✅ Usuário no UMC: ID={user.id}, active={user.is_active}')
    print(f'   Testando senha... ', end='')
    if user.check_password(password_plaintext):
        print('✅ Senha correta!')
    else:
        print('❌ Senha incorreta!')
