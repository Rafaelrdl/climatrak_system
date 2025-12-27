"""
Password Reset Views.

Implements secure password reset flow:
1. User requests reset via email
2. System sends email with secure token
3. User clicks link and sets new password
"""

import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, PasswordResetToken


class PasswordResetRequestView(APIView):
    """
    Request password reset email.
    
    POST /api/auth/password-reset/request/
    {
        "email": "user@example.com"
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        
        if not email:
            return Response({
                'error': 'E-mail é obrigatório.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Always return success to prevent email enumeration
        success_response = Response({
            'message': 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
        }, status=status.HTTP_200_OK)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return success anyway to prevent email enumeration
            return success_response
        
        # Invalidate any existing tokens for this user
        PasswordResetToken.objects.filter(user=user).delete()
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=1)
        
        # Save token
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # Build reset URL
        # Use frontend URL from request origin or settings
        frontend_url = request.headers.get('Origin', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password?token={token}"
        
        # Send email
        try:
            subject = 'Redefinição de Senha - Climatrak'
            
            html_message = f"""
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Redefinição de Senha - Climatrak</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
                    <tr>
                        <td style="padding: 40px 20px;">
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto;">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="text-align: center; padding-bottom: 32px;">
                                        <span style="font-size: 28px; font-weight: 600; color: #0d9488; letter-spacing: 2px;">CLIMATRAK</span>
                                    </td>
                                </tr>
                                
                                <!-- Main Card -->
                                <tr>
                                    <td>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 4px; border: 1px solid #e0e0e0;">
                                            
                                            <!-- Title -->
                                            <tr>
                                                <td style="padding: 40px 40px 24px 40px; border-bottom: 1px solid #eeeeee;">
                                                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #1a1a1a;">Redefinição de Senha</h1>
                                                </td>
                                            </tr>
                                            
                                            <!-- Content -->
                                            <tr>
                                                <td style="padding: 32px 40px;">
                                                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                                                        Olá, <strong>{user.first_name or user.username}</strong>.
                                                    </p>
                                                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                                                        Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Climatrak. 
                                                        Para prosseguir, clique no botão abaixo.
                                                    </p>
                                                    
                                                    <!-- CTA Button -->
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 28px auto;">
                                                        <tr>
                                                            <td style="background-color: #0d9488; border-radius: 4px;">
                                                                <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 14px 40px; font-size: 15px; font-weight: 500; color: #ffffff; text-decoration: none;">
                                                                    Redefinir Senha
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    
                                                    <!-- Warning -->
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff8e6; border: 1px solid #f0e6cc; margin-bottom: 24px;">
                                                        <tr>
                                                            <td style="padding: 16px;">
                                                                <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 500; color: #8a6d3b;">
                                                                    Atenção
                                                                </p>
                                                                <p style="margin: 0; font-size: 13px; color: #8a6d3b; line-height: 1.5;">
                                                                    Este link é válido por 1 hora. Após esse período, será necessário solicitar uma nova redefinição.
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    
                                                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                                                        Se você não solicitou esta redefinição, desconsidere este e-mail. Sua senha atual permanecerá inalterada.
                                                    </p>
                                                    
                                                    <!-- Alternative Link -->
                                                    <p style="margin: 0; font-size: 13px; color: #888888;">
                                                        Caso o botão não funcione, copie e cole o link abaixo no navegador:
                                                    </p>
                                                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #0d9488; word-break: break-all;">
                                                        {reset_url}
                                                    </p>
                                                </td>
                                            </tr>
                                            
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding-top: 32px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #888888;">
                                            Este é um e-mail automático. Por favor, não responda.
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
                                            © {timezone.now().year} Climatrak. Todos os direitos reservados.
                                        </p>
                                    </td>
                                </tr>
                                
                            </table>
                            
                        </td>
                    </tr>
                </table>
                
            </body>
            </html>
            """
            
            plain_message = f"""
CLIMATRAK
Redefinição de Senha

--------------------------------------------------

Olá, {user.first_name or user.username}.

Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Climatrak.

Para prosseguir, acesse o link abaixo:
{reset_url}

ATENÇÃO: Este link é válido por 1 hora.

Se você não solicitou esta redefinição, desconsidere este e-mail. Sua senha atual permanecerá inalterada.

--------------------------------------------------

Este é um e-mail automático. Por favor, não responda.
© {timezone.now().year} Climatrak. Todos os direitos reservados.
            """
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
        except Exception as e:
            # Log error but don't expose to user
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send password reset email: {e}")
        
        return success_response


class PasswordResetValidateView(APIView):
    """
    Validate password reset token.
    
    GET /api/auth/password-reset/validate/?token=xxx
    POST /api/auth/password-reset/validate/ {"token": "xxx"}
    """
    permission_classes = [AllowAny]
    
    def _validate_token(self, token):
        """Internal method to validate token."""
        if not token:
            return Response({
                'valid': False,
                'error': 'Token não fornecido.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if reset_token.is_expired():
                return Response({
                    'valid': False,
                    'error': 'Este link expirou. Solicite uma nova redefinição de senha.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if reset_token.used:
                return Response({
                    'valid': False,
                    'error': 'Este link já foi utilizado. Solicite uma nova redefinição de senha.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'valid': True,
                'email': reset_token.user.email
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response({
                'valid': False,
                'error': 'Token inválido.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        token = request.query_params.get('token', '')
        return self._validate_token(token)
    
    def post(self, request):
        token = request.data.get('token', '')
        return self._validate_token(token)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with new password.
    
    POST /api/auth/password-reset/confirm/
    {
        "token": "xxx",
        "password": "NewSecurePass123!",
        "password_confirm": "NewSecurePass123!"
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token', '')
        password = request.data.get('password', '')
        password_confirm = request.data.get('password_confirm', '')
        
        # Validate inputs
        if not token:
            return Response({
                'error': 'Token não fornecido.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not password or not password_confirm:
            return Response({
                'error': 'Senha e confirmação são obrigatórias.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if password != password_confirm:
            return Response({
                'error': 'As senhas não coincidem.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(password) < 6:
            return Response({
                'error': 'A senha deve ter pelo menos 6 caracteres.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if reset_token.is_expired():
                return Response({
                    'error': 'Este link expirou. Solicite uma nova redefinição de senha.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if reset_token.used:
                return Response({
                    'error': 'Este link já foi utilizado.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user = reset_token.user
            user.set_password(password)
            user.save()
            
            # Mark token as used
            reset_token.used = True
            reset_token.save()
            
            return Response({
                'message': 'Senha redefinida com sucesso! Você já pode fazer login.'
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response({
                'error': 'Token inválido.'
            }, status=status.HTTP_400_BAD_REQUEST)
