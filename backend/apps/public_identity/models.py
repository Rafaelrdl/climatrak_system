"""
Models for public_identity app.

This app provides centralized identity management for multi-tenant architecture:

Architecture (100% correct multi-tenant):
- User model lives ONLY in tenant schemas (TENANT_APPS)
- TenantUserIndex: Maps email hashes to tenants (discovery, no passwords)
- TenantMembership: Stores roles/permissions (public schema, no FK to User)
- Authentication happens INSIDE each tenant schema

Key Design Decisions:
1. NO User in public schema - each tenant has isolated users with passwords
2. TenantMembership uses ONLY email_hash (NOT user_id)
3. TenantUserIndex enables login discovery without revealing tenant list
4. All password validation happens inside tenant schema context

IMPORTANTE - Dados no Schema Público:
- TenantUserIndex: APENAS email_hash + tenant + is_active
- TenantMembership: APENAS email_hash + tenant + role + status

NUNCA armazene no schema público:
- Nome do usuário (display_name)
- ID do usuário no tenant (tenant_user_id)
- Email completo ou hint
- Avatar, telefone ou outros dados pessoais

Esses dados ficam APENAS no schema do tenant e são buscados durante autenticação.

Security:
- Email is stored as HMAC-SHA256 hash (deterministic, not reversible)
- No passwords in public schema
- No user-identifying data beyond email hash
- Prevents email enumeration
- Tenant list only revealed after successful authentication
"""

import hashlib
import hmac

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def compute_email_hash(email: str) -> str:
    """
    Compute HMAC-SHA256 hash of normalized email.

    Uses Django's SECRET_KEY as the HMAC key to prevent rainbow table attacks.
    """
    normalized = email.lower().strip()
    key = settings.SECRET_KEY.encode("utf-8")
    msg = normalized.encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def get_email_domain(email: str) -> str:
    """Extract domain hint from email for debugging."""
    if "@" in email:
        return "@" + email.split("@")[1].lower()
    return ""


