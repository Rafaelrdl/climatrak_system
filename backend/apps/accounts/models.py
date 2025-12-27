"""
User and membership models for authentication and multi-tenant access.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import secrets
from datetime import timedelta


class User(AbstractUser):
    """
    Custom User model with additional fields for profile management.
    
    Extends Django's AbstractUser with:
    - Avatar image support (stored in MinIO)
    - Phone number
    - Bio/description
    - Email verification status
    - Timezone preference
    """
    
    # Profile fields
    email = models.EmailField('Email', unique=True)
    avatar = models.CharField('Avatar URL', max_length=500, blank=True, null=True)
    phone = models.CharField('Phone', max_length=20, blank=True, null=True)
    bio = models.TextField('Bio', blank=True, null=True)
    
    # Preferences
    timezone = models.CharField('Timezone', max_length=50, default='America/Sao_Paulo')
    time_format = models.CharField(
        'Time Format',
        max_length=3,
        choices=[('12h', '12 hours'), ('24h', '24 hours')],
        default='24h'
    )
    
    # Alert preferences
    alert_cooldown_minutes = models.PositiveIntegerField(
        'Alert Cooldown (minutes)',
        default=60,
        help_text='Minimum interval between alerts for the same variable (in minutes)'
    )
    
    # Status
    email_verified = models.BooleanField('Email Verified', default=False)
    last_login_ip = models.GenericIPAddressField('Last Login IP', blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField('Created At', auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField('Updated At', auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.email or self.username
    
    @property
    def full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    @property
    def initials(self):
        """Return the user's initials for avatar fallback."""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name:
            return self.first_name[0].upper()
        return self.username[0].upper() if self.username else "U"


