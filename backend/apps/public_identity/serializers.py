"""
Serializers for public_identity app.

Used for validating login requests and formatting responses.
"""

from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login requests.
    """
    email = serializers.EmailField(
        help_text="Email do usuário"
    )
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text="Senha do usuário"
    )
    
    def validate_email(self, value):
        """Normalize email to lowercase."""
        return value.lower().strip()


class SelectTenantSerializer(serializers.Serializer):
    """
    Serializer for tenant selection after multi-tenant login.
    """
    email = serializers.EmailField(
        help_text="Email do usuário"
    )
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text="Senha do usuário"
    )
    schema_name = serializers.CharField(
        help_text="Schema do tenant selecionado"
    )
    
    def validate_email(self, value):
        """Normalize email to lowercase."""
        return value.lower().strip()


class TenantInfoSerializer(serializers.Serializer):
    """
    Serializer for tenant information in responses.
    """
    id = serializers.IntegerField(read_only=True)
    schema_name = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)


class UserInfoSerializer(serializers.Serializer):
    """
    Serializer for user information in responses.
    """
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    avatar = serializers.CharField(read_only=True, allow_null=True)
    is_staff = serializers.BooleanField(read_only=True, required=False)


class LoginResponseSerializer(serializers.Serializer):
    """
    Serializer for login response.
    
    This can have two shapes:
    1. Single tenant: { success, user, tenant }
    2. Multiple tenants: { success, requires_tenant_selection, tenants }
    """
    success = serializers.BooleanField(read_only=True)
    error = serializers.CharField(read_only=True, required=False)
    
    # Single tenant response
    user = UserInfoSerializer(read_only=True, required=False)
    tenant = TenantInfoSerializer(read_only=True, required=False)
    
    # Multiple tenant response
    requires_tenant_selection = serializers.BooleanField(read_only=True, required=False)
    tenants = TenantInfoSerializer(many=True, read_only=True, required=False)


class MeResponseSerializer(serializers.Serializer):
    """
    Serializer for /me endpoint response.
    """
    user = UserInfoSerializer(read_only=True)
    tenant = TenantInfoSerializer(read_only=True)


# ============================================================================
# Admin-facing serializers for TenantMembership management
# ============================================================================

class TenantMembershipSerializer(serializers.Serializer):
    """
    Serializer for TenantMembership model (public schema).
    
    NOTA: Este modelo agora armazena APENAS email_hash + tenant + role.
    Dados do usuário (nome, etc.) vêm do schema do tenant.
    """
    id = serializers.IntegerField(read_only=True)
    tenant_id = serializers.IntegerField(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    role = serializers.ChoiceField(
        choices=[
            ('owner', 'Proprietário'),
            ('admin', 'Administrador'),
            ('operator', 'Operador'),
            ('technician', 'Técnico'),
            ('requester', 'Solicitante'),
            ('viewer', 'Visualizador'),
        ]
    )
    status = serializers.ChoiceField(
        choices=[
            ('active', 'Ativo'),
            ('inactive', 'Inativo'),
            ('pending', 'Pendente'),
        ],
        read_only=True
    )
    joined_at = serializers.DateTimeField(read_only=True)


class TenantInviteSerializer(serializers.Serializer):
    """
    Serializer for creating tenant invites.
    """
    email = serializers.EmailField(help_text="Email do convidado")
    role = serializers.ChoiceField(
        choices=[
            ('admin', 'Administrador'),
            ('operator', 'Operador'),
            ('technician', 'Técnico'),
            ('requester', 'Solicitante'),
            ('viewer', 'Visualizador'),
        ],
        default='viewer',
        help_text="Papel do convidado no tenant"
    )
    message = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Mensagem personalizada para o convite"
    )
    
    def validate_email(self, value):
        return value.lower().strip()


class TenantInviteDetailSerializer(serializers.Serializer):
    """
    Serializer for invite details (read-only).
    """
    id = serializers.IntegerField(read_only=True)
    tenant_id = serializers.IntegerField(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    invited_by_name = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    is_valid = serializers.SerializerMethodField(read_only=True)
    
    def get_is_valid(self, obj):
        return obj.is_valid
