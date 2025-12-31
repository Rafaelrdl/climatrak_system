"""
Management command to rebuild the TenantUserIndex and TenantMembership tables.

This command scans all tenants and synchronizes their users to the public schema
identity tables. Use this command:

1. After initial setup of public_identity app
2. If the index tables get out of sync
3. After bulk user imports in any tenant
4. After restoring from backup

Usage:
    python manage.py rebuild_tenant_user_index                    # All tenants
    python manage.py rebuild_tenant_user_index --tenant=acme      # Specific tenant
    python manage.py rebuild_tenant_user_index --dry-run          # Preview only
    python manage.py rebuild_tenant_user_index --clear            # Clear first
"""

import logging
from typing import Optional

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import get_tenant_model, schema_context

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Rebuild TenantUserIndex and TenantMembership from all tenant users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            type=str,
            help="Specific tenant schema name to process (optional)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview what would be done without making changes",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing index entries before rebuilding",
        )
        parser.add_argument(
            "--preserve-roles",
            action="store_true",
            default=True,
            help="Preserve existing roles from TenantMembership (default: True)",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed progress information",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        clear = options.get("clear", False)
        preserve_roles = options.get("preserve_roles", True)
        verbose = options.get("verbose", False)
        tenant_schema = options.get("tenant")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("🔍 DRY RUN MODE - No changes will be made")
            )

        # Get tenant model
        Tenant = get_tenant_model()

        # Build list of tenants to process
        with schema_context("public"):
            if tenant_schema:
                try:
                    tenants = [Tenant.objects.get(schema_name=tenant_schema)]
                except Tenant.DoesNotExist:
                    raise CommandError(f"Tenant '{tenant_schema}' not found")
            else:
                tenants = list(Tenant.objects.exclude(schema_name="public"))

        if not tenants:
            self.stdout.write(self.style.WARNING("⚠️ No tenants found to process"))
            return

        self.stdout.write(f"\n📊 Found {len(tenants)} tenant(s) to process\n")

        # Clear existing entries if requested
        if clear and not dry_run:
            self._clear_index_tables(tenant_schema)

        # Process each tenant
        total_users = 0
        total_created = 0
        total_updated = 0

        for tenant in tenants:
            created, updated = self._process_tenant(
                tenant,
                dry_run=dry_run,
                preserve_roles=preserve_roles,
                verbose=verbose,
            )
            total_users += created + updated
            total_created += created
            total_updated += updated

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Complete! Processed {total_users} users "
                f"({total_created} created, {total_updated} updated)"
            )
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠️ This was a dry run. Run without --dry-run to apply changes."
                )
            )

    def _clear_index_tables(self, tenant_schema: Optional[str] = None):
        """Clear existing index entries."""
        from apps.public_identity.models import TenantMembership, TenantUserIndex

        with schema_context("public"):
            if tenant_schema:
                from apps.tenants.models import Tenant

                try:
                    tenant = Tenant.objects.get(schema_name=tenant_schema)
                    count_idx = TenantUserIndex.objects.filter(tenant=tenant).delete()[
                        0
                    ]
                    count_mem = TenantMembership.objects.filter(tenant=tenant).delete()[
                        0
                    ]
                except Tenant.DoesNotExist:
                    count_idx = count_mem = 0
            else:
                count_idx = TenantUserIndex.objects.all().delete()[0]
                count_mem = TenantMembership.objects.all().delete()[0]

        self.stdout.write(
            self.style.WARNING(
                f"🗑️ Cleared {count_idx} TenantUserIndex + {count_mem} TenantMembership entries"
            )
        )

    def _process_tenant(
        self,
        tenant,
        dry_run: bool = False,
        preserve_roles: bool = True,
        verbose: bool = False,
    ) -> tuple[int, int]:
        """
        Process all users in a tenant.

        Returns:
            Tuple of (created_count, updated_count)
        """
        from apps.public_identity.models import (
            TenantMembership,
            TenantUserIndex,
            compute_email_hash,
        )

        self.stdout.write(
            f"\n🏢 Processing tenant: {tenant.schema_name} ({tenant.name})"
        )

        # Load existing roles if preserving
        existing_roles = {}
        if preserve_roles and not dry_run:
            with schema_context("public"):
                for membership in TenantMembership.objects.filter(tenant=tenant):
                    existing_roles[membership.email_hash] = membership.role

        # Get users from tenant schema
        created_count = 0
        updated_count = 0

        with schema_context(tenant.schema_name):
            from django.contrib.auth import get_user_model

            User = get_user_model()

            users = User.objects.all().order_by("id")
            user_count = users.count()

            self.stdout.write(f"   Found {user_count} users")

            for idx, user in enumerate(users, 1):
                email = user.email.lower().strip()
                email_hash = compute_email_hash(email)

                if verbose:
                    self.stdout.write(f"   [{idx}/{user_count}] {email}")

                if dry_run:
                    created_count += 1
                    continue

                # Determine role
                role = existing_roles.get(email_hash)
                if not role:
                    # First user is owner, rest are viewers by default
                    role = "owner" if idx == 1 else "viewer"

                # Create/update in public schema
                with schema_context("public"):
                    # TenantUserIndex
                    index_obj, index_created = TenantUserIndex.objects.update_or_create(
                        email_hash=email_hash,
                        tenant=tenant,
                        defaults={
                            "tenant_user_id": user.id,
                            "is_active": user.is_active,
                        },
                    )

                    # TenantMembership
                    (
                        membership_obj,
                        membership_created,
                    ) = TenantMembership.objects.update_or_create(
                        email_hash=email_hash,
                        tenant=tenant,
                        defaults={
                            "tenant_user_id": user.id,
                            "email_hint": TenantUserIndex.get_email_hint(email),
                            "display_name": getattr(user, "full_name", "")
                            or email.split("@")[0],
                            "role": role,
                            "status": "active" if user.is_active else "inactive",
                        },
                    )

                if index_created or membership_created:
                    created_count += 1
                else:
                    updated_count += 1

        action = "would create" if dry_run else "created"
        self.stdout.write(
            self.style.SUCCESS(
                f"   ✓ {action}: {created_count}, updated: {updated_count}"
            )
        )

        return created_count, updated_count
