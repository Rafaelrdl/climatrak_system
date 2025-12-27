"""
Django Admin configuration for Control Center (ops app).
"""
from django.contrib import admin
from django.utils.html import format_html
from django.contrib import messages
from .models import ExportJob, AuditLog
from .utils import invalidate_tenants_cache


def clear_tenants_cache_action(modeladmin, request, queryset):
    """Admin action to manually clear tenants cache."""
    deleted = invalidate_tenants_cache()
    if deleted:
        messages.success(request, "✅ Cache de tenants limpo com sucesso!")
    else:
        messages.info(request, "ℹ️ Cache já estava vazio")

clear_tenants_cache_action.short_description = "🗑️ Limpar cache de tenants"


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    """Admin interface for Export Jobs."""
    
    list_display = [
        'id',
        'status_badge',
        'user',
        'tenant_name',
        'sensor_id',
        'record_count',
        'file_size_display',
        'created_at',
        'duration_display'
    ]
    
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'tenant_slug', 'tenant_name', 'sensor_id']
    readonly_fields = [
        'user',
        'celery_task_id',
        'status',
        'file_url',
        'file_size_bytes',
        'record_count',
        'error_message',
        'created_at',
        'started_at',
        'completed_at',
        'expires_at',
    ]
    
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    def status_badge(self, obj):
        """Colorful status badge."""
        colors = {
            'pending': '#6c757d',
            'processing': '#0dcaf0',
            'completed': '#198754',
            'failed': '#dc3545',
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def file_size_display(self, obj):
        """Display file size in MB."""
        if obj.file_size_mb:
            return f"{obj.file_size_mb} MB"
        return "—"
    file_size_display.short_description = 'Tamanho'
    
    def duration_display(self, obj):
        """Display processing duration."""
        if obj.duration_seconds:
            return f"{obj.duration_seconds}s"
        return "—"
    duration_display.short_description = 'Duração'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for Audit Logs."""
    
    list_display = [
        'id',
        'created_at',
        'username',
        'action_display',
        'tenant_slug',
        'record_count',
        'execution_time_display',
        'ip_address',
    ]
    
    list_filter = ['action', 'created_at', 'tenant_slug']
    search_fields = ['username', 'tenant_slug', 'ip_address']
    readonly_fields = [
        'user',
        'username',
        'action',
        'tenant_slug',
        'filters',
        'record_count',
        'execution_time_ms',
        'ip_address',
        'user_agent',
        'created_at',
    ]
    
    actions = [clear_tenants_cache_action]
    
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        """Audit logs cannot be created manually."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs cannot be edited."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete old logs for cleanup."""
        return request.user.is_superuser
    
    def action_display(self, obj):
        """Display action with icon."""
        icons = {
            'view_list': '📋',
            'view_drilldown': '🔍',
            'export_csv': '📄',
            'export_async': '📊',
            'view_dashboard': '📈',
        }
        icon = icons.get(obj.action, '❓')
        return f"{icon} {obj.get_action_display()}"
    action_display.short_description = 'Ação'
    
    def execution_time_display(self, obj):
        """Display execution time with color coding."""
        if not obj.execution_time_ms:
            return "—"
        
        ms = obj.execution_time_ms
        if ms < 100:
            color = '#198754'  # green
        elif ms < 500:
            color = '#ffc107'  # yellow
        else:
            color = '#dc3545'  # red
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} ms</span>',
            color,
            ms
        )
    execution_time_display.short_description = 'Tempo (ms)'
