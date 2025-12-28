#!/usr/bin/env python
"""
Verifica o estado atual do usuário rafael@ascitech.com.br
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from apps.public_identity.models import TenantMembership, compute_email_hash

User = get_user_model()
email = 'rafael@ascitech.com.br'

print(f'\n=== Verificando {email} ===\n')

# 1. Verificar TenantMembership
print('📋 TenantMembership:')
email_hash = compute_email_hash(email)
print(f'   Email hash: {email_hash[:16]}...')

memberships = TenantMembership.objects.filter(email_hash=email_hash)
print(f'   Total memberships: {memberships.count()}')

for m in memberships:
    print(f'   - Tenant: {m.tenant.schema_name} ({m.tenant.name})')
    print(f'     Role: {m.role}, Status: {m.status}')
    print(f'     Display name: {m.display_name}')
    print(f'     Tenant User ID: {m.tenant_user_id}')

# 2. Verificar usuário em cada schema
print('\n👤 Usuários por schema:')

for schema in ['public', 'UMC', 'COMG']:
    with schema_context(schema):
        try:
            user = User.objects.get(email=email)
            print(f'   ✅ {schema}: ID={user.id}, username={user.username}, active={user.is_active}')
        except User.DoesNotExist:
            print(f'   ❌ {schema}: Usuário não encontrado')
        except Exception as e:
            print(f'   ⚠️  {schema}: Erro - {e}')

# 3. Verificar get_user_tenants
print('\n🏢 Tenants do usuário (via TenantMembership.get_user_tenants):')
tenants = TenantMembership.get_user_tenants(email)
for t in tenants:
    print(f'   - {t["schema_name"]} ({t["name"]}) - Role: {t["role"]}')