class TenantMembership(models.Model):
    """
    Represents a user's membership in a tenant organization.
    
    Roles:
    - owner: Full access, can delete tenant, manage billing
    - admin: Full access except tenant deletion and billing
    - operator: Read/write access to assets, sensors, telemetry
    - technician: Can execute work orders and update equipment status
    - viewer: Read-only access to all data
    """
    
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Administrator'),
        ('operator', 'Operator'),
        ('technician', 'Technician'),
        ('viewer', 'Viewer'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]
    
    # Relations
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='User'
    )
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='Tenant'
    )
    
    # Membership details
    role = models.CharField('Role', max_length=20, choices=ROLE_CHOICES, default='viewer')
    status = models.CharField('Status', max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Metadata
    invited_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_memberships',
        verbose_name='Invited By'
    )
    joined_at = models.DateTimeField('Joined At', auto_now_add=True)
    updated_at = models.DateTimeField('Updated At', auto_now=True)
    
    class Meta:
        db_table = 'tenant_memberships'
        verbose_name = 'Tenant Membership'
        verbose_name_plural = 'Tenant Memberships'
        unique_together = [('user', 'tenant')]
        ordering = ['-joined_at']
        indexes = [
            models.Index(fields=['tenant', 'role']),
            models.Index(fields=['user', 'status']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.tenant.name} ({self.role})"
    
    def clean(self):
        """Validate that a tenant has at least one owner."""
        super().clean()
        
        # If changing role from owner, ensure there's at least one other owner
        if self.pk and self.role != 'owner':
            try:
                old_membership = TenantMembership.objects.get(pk=self.pk)
                if old_membership.role == 'owner':
                    other_owners = TenantMembership.objects.filter(
                        tenant=self.tenant,
                        role='owner',
                        status='active'
                    ).exclude(pk=self.pk).count()
                    
                    if other_owners == 0:
                        raise ValidationError(
                            "Cannot change role: tenant must have at least one active owner."
                        )
            except TenantMembership.DoesNotExist:
                pass
    
    @property
    def is_active(self):
        """Check if membership is active."""
        return self.status == 'active'
    
    @property
    def can_manage_team(self):
        """Check if user can manage team members."""
        return self.role in ['owner', 'admin'] and self.is_active
    
    @property
    def can_write(self):
        """Check if user has write permissions."""
        return self.role in ['owner', 'admin', 'operator'] and self.is_active
    
    @property
    def can_delete_tenant(self):
        """Check if user can delete the tenant."""
        return self.role == 'owner' and self.is_active


class Invite(models.Model):
    """
    Invitation to join a tenant organization.
    
    Workflow:
    1. Admin/Owner creates invite with email and role
    2. System generates secure token and sends email
    3. Recipient clicks link with token
    4. System validates token and creates membership
    5. Invite is marked as accepted
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Relations
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='invites',
        verbose_name='Tenant'
    )
    invited_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invites',
        verbose_name='Invited By'
    )
    accepted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invites',
        verbose_name='Accepted By'
    )
    
    # Invite details
    email = models.EmailField('Email', max_length=255)
    role = models.CharField(
        'Role',
        max_length=20,
        choices=TenantMembership.ROLE_CHOICES,
        default='viewer'
    )
    token = models.CharField('Token', max_length=64, unique=True, editable=False)
    status = models.CharField('Status', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Optional message
    message = models.TextField('Message', blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField('Created At', auto_now_add=True)
    expires_at = models.DateTimeField('Expires At')
    accepted_at = models.DateTimeField('Accepted At', null=True, blank=True)
    
    class Meta:
        db_table = 'invites'
        verbose_name = 'Invite'
        verbose_name_plural = 'Invites'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['tenant', 'status']),
        ]
    
    def __str__(self):
        return f"Invite {self.email} to {self.tenant.name} ({self.status})"
    
    def save(self, *args, **kwargs):
        """Generate token and expiration date on creation."""
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        
        if not self.expires_at:
            # Default: 7 days expiration
            self.expires_at = timezone.now() + timedelta(days=7)
        
        super().save(*args, **kwargs)
    
    @property
    def is_valid(self):
        """Check if invite is still valid."""
        return (
            self.status == 'pending' and
            self.expires_at > timezone.now()
        )
    
    @property
    def is_expired(self):
        """Check if invite has expired."""
        return self.expires_at <= timezone.now()
    
    def accept(self, user):
        """
        Accept the invite and create membership.
        
        Args:
            user: User object accepting the invite
            
        Returns:
            TenantMembership: The created membership
            
        Raises:
            ValidationError: If invite is invalid
        """
        # 🆕 Validar que o email do usuário corresponde ao convite
        if user.email.lower() != self.email.lower():
            raise ValidationError(
                "This invite was sent to a different email address. "
                f"Expected: {self.email}, but got: {user.email}"
            )
        
        if not self.is_valid:
            if self.is_expired:
                self.status = 'expired'
                self.save()
                raise ValidationError("This invite has expired.")
            raise ValidationError("This invite is no longer valid.")
        
        # Check if user already has membership
        existing = TenantMembership.objects.filter(
            user=user,
            tenant=self.tenant
        ).first()
        
        if existing:
            raise ValidationError("You are already a member of this organization.")
        
        # Create membership
        membership = TenantMembership.objects.create(
            user=user,
            tenant=self.tenant,
            role=self.role,
            status='active',
            invited_by=self.invited_by
        )
        
        # Mark invite as accepted
        self.status = 'accepted'
        self.accepted_by = user
        self.accepted_at = timezone.now()
        self.save()
        
        return membership
    
    def cancel(self):
        """Cancel the invite."""
        if self.status == 'pending':
            self.status = 'cancelled'
            self.save()


class PasswordResetToken(models.Model):
    """
    Token for password reset requests.
    
    Security features:
    - Token expires after 1 hour
    - Token can only be used once
    - Old tokens are invalidated when new one is created
    """
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='User'
    )
    token = models.CharField('Token', max_length=64, unique=True)
    created_at = models.DateTimeField('Created At', auto_now_add=True)
    expires_at = models.DateTimeField('Expires At')
    used = models.BooleanField('Used', default=False)
    
    class Meta:
        db_table = 'password_reset_tokens'
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'used']),
        ]
    
    def __str__(self):
        return f"Password reset for {self.user.email}"
    
    def is_expired(self):
        """Check if token has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if token is still valid."""
        return not self.used and not self.is_expired()