class TenantMembership(models.Model):
    """
    Represents a user's membership in a tenant organization.

    IMPORTANT: This model lives in PUBLIC schema and armazena APENAS:
    - email_hash: HMAC hash para lookups (não o email real)
    - tenant: FK para o tenant
    - role: papel/permissão do usuário
    - status: active/inactive/suspended

    NUNCA armazene dados do usuário (nome, id, etc.) aqui.
    Esses dados ficam no schema do tenant.

    Roles:
    - owner: Dono/responsável que assinou o contrato, acesso total incluindo billing
    - admin: Gerentes e gestores, acesso administrativo completo
    - operator: Operadores que gerenciam o sistema (planos, OS, estoques)
    - technician: Técnicos executores das ordens de serviço
    - requester: Solicitantes que abrem solicitações que viram OS
    - viewer: Acesso somente leitura (dashboards, monitores)
    """

    ROLE_CHOICES = [
        ("owner", "Proprietário"),
        ("admin", "Administrador"),
        ("operator", "Operador"),
        ("technician", "Técnico"),
        ("requester", "Solicitante"),
        ("viewer", "Visualizador"),
    ]

    STATUS_CHOICES = [
        ("active", "Ativo"),
        ("inactive", "Inativo"),
        ("suspended", "Suspenso"),
    ]

    # Tenant reference (FK - Tenant is in public schema)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="public_memberships",  # Unique name to avoid clash with accounts.TenantMembership
        verbose_name="Tenant",
    )

    # User reference via email hash (NOT FK - User is in tenant schema)
    email_hash = models.CharField(
        "Email Hash",
        max_length=64,
        db_index=True,
        help_text="HMAC-SHA256 hash of user email for lookups",
    )

    # Membership details - APENAS role e status no schema público
    role = models.CharField(
        "Role", max_length=20, choices=ROLE_CHOICES, default="viewer"
    )
    status = models.CharField(
        "Status", max_length=20, choices=STATUS_CHOICES, default="active"
    )

    # Metadata mínimo
    invited_by_email_hash = models.CharField(
        "Invited By (Email Hash)",
        max_length=64,
        blank=True,
        null=True,
        help_text="Email hash of user who sent the invite",
    )
    joined_at = models.DateTimeField("Joined At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True)

    # Campos mantidos por compatibilidade mas que serão removidos
    # TODO: Remover esses campos em uma migration futura após garantir que não são usados
    tenant_user_id = models.PositiveIntegerField(
        "Tenant User ID (deprecated)",
        null=True,
        blank=True,
        help_text="DEPRECATED - User ID in the tenant schema",
    )
    email_hint = models.CharField(
        "Email Hint (deprecated)",
        max_length=100,
        blank=True,
        help_text="DEPRECATED - Domain part of email",
    )
    display_name = models.CharField(
        "Display Name (deprecated)",
        max_length=255,
        blank=True,
        help_text="DEPRECATED - Cached user display name",
    )

    class Meta:
        db_table = "public_tenant_memberships"
        verbose_name = "Tenant Membership"
        verbose_name_plural = "Tenant Memberships"
        # Unique: one membership per email+tenant combination
        unique_together = [("email_hash", "tenant")]
        ordering = ["-joined_at"]
        indexes = [
            models.Index(fields=["tenant", "role", "status"]),
            models.Index(fields=["email_hash", "status"]),
        ]

    def __str__(self):
        return f"Membership {self.email_hash[:8]}... @ {self.tenant.name} ({self.role})"

    def clean(self):
        """Validate that a tenant has at least one owner."""
        super().clean()

        # If changing role from owner, ensure there's at least one other owner
        if self.pk and self.role != "owner":
            try:
                old_membership = TenantMembership.objects.get(pk=self.pk)
                if old_membership.role == "owner":
                    other_owners = (
                        TenantMembership.objects.filter(
                            tenant=self.tenant, role="owner", status="active"
                        )
                        .exclude(pk=self.pk)
                        .count()
                    )

                    if other_owners == 0:
                        raise ValidationError(
                            "Cannot change role: tenant must have at least one active owner."
                        )
            except TenantMembership.DoesNotExist:
                pass

    @property
    def is_active(self):
        """Check if membership is active."""
        return self.status == "active"

    @property
    def can_manage_team(self):
        """Check if user can manage team members."""
        return self.role in ["owner", "admin"] and self.is_active

    @property
    def can_write(self):
        """Check if user has general write permissions."""
        return self.role in ["owner", "admin", "operator"] and self.is_active

    @property
    def can_execute_workorders(self):
        """Check if user can execute work orders."""
        return (
            self.role in ["owner", "admin", "operator", "technician"] and self.is_active
        )

    @property
    def can_create_requests(self):
        """Check if user can create solicitations/requests."""
        return (
            self.role in ["owner", "admin", "operator", "technician", "requester"]
            and self.is_active
        )

    @classmethod
    def get_for_user(cls, email: str, tenant=None):
        """
        Get membership(s) for a user by email.

        Args:
            email: User's email address
            tenant: Optional tenant to filter by

        Returns:
            QuerySet of TenantMembership
        """
        email_hash = compute_email_hash(email)
        qs = cls.objects.filter(email_hash=email_hash, status="active")
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs.select_related("tenant")

    @classmethod
    def get_user_tenants(cls, email: str):
        """
        Get all tenants a user belongs to.

        Args:
            email: User's email address

        Returns:
            List of dicts with tenant info and role
        """
        memberships = cls.get_for_user(email)
        return [
            {
                "tenant_id": m.tenant.id,
                "schema_name": m.tenant.schema_name,
                "name": m.tenant.name,
                "slug": getattr(m.tenant, "slug", m.tenant.schema_name.lower()),
                "role": m.role,
            }
            for m in memberships
        ]

    @classmethod
    def create_membership(
        cls, tenant, email: str, role: str = "viewer", invited_by_email: str = None
    ):
        """
        Create a new membership for a user in a tenant.

        IMPORTANTE: Armazenamos APENAS email_hash + tenant + role + status.
        Dados do usuário (nome, id, etc.) ficam no schema do tenant.

        Args:
            tenant: Tenant instance
            email: User's email address
            role: Role to assign
            invited_by_email: Email of user who invited (optional)
        """
        email_hash = compute_email_hash(email)
        invited_by_hash = (
            compute_email_hash(invited_by_email) if invited_by_email else None
        )

        return cls.objects.create(
            tenant=tenant,
            email_hash=email_hash,
            role=role,
            invited_by_email_hash=invited_by_hash,
        )

    @classmethod
    def update_membership(
        cls, tenant, email: str, role: str = None, status: str = None
    ):
        """
        Update an existing membership.

        IMPORTANTE: Apenas role e status podem ser atualizados.

        Args:
            tenant: Tenant instance
            email: User's email address
            role: New role
            status: New status
        """
        email_hash = compute_email_hash(email)

        try:
            membership = cls.objects.get(email_hash=email_hash, tenant=tenant)

            if role is not None:
                membership.role = role
            if status is not None:
                membership.status = status

            membership.save()
            return membership

        except cls.DoesNotExist:
            return None


class TenantUserIndex(models.Model):
    """
    Index mapping email hashes to tenants for centralized login discovery.

    This model lives ONLY in the public schema and allows the login endpoint
    to discover which tenant(s) a user belongs to without storing their
    credentials in the public schema.

    Flow:
    1. User enters email + password at login
    2. System computes identifier_hash from email
    3. System queries TenantUserIndex to find candidate tenants
    4. For each candidate, system tries authenticate() in that schema
    5. If password matches in a tenant, login succeeds

    Security considerations:
    - identifier_hash is HMAC-SHA256, not plain hash (requires secret key)
    - email_hint stores only domain for debugging (e.g., "@gmail.com")
    - No password or email cleartext stored
    """

    # Tenant reference (lives in public schema)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="user_index_entries",
        verbose_name="Tenant",
    )

    # HMAC hash of normalized email (lowercase, trimmed)
    # Format: HMAC-SHA256(SECRET_KEY, normalized_email)
    # Este é o ÚNICO dado do usuário armazenado - apenas o hash do email
    identifier_hash = models.CharField(
        "Identifier Hash",
        max_length=64,
        db_index=True,
        help_text="HMAC-SHA256 hash of the user email",
    )

    # Status
    is_active = models.BooleanField(
        "Is Active", default=True, help_text="Whether this index entry is active"
    )

    # Timestamps
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True)

    # Campos mantidos por compatibilidade mas que serão removidos
    # TODO: Remover esses campos em uma migration futura após garantir que não são usados
    email_hint = models.CharField(
        "Email Hint (deprecated)",
        max_length=100,
        blank=True,
        null=True,
        help_text="DEPRECATED - Domain part of email",
    )
    tenant_user_id = models.PositiveIntegerField(
        "Tenant User ID (deprecated)",
        null=True,
        blank=True,
        help_text="DEPRECATED - User ID in tenant schema",
    )

    class Meta:
        db_table = "public_tenant_user_index"
        verbose_name = "Tenant User Index"
        verbose_name_plural = "Tenant User Index Entries"
        # Unique constraint: one entry per email+tenant combination
        unique_together = [("identifier_hash", "tenant")]
        indexes = [
            models.Index(fields=["identifier_hash", "is_active"]),
            models.Index(fields=["tenant", "is_active"]),
        ]

    def __str__(self):
        return f"Index {self.identifier_hash[:8]}... @ {self.tenant.schema_name}"

    @classmethod
    def compute_hash(cls, email: str) -> str:
        """
        Compute HMAC-SHA256 hash of normalized email.

        Uses Django's SECRET_KEY as the HMAC key to prevent
        rainbow table attacks.

        Args:
            email: User's email address

        Returns:
            64-character hex string (HMAC-SHA256)
        """
        normalized = email.lower().strip()
        key = settings.SECRET_KEY.encode("utf-8")
        msg = normalized.encode("utf-8")
        return hmac.new(key, msg, hashlib.sha256).hexdigest()

    @classmethod
    def get_email_hint(cls, email: str) -> str:
        """
        Extract domain hint from email for debugging.

        Args:
            email: User's email address

        Returns:
            Domain part (e.g., "@company.com") or empty string
        """
        if "@" in email:
            return "@" + email.split("@")[1].lower()
        return ""

    @classmethod
    def find_tenants_for_email(cls, email: str):
        """
        Find all tenants where this email exists.

        Args:
            email: User's email address

        Returns:
            QuerySet of TenantUserIndex entries for this email
        """
        identifier_hash = cls.compute_hash(email)
        return cls.objects.filter(
            identifier_hash=identifier_hash, is_active=True
        ).select_related("tenant")

    @classmethod
    def create_or_update_index(cls, tenant, email: str, is_active: bool = True):
        """
        Create or update index entry for a user.

        Called by signals when a user is created/updated in a tenant.

        IMPORTANTE: Armazenamos APENAS o hash do email + tenant + is_active.
        Não armazenamos dados do usuário (nome, id, etc.) pois esses dados
        pertencem ao schema do tenant.

        Args:
            tenant: Tenant instance
            email: User's email address
            is_active: Whether the user is active

        Returns:
            TenantUserIndex instance (created or updated)
        """
        identifier_hash = cls.compute_hash(email)

        obj, created = cls.objects.update_or_create(
            identifier_hash=identifier_hash,
            tenant=tenant,
            defaults={
                "is_active": is_active,
            },
        )
        return obj

    @classmethod
    def remove_index(cls, tenant, email: str):
        """
        Remove index entry for a user.

        Called by signals when a user is deleted from a tenant.

        Args:
            tenant: Tenant instance
            email: User's email address
        """
        identifier_hash = cls.compute_hash(email)
        cls.objects.filter(identifier_hash=identifier_hash, tenant=tenant).delete()


