"""
Signals for public_identity app.

This module contains signals that synchronize User data from tenant schemas
to the public TenantUserIndex and TenantMembership tables.

Architecture:
- User lives ONLY in tenant schemas
- When a User is created/updated/deleted in a tenant, these signals fire
- Signals create/update/delete corresponding entries in public schema

IMPORTANT: These signals run AFTER the User is saved in the tenant schema.
"""

import logging

from django.db.models.signals import post_save, pre_delete
from django_tenants.utils import schema_context

from .models import TenantMembership, TenantUserIndex, compute_email_hash

logger = logging.getLogger(__name__)


def get_current_tenant():
    """
    Get the current tenant from connection.

    Returns None if we're in public schema.
    """
    try:
        from django.db import connection

        # If schema is 'public', there's no tenant
        if connection.schema_name == "public":
            return None

        # Get the tenant from the connection
        tenant = getattr(connection, "tenant", None)
        return tenant
    except Exception as e:
        logger.debug(f"Could not get current tenant: {e}")
        return None


def sync_user_to_public_index(
    tenant,
    user,
    created: bool = False,
    default_role: str = None,
    membership_status: str = None,
):
    """
    Sync a User from tenant schema to public TenantUserIndex and TenantMembership.

    IMPORTANTE: No schema público armazenamos APENAS:
    - TenantUserIndex: email_hash + tenant (para descoberta no login)
    - TenantMembership: email_hash + tenant + role (para permissões)

    Dados do usuário (nome, avatar, etc.) ficam APENAS no schema do tenant.

    Args:
        tenant: The tenant instance
        user: The User instance that was saved
        created: Whether this is a new user
        default_role: Role to assign if creating new membership (fallback)
        membership_status: Status to persist from tenant membership (optional)
    """
    if not tenant:
        logger.debug("No tenant found, skipping sync")
        return

    email = user.email.lower().strip()
    email_hash = compute_email_hash(email)

    # Try to get role and status from tenant's TenantMembership (apps.accounts)
    # This is the source of truth for the user's role
    role_from_tenant = None
    status_from_tenant = None
    try:
        # Import here to avoid circular imports
        from apps.accounts.models import TenantMembership as TenantTenantMembership

        tenant_membership = TenantTenantMembership.objects.filter(
            user=user,
            tenant=tenant,
        ).first()

        if tenant_membership:
            role_from_tenant = tenant_membership.role
            status_from_tenant = tenant_membership.status
            logger.debug(
                f"Found role {role_from_tenant} from tenant membership for {email}"
            )
    except Exception as e:
        logger.debug(f"Could not get role from tenant membership: {e}")

    # Determine which role to use (priority: tenant membership > default_role)
    role_to_use = role_from_tenant or default_role
    status_to_use = membership_status or status_from_tenant
    if status_to_use not in ["active", "inactive", "suspended"]:
        status_to_use = "active" if user.is_active else "inactive"
    is_active = bool(user.is_active and status_to_use == "active")

    # We need to switch to public schema to update public tables
    try:
        with schema_context("public"):
            # Update or create TenantUserIndex (APENAS para descoberta)
            # Armazena: email_hash + tenant + is_active
            TenantUserIndex.create_or_update_index(
                tenant=tenant, email=email, is_active=is_active
            )

            # Update or create TenantMembership in public schema (APENAS para role)
            # Armazena: email_hash + tenant + role + status
            membership, membership_created = TenantMembership.objects.update_or_create(
                email_hash=email_hash,
                tenant=tenant,
                defaults={
                    "status": status_to_use,
                },
            )

            # Update role if we have one
            if role_to_use:
                if membership.role != role_to_use:
                    logger.info(
                        f"Updating role for user in public schema from {membership.role} to {role_to_use}"
                    )
                    membership.role = role_to_use
                    membership.save(update_fields=["role"])

            action = "created" if created else "updated"
            logger.info(
                f"User {action} in tenant {tenant.schema_name}, synced to public index with role {membership.role}"
            )

    except Exception as e:
        logger.exception(f"Error syncing user to public index: {e}")


def remove_user_from_public_index(tenant, email: str, user_id: int = None):
    """
    Remove or deactivate a User from public TenantUserIndex and TenantMembership.

    Args:
        tenant: The tenant instance
        email: The user's email
        user_id: The user's ID (optional)
    """
    if not tenant:
        logger.debug("No tenant found, skipping removal")
        return

    email = email.lower().strip()
    email_hash = compute_email_hash(email)

    try:
        with schema_context("public"):
            # Remove from TenantUserIndex
            TenantUserIndex.remove_index(tenant, email)

            # Deactivate TenantMembership (keep for audit trail)
            TenantMembership.objects.filter(
                email_hash=email_hash, tenant=tenant
            ).update(status="inactive")

            logger.info(
                f"User removed from tenant {tenant.schema_name}, deactivated in public index"
            )

    except Exception as e:
        logger.exception(f"Error removing user from public index: {e}")


# ============================================================================
# Signal Handlers
# ============================================================================


