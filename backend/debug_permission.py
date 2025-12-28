#!/usr/bin/env python
"""
Debug permission issue - verificar membership
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.public_identity.models import TenantMembership, compute_email_hash
from django_tenants.utils import get_tenant_model

Tenant = get_tenant_model()

print('\n=== Debug Permission Issue ===\n')

# Verificar memberships para ambos os emails
for email in ['rafael@ascitech.com.br', 'rafaelrdlessa@gmail.com']:
    print(f'\n📧 Email: {email}')
    email_hash = compute_email_hash(email)
    print(f'   Hash: {email_hash[:16]}...')
    
    memberships = TenantMembership.objects.filter(email_hash=email_hash)
    print(f'   Total memberships: {memberships.count()}')
    
    for m in memberships:
        print(f'   - Tenant: {m.tenant.schema_name} ({m.tenant.name})')
        print(f'     Role: {m.role}, Status: {m.status}')
        print(f'     Tenant User ID: {m.tenant_user_id}')
        print(f'     Display name: {m.display_name}')

# Verificar tenant UMC
umc = Tenant.objects.get(schema_name='UMC')
print(f'\n🏢 Tenant UMC: {umc.name}')
print(f'   Schema: {umc.schema_name}')
print(f'   ID: {umc.id}')

# Listar TODOS os memberships do UMC
print(f'\n👥 Todos os memberships do UMC:')
umc_memberships = TenantMembership.objects.filter(tenant=umc)
for m in umc_memberships:
    print(f'   - Email hint: {m.email_hint}')
    print(f'     Display name: {m.display_name}')
    print(f'     Role: {m.role}, Status: {m.status}')
    print(f'     User ID: {m.tenant_user_id}')
    print()
