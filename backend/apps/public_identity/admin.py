"""
Admin configuration for public_identity app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import TenantUserIndex, TenantMembership, TenantInvite


@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    """Admin for TenantMembership."""
    
    list_display = [
        'id',
        'tenant',
        'display_name',
        'email_hint',
        'role_badge',
        'status_badge',
        'joined_at',
    ]
    
    list_filter = [
        'status',
        'role',
        'tenant',
    ]
    
    search_fields = [
        'email_hint',
        'display_name',
        'email_hash',
    ]
    
    readonly_fields = [
        'email_hash',
        'tenant_user_id',
        'joined_at',
        'updated_at',
    ]
    
    list_editable = ['role', 'status'] if False else []  # Disable inline editing for safety
    
    fieldsets = (
        ('Tenant & User', {
            'fields': ('tenant', 'email_hash', 'email_hint', 'display_name', 'tenant_user_id')
        }),
        ('Role & Status', {
            'fields': ('role', 'status')
        }),
        ('Metadata', {
            'fields': ('invited_by_email_hash', 'joined_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def role_badge(self, obj):
        colors = {
            'owner': '#9333ea',      # Purple
            'admin': '#dc2626',      # Red
            'operator': '#2563eb',   # Blue
            'technician': '#16a34a', # Green
            'requester': '#0891b2',  # Cyan
            'viewer': '#6b7280',     # Gray
        }
        color = colors.get(obj.role, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_role_display()
        )
    role_badge.short_description = 'Role'
    role_badge.admin_order_field = 'role'
    
    def status_badge(self, obj):
        colors = {
            'active': '#16a34a',
            'inactive': '#6b7280',
            'suspended': '#dc2626',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'


@admin.register(TenantUserIndex)
class TenantUserIndexAdmin(admin.ModelAdmin):
    """Admin for TenantUserIndex - read-only for security."""
    
    list_display = [
        'id',
        'tenant',
        'email_hint',
        'tenant_user_id',
        'is_active',
        'created_at',
        'updated_at',
    ]
    
    list_filter = [
        'is_active',
        'tenant',
        'created_at',
    ]
    
    search_fields = [
        'email_hint',
        'identifier_hash',
    ]
    
    readonly_fields = [
        'identifier_hash',
        'email_hint',
        'tenant_user_id',
        'created_at',
        'updated_at',
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
            return self.readonly_fields + ['tenant']
        return self.readonly_fields


@admin.register(TenantInvite)
class TenantInviteAdmin(admin.ModelAdmin):
    """Admin for TenantInvite."""
    
    list_display = [
        'id',
        'tenant',
        'email',
        'role',
        'status_badge',
        'is_valid_badge',
        'created_at',
        'expires_at',
    ]
    
    list_filter = [
        'status',
        'role',
        'tenant',
        'created_at',
    ]
    
    search_fields = [
        'email',
        'token',
    ]
    
    readonly_fields = [
        'token',
        'email_hash',
        'created_at',
        'accepted_at',
    ]
    
    fieldsets = (
        ('Invite Details', {
            'fields': ('tenant', 'email', 'role', 'message')
        }),
        ('Security', {
            'fields': ('token', 'email_hash'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status', 'expires_at', 'accepted_at')
        }),
        ('Metadata', {
            'fields': ('invited_by_email_hash', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'accepted': '#16a34a',
            'expired': '#6b7280',
            'revoked': '#dc2626',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def is_valid_badge(self, obj):
        if obj.is_valid:
            return format_html(
                '<span style="color: #16a34a;">✓ Válido</span>'
            )
        return format_html(
            '<span style="color: #dc2626;">✗ Inválido</span>'
        )
    is_valid_badge.short_description = 'Valid?'