def user_post_save_handler(sender, instance, created, **kwargs):
    """
    Signal handler for User post_save.

    Syncs the User to public TenantUserIndex and TenantMembership.

    This is connected dynamically in connect_signals() to avoid import issues.
    """
    # Skip if this is a fixture load or raw save
    if kwargs.get("raw", False):
        return

    tenant = get_current_tenant()
    if not tenant:
        return

    # Determine default role for new users
    default_role = None
    if created:
        # Check if this is the first user (tenant owner)
        from django.contrib.auth import get_user_model

        User = get_user_model()
        if User.objects.count() == 1:
            default_role = "owner"
        else:
            default_role = "viewer"  # Default role for new users

    sync_user_to_public_index(tenant, instance, created, default_role)


def user_pre_delete_handler(sender, instance, **kwargs):
    """
    Signal handler for User pre_delete.

    Removes/deactivates the User from public TenantUserIndex and TenantMembership.

    We use pre_delete so we still have access to user data.
    """
    tenant = get_current_tenant()
    if not tenant:
        return

    remove_user_from_public_index(tenant, instance.email, instance.id)


def tenant_membership_post_save_handler(sender, instance, created, **kwargs):
    """
    Signal handler for TenantMembership (tenant schema) post_save.

    When a TenantMembership is created/updated in tenant schema,
    sync the role to public TenantMembership.
    """
    # Skip if this is a fixture load or raw save
    if kwargs.get("raw", False):
        return

    tenant = get_current_tenant()
    if not tenant:
        return

    # Get the user from this membership
    user = instance.user

    # Sync to public (this will now pick up the role from tenant membership)
    sync_user_to_public_index(
        tenant,
        user,
        created=False,
        default_role=instance.role,
        membership_status=instance.status,
    )


# ============================================================================
# Signal Connection
# ============================================================================

_signals_connected = False


def connect_signals():
    """
    Connect signal handlers to User and TenantMembership models.

    This must be called after Django is fully set up,
    typically from AppConfig.ready().
    """
    global _signals_connected

    if _signals_connected:
        return

    try:
        from django.contrib.auth import get_user_model

        from apps.accounts.models import TenantMembership as TenantTenantMembership

        User = get_user_model()

        # Connect User post_save
        post_save.connect(
            user_post_save_handler,
            sender=User,
            dispatch_uid="public_identity_user_post_save",
        )

        # Connect User pre_delete (not post_delete - we need the instance data)
        pre_delete.connect(
            user_pre_delete_handler,
            sender=User,
            dispatch_uid="public_identity_user_pre_delete",
        )

        # Connect TenantMembership post_save
        post_save.connect(
            tenant_membership_post_save_handler,
            sender=TenantTenantMembership,
            dispatch_uid="public_identity_tenant_membership_post_save",
        )

        _signals_connected = True
        logger.info(
            "public_identity signals connected to User and TenantMembership models"
        )

    except Exception as e:
        logger.warning(f"Could not connect public_identity signals: {e}")


def disconnect_signals():
    """
    Disconnect signal handlers from User and TenantMembership models.

    Useful for testing or migrations.
    """
    global _signals_connected

    try:
        from django.contrib.auth import get_user_model

        from apps.accounts.models import TenantMembership as TenantTenantMembership

        User = get_user_model()

        post_save.disconnect(sender=User, dispatch_uid="public_identity_user_post_save")

        pre_delete.disconnect(
            sender=User, dispatch_uid="public_identity_user_pre_delete"
        )

        post_save.disconnect(
            sender=TenantTenantMembership,
            dispatch_uid="public_identity_tenant_membership_post_save",
        )

        _signals_connected = False
        logger.info(
            "public_identity signals disconnected from User and TenantMembership models"
        )

    except Exception as e:
        logger.warning(f"Could not disconnect public_identity signals: {e}")


# ============================================================================
# Utility functions for manual sync
# ============================================================================


def sync_tenant_users_to_public(tenant):
    """
    Sync all users from a tenant to public indexes.

    Useful for:
    - Initial migration
    - Repairing out-of-sync data
    - After bulk user imports

    Args:
        tenant: The tenant to sync users from
    """
    try:
        with schema_context(tenant.schema_name):
            from django.contrib.auth import get_user_model

            User = get_user_model()

            users = User.objects.all()
            count = 0

            for user in users:
                # Determine role (first user is owner)
                role = "owner" if count == 0 else None
                sync_user_to_public_index(
                    tenant, user, created=False, default_role=role
                )
                count += 1

            logger.info(
                f"Synced {count} users from tenant {tenant.schema_name} to public index"
            )
            return count

    except Exception as e:
        logger.exception(f"Error syncing tenant users: {e}")
        return 0


def sync_all_tenants_to_public():
    """
    Sync all users from all tenants to public indexes.

    This is a heavy operation - use sparingly!
    """
    try:
        from apps.tenants.models import Tenant

        with schema_context("public"):
            tenants = Tenant.objects.exclude(schema_name="public")

        total = 0
        for tenant in tenants:
            count = sync_tenant_users_to_public(tenant)
            total += count

        logger.info(f"Synced {total} users from all tenants to public index")
        return total

    except Exception as e:
        logger.exception(f"Error syncing all tenants: {e}")
        return 0
