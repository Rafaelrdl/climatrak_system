"""
Authentication and user profile views.
"""

import logging
import uuid

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from apps.common.storage import get_minio_client

# Cookie settings
COOKIE_SECURE = not settings.DEBUG
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = "Lax"
COOKIE_PATH = "/"
COOKIE_DOMAIN = getattr(settings, "AUTH_COOKIE_DOMAIN", None)

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    POST /api/auth/register
    {
        "username": "johndoe",
        "email": "john@example.com",
        "password": "SecurePass123!",
        "password_confirm": "SecurePass123!",
        "first_name": "John",
        "last_name": "Doe"
    }
    """

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """
        ⚠️ SECURITY: Registration is restricted to the PUBLIC schema only.
        Tenant-scoped registrations require a valid invitation token.

        This prevents attackers from self-registering as admin on any tenant domain.
        """
        from django.db import connection

        from apps.accounts.models import TenantMembership

        # 🔒 SECURITY CHECK: Only allow registration on public schema OR with invitation token
        if connection.schema_name != "public":
            invitation_token = request.data.get("invitation_token")
            if not invitation_token:
                return Response(
                    {
                        "error": "Registration on tenant domains requires an invitation token",
                        "detail": "Please contact your organization administrator for an invitation link",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # TODO: Validate invitation_token against Invitation model
            # For now, reject all tenant-scoped registrations without proper invitation system
            return Response(
                {
                    "error": "Invitation system not yet implemented",
                    "detail": "Please register via the main site or contact support",
                },
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create TenantMembership only if on tenant schema with valid invitation
        # (currently unreachable due to security check above)
        if connection.tenant and connection.schema_name != "public":
            TenantMembership.objects.create(
                user=user,
                tenant=connection.tenant,
                role="member",  # Default role is 'member', not 'admin'
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Return tenant metadata (same structure as login)
        tenant_info = None
        if connection.tenant and connection.schema_name != "public":
            protocol = "https" if request.is_secure() else "http"
            domain = request.get_host()
            tenant_info = {
                "slug": connection.schema_name,
                "domain": domain,
                "api_base_url": f"{protocol}://{domain}/api",
            }

        response_data = {
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "message": "Usuário registrado com sucesso!",
        }

        if tenant_info:
            response_data["tenant"] = tenant_info

        return Response(response_data, status=status.HTTP_201_CREATED)


# NOTE: LoginView (legacy domain-based) was removed in Dec 2025.


class LogoutView(APIView):
    """
    User logout endpoint.

    POST /api/auth/logout

    Note: In multi-tenant setup, token blacklist is disabled.
    Tokens will naturally expire based on their lifetime.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            response = Response(
                {"message": "Logout realizado com sucesso!"}, status=status.HTTP_200_OK
            )

            # Clear cookies
            delete_kwargs = {"path": COOKIE_PATH}
            if COOKIE_DOMAIN:
                delete_kwargs["domain"] = COOKIE_DOMAIN
            response.delete_cookie("access_token", **delete_kwargs)
            response.delete_cookie("refresh_token", **delete_kwargs)

            return response

        except Exception as e:
            return Response(
                {"error": "Erro ao fazer logout.", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CookieTokenRefreshView(TokenRefreshView):
    """
    Custom Token Refresh View using HttpOnly cookies

    POST /api/auth/token/refresh/

    Security Strategy:
    - Reads refresh_token from HttpOnly cookie (not request body)
    - Returns new access_token in HttpOnly cookie (not JSON)
    - Protects against XSS token theft

    This view extends simplejwt's TokenRefreshView to work with cookies
    instead of JSON body, maintaining the same validation logic.
    """

    def post(self, request, *args, **kwargs):
        # 🔐 Read refresh token from HttpOnly cookie (not request body)
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {
                    "error": "Refresh token not found in cookies",
                    "detail": "Please login again",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce tenant lock for refresh when running on a tenant schema
        from django.db import connection

        from django_tenants.utils import get_public_schema_name

        current_schema = getattr(connection, "schema_name", get_public_schema_name())
        public_schema = get_public_schema_name()

        if current_schema != public_schema:
            try:
                token = RefreshToken(refresh_token)
            except Exception:
                return Response(
                    {
                        "error": "Invalid refresh token",
                        "detail": "Please login again",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            token_schema = token.get("tenant_schema")
            if not token_schema:
                return Response(
                    {
                        "error": "Token missing tenant schema",
                        "detail": "Please login again",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if token_schema.lower() != current_schema.lower():
                return Response(
                    {
                        "error": "Token tenant mismatch",
                        "detail": "Please login again",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        # Create a mutable copy of request.data and inject refresh token
        # This maintains compatibility with parent class validation logic
        from django.http import QueryDict

        mutable_data = (
            request.data.copy()
            if hasattr(request.data, "copy")
            else QueryDict("", mutable=True)
        )
        mutable_data["refresh"] = refresh_token

        # Replace request.data with our mutable copy
        request._full_data = mutable_data

        # Call parent's post() to validate and generate new access token
        # This uses simplejwt's built-in token validation
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Extract new access token from response data
            new_access_token = response.data.get("access")

            if new_access_token:
                # 🔐 Set new access token as HttpOnly cookie (not JSON)
                cookie_kwargs = {
                    "httponly": COOKIE_HTTPONLY,
                    "secure": COOKIE_SECURE,
                    "samesite": COOKIE_SAMESITE,
                    "path": COOKIE_PATH,
                }
                if COOKIE_DOMAIN:
                    cookie_kwargs["domain"] = COOKIE_DOMAIN

                response.set_cookie(
                    key="access_token",
                    value=new_access_token,
                    max_age=3600,  # 1 hour
                    **cookie_kwargs,
                )

                # Remove token from JSON response (cookies only)
                response.data = {
                    "message": "Token refreshed successfully",
                    "detail": "New access token set in HttpOnly cookie",
                }

                if settings.DEBUG:
                    logger.debug("Token refresh successful (cookie-based)")

        return response


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token obtain view with user data.
    """

    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """
    Current user profile endpoint.

    GET /api/users/me - Get current user
    PATCH /api/users/me - Update current user
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user profile."""
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        """Update current user profile."""
        import logging

        logger = logging.getLogger(__name__)

        # 🔒 SECURITY FIX (Nov 2025): Do NOT log PII in production
        # Audit finding: "Registra no log todo o payload do /api/users/me PATCH,
        # expondo telefones e bios nos logs."
        # Conditional logging prevents compliance violations
        if settings.DEBUG:
            logger.debug(f"🔄 PATCH /api/users/me/ - Data recebida: {request.data}")

        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Refresh para pegar dados atualizados
        request.user.refresh_from_db()

        # Serializa usuário atualizado
        user_data = UserSerializer(request.user, context={"request": request}).data

        logger.info(f"✅ PATCH /api/users/me/ - User data serializado: {user_data}")
        logger.info(
            f"🕐 PATCH /api/users/me/ - time_format no response: {user_data.get('time_format', 'MISSING')}"
        )

        return Response(
            {"user": user_data, "message": "Perfil atualizado com sucesso!"}
        )


class AuthMeView(APIView):
    """
    Current authenticated session endpoint (tenant schema).

    GET /api/auth/me/

    Returns user + tenant metadata + tenant features for the frontend session.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db import connection

        from apps.tenants.features import get_tenant_features

        tenant = getattr(connection, "tenant", None)
        if not tenant or connection.schema_name == "public":
            return Response(
                {"error": "Tenant nao identificado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_data = UserSerializer(
            request.user, context={"request": request, "tenant": tenant}
        ).data
        role = user_data.get("role", "viewer")
        features = get_tenant_features(tenant.id)

        response_data = {
            "user": user_data,
            "tenant": {
                "id": tenant.id,
                "schema_name": tenant.schema_name,
                "name": tenant.name,
                "slug": getattr(tenant, "slug", tenant.schema_name.lower()),
                "role": role,
                "features": features,
            },
        }

        return Response(response_data)


class ChangePasswordView(APIView):
    """
    Change password endpoint.

    POST /api/users/me/change-password
    {
        "old_password": "OldPass123!",
        "new_password": "NewPass123!",
        "new_password_confirm": "NewPass123!"
    }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Senha alterada com sucesso!"}, status=status.HTTP_200_OK
        )


class AvatarUploadView(APIView):
    """
    Avatar upload endpoint using MinIO.

    POST /api/users/me/avatar
    Content-Type: multipart/form-data

    Body:
    - avatar: image file (jpg, png, gif)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload user avatar to MinIO."""
        avatar_file = request.FILES.get("avatar")

        if not avatar_file:
            return Response(
                {"error": "Nenhum arquivo enviado."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if avatar_file.content_type not in allowed_types:
            return Response(
                {"error": "Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if avatar_file.size > max_size:
            return Response(
                {"error": "Arquivo muito grande. Tamanho máximo: 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get MinIO client
            minio_client = get_minio_client()

            # Ensure bucket exists
            bucket_name = settings.MINIO_BUCKET
            if not minio_client.bucket_exists(bucket_name):
                minio_client.make_bucket(bucket_name)

            # 🆕 Deletar avatar antigo se existir
            old_avatar_url = request.user.avatar
            if old_avatar_url:
                try:
                    # Extrair o object key da URL antiga
                    # URL format: http(s)://endpoint/bucket/path/to/file
                    url_parts = old_avatar_url.split(f"/{bucket_name}/")
                    if len(url_parts) > 1:
                        old_object_key = url_parts[1]
                        minio_client.remove_object(bucket_name, old_object_key)
                except Exception as cleanup_error:
                    # Não falhar se a limpeza falhar
                    logger.warning("Failed to delete old avatar: %s", cleanup_error)

            # Generate unique filename
            file_extension = avatar_file.name.split(".")[-1]
            filename = f"avatars/{request.user.id}/{uuid.uuid4()}.{file_extension}"

            # Upload to MinIO
            minio_client.put_object(
                bucket_name,
                filename,
                avatar_file,
                length=avatar_file.size,
                content_type=avatar_file.content_type,
            )

            # 🆕 Generate avatar URL com protocolo correto
            protocol = "https" if getattr(settings, "MINIO_USE_SSL", False) else "http"
            avatar_url = (
                f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket_name}/{filename}"
            )

            # Update user avatar
            request.user.avatar = avatar_url
            request.user.save(update_fields=["avatar"])

            # 🔧 API FIX (Nov 2025): Return full user object (frontend expects {user: {...}})
            # Audit finding: "Endpoints de upload/exclusão de avatar retornam apenas
            # {avatar, message} mas o frontend espera {user: {...}}."
            return Response(
                {
                    "user": UserSerializer(request.user).data,
                    "message": "Avatar atualizado com sucesso!",
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": "Erro ao fazer upload do avatar.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request):
        """Remove user avatar."""
        # 🆕 Deletar arquivo do MinIO antes de remover do banco
        old_avatar_url = request.user.avatar
        if old_avatar_url:
            try:
                minio_client = get_minio_client()
                bucket_name = settings.MINIO_BUCKET
                # Extrair o object key da URL
                url_parts = old_avatar_url.split(f"/{bucket_name}/")
                if len(url_parts) > 1:
                    old_object_key = url_parts[1]
                    minio_client.remove_object(bucket_name, old_object_key)
            except Exception as cleanup_error:
                # Log mas não falhar a operação
                logger.warning(
                    "Failed to delete avatar from storage: %s", cleanup_error
                )

        request.user.avatar = None
        request.user.save(update_fields=["avatar"])

        # 🔧 API FIX (Nov 2025): Return full user object (frontend expects {user: {...}})
        return Response(
            {
                "user": UserSerializer(request.user).data,
                "message": "Avatar removido com sucesso!",
            },
            status=status.HTTP_200_OK,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for authentication service.
    """
    return Response(
        {
            "status": "ok",
            "service": "authentication",
            "timestamp": timezone.now().isoformat(),
        }
    )
