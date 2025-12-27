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


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    Accepts either username or email with password.
    """
    username_or_email = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Authenticate user with username/email and password."""
        username_or_email = attrs.get('username_or_email')
        password = attrs.get('password')
        
        # Try to find user by email or username
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
        
        # Authenticate
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
