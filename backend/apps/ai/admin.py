"""
AI Admin - Django Admin configuration for AI models.
"""

from django.contrib import admin

from .models import AIJob, AIJobStatus, AIUsageLog


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


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    """Admin para AIUsageLog."""

    list_display = [
        "id",
        "agent_key",
        "model",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "created_at",
    ]
    list_filter = ["agent_key", "model", "provider", "created_at"]
    search_fields = ["agent_key", "model", "tenant_schema"]
    readonly_fields = [
        "id",
        "tenant_id",
        "tenant_schema",
        "agent_key",
        "model",
        "provider",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "job",
        "created_by",
        "created_at",
        "raw_usage",
    ]
    ordering = ["-created_at"]

    fieldsets = [
        (
            "Identificação",
            {
                "fields": ["id", "tenant_id", "tenant_schema"],
            },
        ),
        (
            "Agente/Modelo",
            {
                "fields": ["agent_key", "model", "provider"],
            },
        ),
        (
            "Métricas de Tokens",
            {
                "fields": ["input_tokens", "output_tokens", "total_tokens"],
            },
        ),
        (
            "Relacionamentos",
            {
                "fields": ["job", "created_by"],
            },
        ),
        (
            "Dados Brutos",
            {
                "fields": ["raw_usage"],
                "classes": ["collapse"],
            },
        ),
        (
            "Timestamp",
            {
                "fields": ["created_at"],
            },
        ),
    ]

    def has_add_permission(self, request):
        """Logs são criados automaticamente."""
        return False

    def has_change_permission(self, request, obj=None):
        """Logs são imutáveis."""
        return False
