"""
Authentication services for public_identity app.

This module provides the centralized login flow that:
1. Discovers which tenants an email belongs to (via TenantUserIndex)
2. Authenticates the user inside each candidate tenant schema
3. Returns JWT tokens and tenant information

Architecture (100% correct):
- User model lives ONLY in tenant schemas
- Authentication happens INSIDE tenant schemas (password never in public)
- TenantUserIndex provides discovery (no passwords stored)
- TenantMembership provides roles (no FK to User, uses email_hash)

Security:
- Passwords are NEVER stored or transmitted to public schema
- Authentication happens INSIDE tenant schemas
- Tenant list is only revealed after successful password validation
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from django.contrib.auth import authenticate
from django.utils import timezone

from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TenantMembership, TenantUserIndex, compute_email_hash

logger = logging.getLogger(__name__)


@dataclass
class AuthenticatedTenant:
    """Result of successful authentication in a tenant."""

    tenant_id: int
    schema_name: str
    name: str
    slug: str
    role: str
    user_id: int
    user_email: str
    user_full_name: str
    user_avatar: Optional[str] = None
    user_is_staff: bool = False


@dataclass
class LoginResult:
    """Result of the login attempt."""

    success: bool
    error: Optional[str] = None
    authenticated_tenants: List[AuthenticatedTenant] = field(default_factory=list)
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    selected_tenant: Optional[AuthenticatedTenant] = None


class TenantAuthService:
    """
    Service for tenant-aware authentication.

    This service implements the "Tenant Discovery Index" pattern:
    1. User enters email + password
    2. Service finds candidate tenants via TenantUserIndex (no password check yet)
    3. For each candidate, service tries authenticate() INSIDE that tenant's schema
    4. Returns list of tenants where authentication succeeded

    This ensures:
    - Passwords never leave tenant schemas
    - No password comparison in public schema
    - Tenant list only revealed after successful auth
    """

    @classmethod
    def discover_tenants(cls, email: str) -> List[TenantUserIndex]:
        """
        Find all tenants where this email might exist.

        Uses TenantUserIndex which stores HMAC hashes of emails.
        """
        return list(TenantUserIndex.find_tenants_for_email(email))

    @classmethod
    def authenticate_in_tenant(
        cls, tenant, email: str, password: str
    ) -> Optional[AuthenticatedTenant]:
        """
        Attempt authentication inside a specific tenant schema.

        IMPORTANT: This runs authenticate() INSIDE the tenant schema,
        so passwords are validated against the User table in that schema.
        """
        try:
            with schema_context(tenant.schema_name):
                from django.contrib.auth import get_user_model

                User = get_user_model()

                # Find user by email in this tenant
                try:
                    user = User.objects.get(email__iexact=email)
                except User.DoesNotExist:
                    logger.debug(
                        f"User {email} not found in tenant {tenant.schema_name}"
                    )
                    return None

                # Authenticate using Django's auth system (password check)
                authenticated_user = authenticate(
                    username=user.username, password=password
                )

                if not authenticated_user:
                    logger.debug(
                        f"Password mismatch for {email} in tenant {tenant.schema_name}"
                    )
                    return None

                if not authenticated_user.is_active:
                    logger.debug(
                        f"User {email} is inactive in tenant {tenant.schema_name}"
                    )
                    return None

                # Update last login
                authenticated_user.last_login = timezone.now()
                authenticated_user.save(update_fields=["last_login"])

                # Get role from TenantMembership (in public schema)
                role = cls._get_user_role(email, tenant)

                return AuthenticatedTenant(
                    tenant_id=tenant.id,
                    schema_name=tenant.schema_name,
                    name=tenant.name,
                    slug=getattr(tenant, "slug", tenant.schema_name.lower()),
                    role=role,
                    user_id=authenticated_user.id,
                    user_email=authenticated_user.email,
                    user_full_name=getattr(authenticated_user, "full_name", "")
                    or authenticated_user.email,
                    user_avatar=getattr(authenticated_user, "avatar", None),
                    user_is_staff=authenticated_user.is_staff,
                )

        except Exception as e:
            logger.exception(
                f"Error authenticating in tenant {tenant.schema_name}: {e}"
            )
            return None

    @classmethod
    def _get_user_role(cls, email: str, tenant) -> str:
        """
        Get user's role in the tenant from TenantMembership.

        TenantMembership lives in public schema and uses email_hash, not FK.
        """
        try:
            email_hash = compute_email_hash(email)
            membership = TenantMembership.objects.filter(
                email_hash=email_hash, tenant=tenant, status="active"
            ).first()

            if membership:
                return membership.role

        except Exception as e:
            logger.exception(
                f"Error getting role for {email} in tenant {tenant.id}: {e}"
            )

        return "viewer"  # Default role

    @classmethod
    def login(cls, email: str, password: str) -> LoginResult:
        """
        Perform centralized login across all candidate tenants.

        Security flow:
        1. Discover candidate tenants (via email hash, NOT actual emails)
        2. Try authentication in each tenant (password check happens IN tenant schema)
        3. Only return tenant list if at least one authentication succeeded
        4. Generate JWT tokens for successful authentication
        """
        email = email.lower().strip()

        # Step 1: Discover candidate tenants
        candidates = cls.discover_tenants(email)

        if not candidates:
            logger.info("Login attempt for unknown email hash")
            return LoginResult(success=False, error="Credenciais inválidas.")

        # Step 2: Try authentication in each candidate tenant
        authenticated_tenants: List[AuthenticatedTenant] = []

        for index_entry in candidates:
            tenant = index_entry.tenant
            result = cls.authenticate_in_tenant(tenant, email, password)
            if result:
                authenticated_tenants.append(result)

        # Step 3: Check results
        if not authenticated_tenants:
            logger.info("Login failed: password mismatch in all candidate tenants")
            return LoginResult(success=False, error="Credenciais inválidas.")

        # Step 4: Generate tokens using first tenant's user
        first_auth = authenticated_tenants[0]
        access_token, refresh_token = cls._generate_tokens(
            first_auth.schema_name, first_auth.user_id, first_auth.user_email
        )

        logger.info(
            f"Login successful for {email} in {len(authenticated_tenants)} tenant(s)"
        )

        return LoginResult(
            success=True,
            authenticated_tenants=authenticated_tenants,
            access_token=access_token,
            refresh_token=refresh_token,
            selected_tenant=first_auth if len(authenticated_tenants) == 1 else None,
        )

    @classmethod
    def _generate_tokens(
        cls, schema_name: str, user_id: int, user_email: str
    ) -> Tuple[str, str]:
        """Generate JWT tokens for a user in a tenant."""
        with schema_context(schema_name):
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.get(id=user_id)

            refresh = RefreshToken.for_user(user)
            refresh["tenant_schema"] = schema_name
            refresh["user_email"] = user_email

            return str(refresh.access_token), str(refresh)

    @classmethod
    def select_tenant(cls, email: str, password: str, schema_name: str) -> LoginResult:
        """
        Authenticate and select a specific tenant.

        Used when user has multiple tenants and selects one.
        """
        email = email.lower().strip()

        # Find the specific tenant
        try:
            from apps.tenants.models import Tenant

            tenant = Tenant.objects.get(schema_name=schema_name)
        except Exception:
            return LoginResult(success=False, error="Tenant não encontrado.")

        # Authenticate in that tenant
        auth_result = cls.authenticate_in_tenant(tenant, email, password)

        if not auth_result:
            return LoginResult(success=False, error="Credenciais inválidas.")

        # Generate tokens
        access_token, refresh_token = cls._generate_tokens(
            schema_name, auth_result.user_id, auth_result.user_email
        )

        return LoginResult(
            success=True,
            authenticated_tenants=[auth_result],
            access_token=access_token,
            refresh_token=refresh_token,
            selected_tenant=auth_result,
        )

    @classmethod
    def sync_user_to_public(cls, tenant, user, role: str = None):
        """
        Sync a user from tenant schema to public indexes.

        Called by signals when User is created/updated in a tenant.

        IMPORTANTE: No schema público armazenamos APENAS:
        - TenantUserIndex: email_hash + tenant (para descoberta no login)
        - TenantMembership: email_hash + tenant + role (para permissões)

        Dados do usuário (nome, avatar, etc.) ficam APENAS no schema do tenant.
        """
        email = user.email.lower().strip()

        # Update TenantUserIndex (apenas email_hash + tenant)
        TenantUserIndex.create_or_update_index(
            tenant=tenant, email=email, is_active=user.is_active
        )

        # Update or create TenantMembership (apenas email_hash + tenant + role + status)
        email_hash = compute_email_hash(email)
        membership, created = TenantMembership.objects.update_or_create(
            email_hash=email_hash,
            tenant=tenant,
            defaults={
                "status": "active" if user.is_active else "inactive",
            },
        )

        # Set role only on creation or if explicitly provided
        if created and role:
            membership.role = role
            membership.save(update_fields=["role"])
        elif role:
            membership.role = role
            membership.save(update_fields=["role"])

        return membership

    @classmethod
    def remove_user_from_public(cls, tenant, email: str):
        """
        Remove user from public indexes when deleted from tenant.
        """
        email = email.lower().strip()

        # Remove from TenantUserIndex
        TenantUserIndex.remove_index(tenant, email)

        # Deactivate TenantMembership (don't delete for audit)
        TenantMembership.update_membership(
            tenant=tenant, email=email, status="inactive"
        )
