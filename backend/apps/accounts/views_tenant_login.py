"""
Tenant-specific login view - autentica usuário no schema do tenant.
"""

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.serializers import UserSerializer


@method_decorator(csrf_exempt, name="dispatch")
class TenantLoginView(APIView):
    """
    Login específico do tenant - autentica no schema do tenant atual.

    POST /api/auth/login/
    {
        "email": "user@example.com",
        "password": "password123"
    }

    Response:
    {
        "user": { ...user data... },
        "tenant": {
            "schema_name": "UMC",
            "name": "Uberlandia Medical Center",
            "slug": "umc"
        },
        "message": "Login realizado com sucesso!"
    }

    Security:
    - Tokens são definidos como HttpOnly cookies
    - Autentica no schema do tenant atual
    - Validação de senha acontece no tenant (não no public)
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # Disable authentication for this endpoint

    def post(self, request):
        import logging

        from django.db import connection

        logger = logging.getLogger(__name__)

        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password")

        logger.info(
            f"🔐 Login attempt - Email: {email}, Tenant: {connection.tenant.schema_name}"
        )

        if not email or not password:
            return Response(
                {"error": "Email e senha são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Autentica usando email (via EmailBackend customizado)
        # O django-tenants já define connection.tenant automaticamente
        user = authenticate(request=request, username=email, password=password)

        logger.info(f"🔐 Authentication result: {user}")

        if not user:
            return Response(
                {"error": "Credenciais inválidas."}, status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {"error": "Conta desativada."}, status=status.HTTP_401_UNAUTHORIZED
            )

        # Update last login
        user.last_login = timezone.now()
        user.last_login_ip = self._get_client_ip(request)
        user.save(update_fields=["last_login", "last_login_ip"])

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Get tenant info
        tenant = connection.tenant
        refresh["tenant_schema"] = tenant.schema_name
        refresh["user_email"] = user.email
        tenant_info = {
            "schema_name": tenant.schema_name,
            "name": tenant.name,
            "slug": getattr(tenant, "slug", tenant.schema_name.lower()),
        }

        response_data = {
            "user": UserSerializer(user).data,
            "tenant": tenant_info,
            "message": "Login realizado com sucesso!",
        }

        # Create response with HttpOnly cookies
        response = Response(response_data, status=status.HTTP_200_OK)

        # Set HttpOnly cookies
        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=3600,  # 1 hour
        )
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=604800,  # 7 days
        )

        return response

    def _get_client_ip(self, request):
        """Get client IP from request headers."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")
