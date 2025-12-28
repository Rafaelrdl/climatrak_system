#!/usr/bin/env python
"""Verifica se usuário existe no schema correto"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

User = get_user_model()

with schema_context('umc'):
    print('=== Verificando usuários no schema UMC ===')
    users = User.objects.all()
    print(f'Total de usuários: {users.count()}')
    for user in users:
        print(f'- Username: {user.username}, Email: {user.email}, Active: {user.is_active}')
    
    print('\n=== Buscando por email ===')
    try:
        user = User.objects.get(email='rafael@ascitech.com.br')
        print(f'✅ Encontrado: {user.username} - {user.email}')
    except User.DoesNotExist:
        print('❌ Usuário não encontrado por email')
    except User.MultipleObjectsReturned:
        print('⚠️ Múltiplos usuários com esse email!')
    
    print('\n=== Buscando por username ===')
    try:
        user = User.objects.get(username='rafael@ascitech.com.br')
        print(f'✅ Encontrado: {user.username} - {user.email}')
    except User.DoesNotExist:
        print('❌ Usuário não encontrado por username')
