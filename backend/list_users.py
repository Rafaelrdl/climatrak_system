#!/usr/bin/env python
"""
Script para listar usuários.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.public_identity.models import TenantMembership

User = get_user_model()

print("=== USUÁRIOS ===")
for u in User.objects.all():
    print(f"  {u.email} (id={u.id}, is_staff={u.is_staff})")

print("\n=== TENANT MEMBERSHIPS ===")
for tm in TenantMembership.objects.all().select_related('user', 'tenant'):
    print(f"  {tm.user.email} -> {tm.tenant.schema_name} (role={tm.role})")
