"""
Custom permissions for role-based access control.

NOTE: Membership checks use public_identity (email hash) in the public schema.

IMPORTANT: We must get the tenant object from public schema before checking
membership, because connection.tenant may be a FakeTenant object when inside
a tenant context.
"""

from django.db import connection
from rest_framework import permissions

from django_tenants.utils import schema_context


def get_current_tenant():
    """
    Get the actual Tenant object for the current connection.

    Must be called OUTSIDE of schema_context('public') because
    connection.tenant may be FakeTenant inside tenant context.
    """
    from apps.tenants.models import Tenant

    current_schema = connection.schema_name
    if current_schema == "public":
        return None

    # Get the real Tenant object from public schema
    with schema_context("public"):
        try:
            return Tenant.objects.get(schema_name=current_schema)
        except Tenant.DoesNotExist:
            return None


def get_public_membership(user, tenant):
    """
    Get membership from public_identity using email hash.
    """
    if not user or not tenant:
        return None

    from apps.public_identity.models import TenantMembership as PublicTenantMembership
    from apps.public_identity.models import compute_email_hash

    with schema_context("public"):
        email_hash = compute_email_hash(user.email)
        return PublicTenantMembership.objects.filter(
            email_hash=email_hash, tenant=tenant, status="active"
        ).first()


class IsTenantMember(permissions.BasePermission):
    """
    Permission to check if user is a member of the current tenant.
    """

    message = "You must be a member of this organization."

    def has_permission(self, request, view):
        """Check if user has membership in current tenant."""
        import logging

        logger = logging.getLogger(__name__)

        if not request.user or not request.user.is_authenticated:
            logger.warning("IsTenantMember: User not authenticated")
            return False

        # Get the real tenant object
        tenant = get_current_tenant()
        logger.info(
            f"IsTenantMember: user={request.user.email}, tenant={tenant}, schema={connection.schema_name}"
        )

        if not tenant:
            logger.warning(
                f"IsTenantMember: No tenant found for schema {connection.schema_name}"
            )
            return False

        membership = get_public_membership(request.user, tenant)
        result = membership is not None
        logger.info(f"IsTenantMember: membership check result={result}")
        return result


class CanManageTeam(permissions.BasePermission):
    """
    Permission for owner/admin to manage team members.
    """

    message = "You must be an owner or administrator to manage team members."

    def has_permission(self, request, view):
        """Check if user can manage team."""
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = get_current_tenant()
        if not tenant:
            return False

        membership = get_public_membership(request.user, tenant)
        return membership and membership.can_manage_team


class CanWrite(permissions.BasePermission):
    """
    Permission for users with write access (owner/admin/operator).
    """

    message = "You do not have write permissions."

    def has_permission(self, request, view):
        """Check if user has write permissions."""
        # Allow read operations for anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        tenant = get_current_tenant()
        if not tenant:
            return False

        membership = get_public_membership(request.user, tenant)
        return membership and membership.can_write


class IsOwner(permissions.BasePermission):
    """
    Permission for owner-only actions (tenant deletion, billing).
    """

    message = "Only the organization owner can perform this action."

    def has_permission(self, request, view):
        """Check if user is owner."""
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = get_current_tenant()
        if not tenant:
            return False

        membership = get_public_membership(request.user, tenant)
        return (
            membership and membership.role == "owner" and membership.can_delete_tenant
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission that allows owners full access, others read-only.
    """

    def has_permission(self, request, view):
        """Check permissions based on method."""
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            if not request.user or not request.user.is_authenticated:
                return False

            tenant = get_current_tenant()
            if not tenant:
                return False

            membership = get_public_membership(request.user, tenant)
            return membership is not None

        # Write operations require owner
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = get_current_tenant()
        if not tenant:
            return False

        membership = get_public_membership(request.user, tenant)
        return (
            membership and membership.role == "owner" and membership.can_delete_tenant
        )


class RoleBasedPermission(permissions.BasePermission):
    """
    Flexible permission class based on required roles.

    Available roles:
    - owner: Proprietário (acesso total, billing)
    - admin: Administrador (acesso total exceto billing)
    - operator: Operador (gerencia planos, OS, estoques)
    - technician: Técnico (executa OS)
    - requester: Solicitante (abre solicitações)
    - viewer: Visualizador (somente leitura)

    Usage in ViewSet:
        permission_classes = [RoleBasedPermission]
        required_roles = ['owner', 'admin']
    """

    # All valid roles in the system
    ALL_ROLES = ["owner", "admin", "operator", "technician", "requester", "viewer"]

    def has_permission(self, request, view):
        """Check if user has one of the required roles."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Get required roles from view
        required_roles = getattr(view, "required_roles", None)
        if not required_roles:
            # Default: allow all authenticated members
            required_roles = self.ALL_ROLES

        # Allow read operations if 'viewer' is in required roles
        if request.method in permissions.SAFE_METHODS and "viewer" in required_roles:
            required_roles = self.ALL_ROLES

        tenant = get_current_tenant()
        if not tenant:
            return False

        membership = get_public_membership(request.user, tenant)
        if not membership:
            return False

        return membership.role in required_roles
