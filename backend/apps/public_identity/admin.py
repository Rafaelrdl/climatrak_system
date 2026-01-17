"""
Admin configuration for public_identity app.

NOTA: Os models no schema público armazenam APENAS:
- TenantUserIndex: email_hash + tenant + is_active
- TenantMembership: email_hash + tenant + role + status

Dados do usuário (nome, etc.) ficam APENAS no schema do tenant.
"""

from django.contrib import admin
from django.utils.html import format_html

from apps.common.admin_base import BaseAdmin

from .models import TenantInvite, TenantMembership, TenantUserIndex


@admin.register(TenantMembership)
class TenantMembershipAdmin(BaseAdmin):
    """Admin for TenantMembership (public schema)."""

    list_display = [
        "id",
        "tenant",
        "email_hash_short",
        "role_badge",
        "status_badge",
        "joined_at",
    ]

    list_filter = [
        "status",
        "role",
        "tenant",
    ]

    search_fields = [
        "email_hash",
    ]

    readonly_fields = [
        "email_hash",
        "joined_at",
        "updated_at",
    ]

    list_editable = (
        ["role", "status"] if False else []
    )  # Disable inline editing for safety

    fieldsets = (
        ("Tenant & User", {"fields": ("tenant", "email_hash")}),
        ("Role & Status", {"fields": ("role", "status")}),
        (
            "Metadata",
            {
                "fields": ("invited_by_email_hash", "joined_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def email_hash_short(self, obj):
        """Show truncated email hash for display."""
        return f"{obj.email_hash[:12]}..."

    email_hash_short.short_description = "Email Hash"

    def role_badge(self, obj):
        colors = {
            "owner": "#9333ea",  # Purple
            "admin": "#dc2626",  # Red
            "operator": "#2563eb",  # Blue
            "technician": "#16a34a",  # Green
            "requester": "#0891b2",  # Cyan
            "viewer": "#6b7280",  # Gray
        }
        color = colors.get(obj.role, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_role_display(),
        )

    role_badge.short_description = "Role"
    role_badge.admin_order_field = "role"

    def status_badge(self, obj):
        colors = {
            "active": "#16a34a",
            "inactive": "#6b7280",
            "suspended": "#dc2626",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"


@admin.register(TenantUserIndex)
class TenantUserIndexAdmin(BaseAdmin):
    """Admin for TenantUserIndex - read-only for security.

    Este model armazena APENAS email_hash + tenant para descoberta de tenants no login.
    """

    list_display = [
        "id",
        "tenant",
        "identifier_hash_short",
        "is_active",
        "created_at",
    ]

    list_filter = [
        "is_active",
        "tenant",
        "created_at",
    ]

    search_fields = [
        "identifier_hash",
    ]

    readonly_fields = [
        "identifier_hash",
        "created_at",
        "updated_at",
    ]

    # Prevent manual creation - entries should only come from signals
    def has_add_permission(self, request):
        return False

    # Allow deletion for cleanup
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    # Only allow changing is_active
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ["tenant"]
        return self.readonly_fields

    def identifier_hash_short(self, obj):
        """Show truncated identifier hash for display."""
        return f"{obj.identifier_hash[:12]}..."

    identifier_hash_short.short_description = "Identifier Hash"


@admin.register(TenantInvite)
class TenantInviteAdmin(BaseAdmin):
    """Admin for TenantInvite."""

    list_display = [
        "id",
        "tenant",
        "email",
        "role",
        "status_badge",
        "is_valid_badge",
        "created_at",
        "expires_at",
    ]

    list_filter = [
        "status",
        "role",
        "tenant",
        "created_at",
    ]

    search_fields = [
        "email",
        "token",
    ]

    readonly_fields = [
        "token",
        "email_hash",
        "created_at",
        "accepted_at",
    ]

    fieldsets = (
        ("Invite Details", {"fields": ("tenant", "email", "role", "message")}),
        ("Security", {"fields": ("token", "email_hash"), "classes": ("collapse",)}),
        ("Status", {"fields": ("status", "expires_at", "accepted_at")}),
        (
            "Metadata",
            {
                "fields": ("invited_by_email_hash", "created_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",
            "accepted": "#16a34a",
            "expired": "#6b7280",
            "revoked": "#dc2626",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def is_valid_badge(self, obj):
        if obj.is_valid:
            return format_html('<span style="color: #16a34a;">✓ Válido</span>')
        return format_html('<span style="color: #dc2626;">✗ Inválido</span>')

    is_valid_badge.short_description = "Valid?"
