# Generated manually to clear deprecated data

from django.db import migrations


def clear_deprecated_fields(apps, schema_editor):
    """
    Clear deprecated fields from public schema tables.

    This ensures no user-identifying data remains in public schema
    beyond the email hash which is needed for tenant discovery.
    """
    TenantMembership = apps.get_model("public_identity", "TenantMembership")
    TenantUserIndex = apps.get_model("public_identity", "TenantUserIndex")

    # Clear deprecated fields from TenantMembership
    TenantMembership.objects.update(tenant_user_id=None, email_hint="", display_name="")

    # Clear deprecated fields from TenantUserIndex
    TenantUserIndex.objects.update(tenant_user_id=None, email_hint=None)


def reverse_noop(apps, schema_editor):
    """No reverse operation - data was already cleared."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("public_identity", "0002_remove_deprecated_user_data"),
    ]

    operations = [
        migrations.RunPython(clear_deprecated_fields, reverse_noop),
    ]
