import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import authenticate
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model

User = get_user_model()

# Testar autenticação no schema UMC
with schema_context('umc'):
    print('=== Testando autenticação ===')
    
    user = authenticate(username='rafael@ascitech.com.br', password='muaythay99')
    if user:
        print(f'✅ Autenticação bem-sucedida!')
        print(f'   User: {user.email}')
        print(f'   Is active: {user.is_active}')
    else:
        print('❌ Autenticação falhou!')
        
        # Testar manualmente
        try:
            u = User.objects.get(email='rafael@ascitech.com.br')
            print(f'\nUsuário encontrado: {u.email}')
            print(f'Username: {u.username}')
            print(f'Is active: {u.is_active}')
            print(f'Check password muaythay99: {u.check_password("muaythay99")}')
            print(f'Has usable password: {u.has_usable_password()}')
        except User.DoesNotExist:
            print('Usuário não encontrado no schema UMC')
