"""
AI Admin - Django Admin configuration for AI models.
"""

from django.contrib import admin

from .models import AIJob, AIJobStatus


@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    """Admin para AIJob."""

    list_display = [
        "id",
        "agent_key",
        "status",
        "created_by",
        "created_at",
        "execution_time_ms",
        "tokens_used",
    ]
    list_filter = ["status", "agent_key", "created_at"]
    search_fields = ["id", "agent_key", "idempotency_key"]
    readonly_fields = [
        "id",
        "tenant_id",
        "created_at",
        "started_at",
        "completed_at",
        "output_data",
        "error_message",
        "error_details",
    ]
    ordering = ["-created_at"]

    fieldsets = [
        (
            "Identificação",
            {
                "fields": ["id", "tenant_id", "agent_key", "idempotency_key"],
            },
        ),
        (
            "Execução",
            {
                "fields": [
                    "status",
                    "input_data",
                    "output_data",
                    "error_message",
                    "error_details",
                ],
            },
        ),
        (
            "Relacionamento",
            {
                "fields": ["related_type", "related_id", "created_by"],
            },
        ),
        (
            "Métricas",
            {
                "fields": [
                    "tokens_used",
                    "execution_time_ms",
                    "attempts",
                    "max_attempts",
                ],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "started_at", "completed_at"],
            },
        ),
    ]

    def has_add_permission(self, request):
        """Jobs são criados via API, não pelo admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Jobs são imutáveis após criação."""
        return False
