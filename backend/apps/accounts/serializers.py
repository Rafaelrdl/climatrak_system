"""
Serializers for user authentication and profile management.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import connection
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with read-only and writable fields.
    Includes role and site from TenantMembership.
    """
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    role = serializers.SerializerMethodField()
    site = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'initials',
            'avatar',
            'phone',
            'bio',
            'timezone',
            'time_format',
            'email_verified',
            'is_active',
            'is_staff',
            'role',
            'site',
            'date_joined',
            'last_login',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'username',
            'email_verified',
            'is_active',
            'is_staff',
            'role',
            'site',
            'date_joined',
            'last_login',
            'created_at',
            'updated_at',
        ]
    
    def get_role(self, obj):
        """Get user role from TenantMembership."""
        from apps.accounts.models import TenantMembership
        
        try:
            tenant = connection.tenant
            membership = TenantMembership.objects.filter(
                user=obj,
                tenant=tenant,
                status='active'
            ).first()
            return membership.role if membership else 'viewer'
        except Exception:
            return 'viewer'
    
    def get_site(self, obj):
        """Get tenant name as site."""
        try:
            tenant = connection.tenant
            return tenant.name if hasattr(tenant, 'name') else 'TrakSense'
        except Exception:
            return 'TrakSense'


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    Only allows editing specific fields.
    """
    
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone',
            'bio',
            'timezone',
            'time_format',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password_confirm": "As senhas não coincidem."
            })
        return attrs
    
    def validate_email(self, value):
        """Validate email is unique."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value.lower()
    
    def validate_username(self, value):
        """Validate username is unique."""
        if User.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return value.lower()
    
    def create(self, validated_data):
        """Create new user with validated data."""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


# NOTE: LoginSerializer (legacy domain-based) was removed in Dec 2025.
# Use CentralizedLoginSerializer for single-domain SPA architecture.


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer with additional user data.
    """
    
    def validate(self, attrs):
        """Add user data to token response."""
        data = super().validate(attrs)
        
        # Add user data
        data['user'] = UserSerializer(self.user).data
        
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change endpoint.
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        """Validate old password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value
    
    def validate(self, attrs):
        """Validate new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password_confirm": "As senhas não coincidem."
            })
        return attrs
    
    def save(self):
        """Update user password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


# =============================================================================
# Centralized Auth Serializers (X-Tenant Header Architecture)
# =============================================================================

class TenantInfoSerializer(serializers.Serializer):
    """
    Serializer for tenant information in auth responses.
    
    Used to provide tenant details when user has access to multiple tenants.
    """
    schema_name = serializers.CharField(
        help_text="Schema identifier to use in X-Tenant header"
    )
    name = serializers.CharField(
        help_text="Display name of the tenant/organization"
    )
    slug = serializers.CharField(
        help_text="URL-friendly identifier"
    )
    role = serializers.CharField(
        help_text="User's role in this tenant (owner, admin, operator, technician, viewer)"
    )
    is_default = serializers.BooleanField(
        default=False,
        help_text="Whether this is the user's default/primary tenant"
    )


class CentralizedLoginSerializer(serializers.Serializer):
    """
    Serializer for centralized login endpoint.
    
    This serializer handles authentication from the public schema,
    allowing users to login from a single domain and then select
    which tenant they want to access.
    
    Input:
        - username_or_email: User's email or username
        - password: User's password
    
    Output (via view):
        - user: User profile information
        - tenants: List of tenants the user has access to
        - tokens are set as HttpOnly cookies
    """
    username_or_email = serializers.CharField(
        required=True,
        help_text="User's email or username"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="User's password"
    )
    
    def validate(self, attrs):
        """
        Authenticate user in public schema context.
        
        Since users are stored in the public schema, authentication
        happens there regardless of which domain the request came from.
        """
        from django_tenants.utils import schema_context
        
        username_or_email = attrs.get('username_or_email')
        password = attrs.get('password')
        
        # Authenticate in public schema where users are stored
        with schema_context('public'):
            user = None
            
            if '@' in username_or_email:
                # It's an email
                try:
                    user_obj = User.objects.get(email=username_or_email.lower())
                    username = user_obj.username
                except User.DoesNotExist:
                    raise serializers.ValidationError({
                        "username_or_email": "Credenciais inválidas."
                    })
            else:
                # It's a username
                username = username_or_email.lower()
            
            # Authenticate using Django's auth system
            from django.contrib.auth import authenticate
            user = authenticate(username=username, password=password)
            
            if not user:
                raise serializers.ValidationError({
                    "username_or_email": "Credenciais inválidas."
                })
            
            if not user.is_active:
                raise serializers.ValidationError({
                    "username_or_email": "Esta conta está desativada."
                })
        
        attrs['user'] = user
        return attrs


class TenantSelectSerializer(serializers.Serializer):
    """
    Serializer for tenant selection endpoint.
    
    After centralized login, user can select which tenant to access.
    This validates the selection and updates the default tenant preference.
    """
    schema_name = serializers.CharField(
        required=True,
        help_text="Schema name of the tenant to select (e.g., 'COMG', 'UMC')"
    )
    set_as_default = serializers.BooleanField(
        default=False,
        help_text="Whether to set this as the user's default tenant"
    )
    
    def validate_schema_name(self, value):
        """Validate that the tenant exists."""
        from django_tenants.utils import get_tenant_model, schema_context
        
        Tenant = get_tenant_model()
        
        with schema_context('public'):
            if not Tenant.objects.filter(schema_name__iexact=value).exists():
                raise serializers.ValidationError(
                    f"Tenant '{value}' não encontrado."
                )
        
        return value
    
    def validate(self, attrs):
        """Validate user has access to the selected tenant."""
        from apps.accounts.models import TenantMembership
        from django_tenants.utils import get_tenant_model, schema_context
        
        user = self.context['request'].user
        schema_name = attrs['schema_name']
        
        Tenant = get_tenant_model()
        
        with schema_context('public'):
            tenant = Tenant.objects.get(schema_name__iexact=schema_name)
            
            membership = TenantMembership.objects.filter(
                user=user,
                tenant=tenant,
                status='active'
            ).first()
            
            if not membership:
                raise serializers.ValidationError({
                    "schema_name": f"Você não tem acesso ao tenant '{tenant.name}'."
                })
        
        attrs['tenant'] = tenant
        attrs['membership'] = membership
        return attrs
