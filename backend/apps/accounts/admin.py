"""
Admin configuration for User models.
"""

from django.contrib import admin
from unfold.admin import ModelAdmin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin, ModelAdmin):
    """Admin interface for User model using Unfold."""

    list_display = [
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
    ]
    search_fields = ["username", "email", "first_name", "last_name"]
    list_filter = ["is_staff", "is_superuser", "is_active"]
