from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
import json
from .models import Telemetry


# NOTE: TelemetryAdmin is NOT registered in the centralized admin (public schema)
# Reason: Telemetry is a TENANT_APPS model, exists only in tenant schemas.
# The centralized admin in public schema should only manage:
#   - Tenants (SHARED_APPS)
#   - Domains (SHARED_APPS)
#   - Users (SHARED_APPS)
# Telemetry data is tenant-specific and should be accessed via tenant-specific interfaces.

# @admin.register(Telemetry)  # DISABLED - Not available in public schema
class TelemetryAdmin(admin.ModelAdmin):
    """
    Admin interface for Telemetry (MQTT ingested data).
    Read-only: data comes from EMQX via /ingest endpoint.
    """
    list_display = (
        'id',
        'device_badge',
        'topic_short',
        'payload_preview',
        'timestamp_formatted',
        'created_badge'
    )
    list_filter = ('timestamp', 'created_at', 'device_id')
    search_fields = ('device_id', 'topic', 'payload')
    readonly_fields = ('id', 'device_id', 'topic', 'payload_formatted', 'timestamp', 'created_at')
    ordering = ('-timestamp',)
    list_per_page = 50
    
    fieldsets = (
        ('Device Information', {
            'fields': ('id', 'device_id', 'topic'),
        }),
        ('Payload Data', {
            'fields': ('payload_formatted',),
            'description': 'JSON payload recebido do dispositivo MQTT.'
        }),
        ('Timestamps', {
            'fields': ('timestamp', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Telemetry is added only via EMQX/API."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Telemetry is immutable (time-series data)."""
        return False
    
    def device_badge(self, obj):
        """Badge visual do device."""
        return format_html(
            '<span style="background-color: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-family: monospace;">'
            '📡 {}</span>',
            obj.device_id
        )
    device_badge.short_description = 'Device'
    
    def topic_short(self, obj):
        """Topic truncado."""
        topic = obj.topic
        if len(topic) > 40:
            return format_html('<span title="{}">{}</span>', topic, topic[:37] + '...')
        return topic
    topic_short.short_description = 'Topic'
    
    def payload_preview(self, obj):
        """Preview do payload (primeiros valores)."""
        try:
            payload = obj.payload if isinstance(obj.payload, dict) else {}
            preview = ', '.join([f"{k}={v}" for k, v in list(payload.items())[:2]])
            if len(payload) > 2:
                preview += f' (+{len(payload) - 2} mais)'
            return format_html('<code style="font-size: 10px;">{}</code>', preview)
        except:
            return '-'
    payload_preview.short_description = 'Payload Preview'
    
    def payload_formatted(self, obj):
        """Payload formatado em JSON."""
        try:
            formatted = json.dumps(obj.payload, indent=2, ensure_ascii=False)
            return mark_safe(f'<pre style="background-color: #f4f4f4; padding: 10px; border-radius: 5px;">{formatted}</pre>')
        except:
            return obj.payload
    payload_formatted.short_description = 'Payload JSON'
    
    def timestamp_formatted(self, obj):
        """Timestamp formatado."""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    timestamp_formatted.short_description = 'Timestamp'
    
    def created_badge(self, obj):
        """Badge de data de criação."""
        return format_html(
            '<span style="color: #666; font-size: 11px;">{}</span>',
            obj.created_at.strftime('%d/%m %H:%M')
        )
    created_badge.short_description = 'Criado em'