class TenantInvite(models.Model):
    """
    Invitation for a user to join a tenant.

    Lives in public schema to allow invite validation before user exists.
    When accepted, creates User in tenant schema + TenantMembership + TenantUserIndex.
    """

    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("accepted", "Aceito"),
        ("expired", "Expirado"),
        ("revoked", "Revogado"),
    ]

    # Tenant to join
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="public_invites",  # Unique name to avoid clash with accounts.Invite
        verbose_name="Tenant",
    )

    # Invite details
    email = models.EmailField("Email", help_text="Email address to invite")
    email_hash = models.CharField(
        "Email Hash", max_length=64, db_index=True, help_text="HMAC hash for lookups"
    )
    role = models.CharField(
        "Role", max_length=20, choices=TenantMembership.ROLE_CHOICES, default="viewer"
    )

    # Security
    token = models.CharField(
        "Token", max_length=64, unique=True, help_text="Unique token for invite URL"
    )

    # Status
    status = models.CharField(
        "Status", max_length=20, choices=STATUS_CHOICES, default="pending"
    )

    # Metadata
    invited_by_email_hash = models.CharField(
        "Invited By (Email Hash)", max_length=64, blank=True, null=True
    )
    message = models.TextField(
        "Message", blank=True, help_text="Optional message to invitee"
    )

    # Timestamps
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    expires_at = models.DateTimeField("Expires At")
    accepted_at = models.DateTimeField("Accepted At", null=True, blank=True)

    class Meta:
        db_table = "public_tenant_invites"
        verbose_name = "Tenant Invite"
        verbose_name_plural = "Tenant Invites"
        indexes = [
            models.Index(fields=["token"]),
            models.Index(fields=["email_hash", "status"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def __str__(self):
        return f"Invite to {self.tenant.name} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-compute email_hash
        if self.email and not self.email_hash:
            self.email_hash = compute_email_hash(self.email)

        # Generate token if not set
        if not self.token:
            import secrets

            self.token = secrets.token_urlsafe(48)

        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Check if invite is still valid."""
        from django.utils import timezone

        return self.status == "pending" and self.expires_at > timezone.now()

    @classmethod
    def get_by_token(cls, token: str):
        """Get invite by token."""
        try:
            return cls.objects.select_related("tenant").get(token=token)
        except cls.DoesNotExist:
            return None

    @classmethod
    def create_invite(
        cls,
        tenant,
        email: str,
        role: str,
        invited_by_email: str = None,
        message: str = "",
        expires_days: int = 7,
    ):
        """
        Create a new invite.

        Args:
            tenant: Tenant to invite to
            email: Email to invite
            role: Role to assign when accepted
            invited_by_email: Email of inviter
            message: Optional message
            expires_days: Days until expiration
        """
        from datetime import timedelta

        from django.utils import timezone

        return cls.objects.create(
            tenant=tenant,
            email=email.lower().strip(),
            role=role,
            invited_by_email_hash=(
                compute_email_hash(invited_by_email) if invited_by_email else None
            ),
            message=message,
            expires_at=timezone.now() + timedelta(days=expires_days),
        )
