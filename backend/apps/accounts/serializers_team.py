"""
Serializers for team management (memberships and invites).
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TenantMembership, Invite

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for team listing."""
    
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 
                  'full_name', 'initials', 'avatar']
        read_only_fields = fields


class TenantMembershipSerializer(serializers.ModelSerializer):
    """Serializer for tenant membership with user details."""
    
    user = UserBasicSerializer(read_only=True)
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    can_manage_team = serializers.BooleanField(read_only=True)
    can_write = serializers.BooleanField(read_only=True)
    can_delete_tenant = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TenantMembership
        fields = [
            'id', 'user', 'role', 'status',
            'invited_by_email', 'joined_at', 'updated_at',
            'can_manage_team', 'can_write', 'can_delete_tenant'
        ]
        read_only_fields = ['id', 'user', 'invited_by_email', 'joined_at']


class UpdateMembershipSerializer(serializers.ModelSerializer):
    """Serializer for updating membership role/status."""
    
    class Meta:
        model = TenantMembership
        fields = ['role', 'status']
    
    def validate_role(self, value):
        """Ensure tenant has at least one owner."""
        membership = self.instance
        
        if membership and membership.role == 'owner' and value != 'owner':
            # Check if there are other active owners
            other_owners = TenantMembership.objects.filter(
                tenant=membership.tenant,
                role='owner',
                status='active'
            ).exclude(pk=membership.pk).count()
            
            if other_owners == 0:
                raise serializers.ValidationError(
                    "Cannot change role: tenant must have at least one active owner."
                )
        
        return value


class InviteSerializer(serializers.ModelSerializer):
    """Serializer for invites."""
    
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.full_name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Invite
        fields = [
            'id', 'email', 'role', 'status', 'message',
            'invited_by_email', 'invited_by_name', 'tenant_name',
            'created_at', 'expires_at', 'accepted_at', 'token',
            'is_valid', 'is_expired'
        ]
        read_only_fields = [
            'id', 'status', 'invited_by_email', 'invited_by_name',
            'tenant_name', 'created_at', 'expires_at', 'accepted_at',
            'token',
            'is_valid', 'is_expired'
        ]


class CreateInviteSerializer(serializers.ModelSerializer):
    """Serializer for creating new invites."""
    
    class Meta:
        model = Invite
        fields = ['email', 'role', 'message']
    
    def validate_email(self, value):
        """Check if email is already a member or has pending invite."""
        tenant = self.context['tenant']
        
        # Check for existing membership
        user = User.objects.filter(email=value).first()
        if user:
            existing_membership = TenantMembership.objects.filter(
                user=user,
                tenant=tenant
            ).first()
            
            if existing_membership:
                raise serializers.ValidationError(
                    "This user is already a member of the organization."
                )
        
        # Check for pending invite
        existing_invite = Invite.objects.filter(
            email=value,
            tenant=tenant,
            status='pending'
        ).first()
        
        if existing_invite and existing_invite.is_valid:
            raise serializers.ValidationError(
                "A pending invite already exists for this email."
            )
        
        return value


class AcceptInviteSerializer(serializers.Serializer):
    """Serializer for accepting an invite."""
    
    token = serializers.CharField(max_length=64)
    
    def validate_token(self, value):
        """Validate that token exists and is valid."""
        try:
            invite = Invite.objects.get(token=value)
        except Invite.DoesNotExist:
            raise serializers.ValidationError("Invalid invite token.")
        
        if not invite.is_valid:
            if invite.is_expired:
                invite.status = 'expired'
                invite.save()
                raise serializers.ValidationError("This invite has expired.")
            raise serializers.ValidationError("This invite is no longer valid.")
        
        self.context['invite'] = invite
        return value


class TeamStatsSerializer(serializers.Serializer):
    """Serializer for team statistics."""
    
    total_members = serializers.IntegerField()
    active_members = serializers.IntegerField()
    pending_invites = serializers.IntegerField()
    members_by_role = serializers.DictField()
    members_by_status = serializers.DictField()
