"""
Admin configuration for User models.
"""

from django.contrib import admin
from django.contrib.admin import ModelAdmin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from apps.common.admin_base import get_status_color, status_badge

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin, ModelAdmin):
    """Admin interface for User model."""

    # ==========================================================================
    # List View Configuration
    # ==========================================================================
    list_display = [
        "username",
        "email",
        "full_name",
        "is_active_badge",
        "is_staff_badge",
        "last_login",
    ]
    search_fields = ["username", "email", "first_name", "last_name"]
    list_filter = ["is_staff", "is_superuser", "is_active", "date_joined"]
    date_hierarchy = "date_joined"
    ordering = ["-date_joined"]
    list_per_page = 25

    # ==========================================================================
    # Fieldsets (Change Form)
    # ==========================================================================
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            _("Personal info"),
            {"fields": ("first_name", "last_name", "email")},
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            _("Important dates"),
            {
                "fields": ("last_login", "date_joined"),
                "classes": ("collapse",),
            },
        ),
    )

    # ==========================================================================
    # Add Form Fieldsets
    # ==========================================================================
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "password1", "password2"),
            },
        ),
    )

    readonly_fields = ["last_login", "date_joined"]

    def full_name(self, obj):
        """Display full name or username."""
        name = obj.get_full_name()
        return name if name else obj.username

    full_name.short_description = _("Nome")
    full_name.admin_order_field = "first_name"

    def is_active_badge(self, obj):
        """Badge for active status."""
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    is_active_badge.short_description = _("Status")
    is_active_badge.admin_order_field = "is_active"

    def is_staff_badge(self, obj):
        """Badge for staff status."""
        if obj.is_superuser:
            return status_badge(_("Superuser"), get_status_color("danger"), "👑")
        if obj.is_staff:
            return status_badge(_("Staff"), get_status_color("info"), "🔧")
        return status_badge(_("User"), get_status_color("neutral"), "👤")

    is_staff_badge.short_description = _("Tipo")
    is_staff_badge.admin_order_field = "is_staff"
