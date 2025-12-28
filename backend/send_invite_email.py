"""Script para enviar email de convite manualmente."""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.accounts.models import Invite
from django.core.mail import send_mail
from django.conf import settings

invite = Invite.objects.filter(email='rafaelrdlessa@gmail.com', status='pending').first()

if not invite:
    print("Convite não encontrado!")
    sys.exit(1)

frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
accept_url = f'{frontend_url}/accept-invite?token={invite.token}'

html_message = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Você foi convidado para {invite.tenant.name}</h2>
    <p>Olá!</p>
    <p>Você foi convidado para se juntar à equipe 
    "<strong>{invite.tenant.name}</strong>" no Climatrak.</p>
    <p><strong>Papel:</strong> {invite.role}</p>
    <p style="margin: 20px 0;">
        <a href="{accept_url}" 
           style="background-color: #417690; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Aceitar Convite
        </a>
    </p>
    <p style="color: #666; font-size: 12px;">Este convite expira em 7 dias.</p>
    <hr>
    <p style="color: #999; font-size: 11px;">Ou copie este link: {accept_url}</p>
</body>
</html>
"""

plain_message = f"""
Você foi convidado para {invite.tenant.name}!

Papel: {invite.role}

Clique no link abaixo para aceitar:
{accept_url}

Este convite expira em 7 dias.
"""

try:
    result = send_mail(
        subject=f'Você foi convidado para {invite.tenant.name} - Climatrak',
        message=plain_message.strip(),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invite.email],
        html_message=html_message.strip(),
        fail_silently=False,
    )
    print(f'✅ Convite enviado para {invite.email}!')
    print(f'Token: {invite.token[:12]}...')
    print(f'Link: {accept_url}')
except Exception as e:
    print(f'❌ Erro ao enviar: {e}')
