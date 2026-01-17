"""
Core Events Admin - Administração da Outbox

Interface administrativa para visualização e gestão de eventos.
"""

from django.contrib import admin
from django.utils.html import format_html

from apps.common.admin_base import BaseAdmin

from .models import OutboxEvent, OutboxEventStatus


@admin.register(OutboxEvent)
class OutboxEventAdmin(BaseAdmin):
    """Admin para visualização e gestão de eventos da Outbox."""

    list_display = [
        "id_short",
        "event_name",
        "aggregate_info",
        "status_badge",
        "attempts",
        "occurred_at",
        "created_at",
    ]

    list_filter = [
        "status",
        "event_name",
        "aggregate_type",
        "created_at",
    ]

    search_fields = [
        "id",
        "event_name",
        "aggregate_id",
        "idempotency_key",
    ]

    readonly_fields = [
        "id",
        "tenant_id",
        "event_name",
        "aggregate_type",
        "aggregate_id",
        "occurred_at",
        "payload_formatted",
        "status",
        "idempotency_key",
        "attempts",
        "max_attempts",
        "last_error",
        "last_attempt_at",
        "processed_at",
        "processed_by",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        ("Identificação", {"fields": ["id", "tenant_id", "idempotency_key"]}),
        (
            "Evento",
            {"fields": ["event_name", "aggregate_type", "aggregate_id", "occurred_at"]},
        ),
        (
            "Payload",
            {
                "fields": ["payload_formatted"],
                "classes": ["collapse"],
            },
        ),
        (
            "Status de Processamento",
            {
                "fields": [
                    "status",
                    "attempts",
                    "max_attempts",
                    "last_error",
                    "last_attempt_at",
                    "processed_at",
                    "processed_by",
                ]
            },
        ),
        (
            "Auditoria",
            {
                "fields": ["created_at", "updated_at"],
                "classes": ["collapse"],
            },
        ),
    ]

    actions = ["retry_selected_events", "mark_as_failed"]

    def id_short(self, obj):
        """Exibe ID truncado para melhor visualização."""
        return str(obj.id)[:8] + "..."

    id_short.short_description = "ID"

    def aggregate_info(self, obj):
        """Exibe informação do agregado."""
        return f"{obj.aggregate_type}:{str(obj.aggregate_id)[:8]}"

    aggregate_info.short_description = "Agregado"

    def status_badge(self, obj):
        """Exibe status com cores."""
        colors = {
            OutboxEventStatus.PENDING: "#ffc107",  # Amarelo
            OutboxEventStatus.PROCESSED: "#28a745",  # Verde
            OutboxEventStatus.FAILED: "#dc3545",  # Vermelho
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def payload_formatted(self, obj):
        """Exibe payload formatado."""
        import json

        try:
            formatted = json.dumps(obj.payload, indent=2, ensure_ascii=False)
            return format_html(
                '<pre style="white-space: pre-wrap;">{}</pre>', formatted
            )
        except Exception:
            return str(obj.payload)

    payload_formatted.short_description = "Payload (JSON)"

    @admin.action(description="Reprocessar eventos selecionados")
    def retry_selected_events(self, request, queryset):
        """Action para reprocessar eventos."""
        from .services import EventRetrier

        count = 0
        for event in queryset:
            try:
                EventRetrier.retry_event(event.id)
                count += 1
            except Exception as e:
                self.message_user(
                    request, f"Erro ao resetar evento {event.id}: {e}", level="error"
                )

        if count > 0:
            # Disparar processamento
            from .tasks import dispatch_pending_events

            dispatch_pending_events.delay(batch_size=count)

            self.message_user(
                request, f"{count} evento(s) resetado(s) para reprocessamento."
            )

    @admin.action(description="Marcar como falho")
    def mark_as_failed(self, request, queryset):
        """Action para marcar eventos como falhos."""
        count = queryset.filter(status=OutboxEventStatus.PENDING).update(
            status=OutboxEventStatus.FAILED,
            last_error="Marcado manualmente como falho via admin",
        )

        self.message_user(request, f"{count} evento(s) marcado(s) como falho.")

    def has_add_permission(self, request):
        """Desabilita criação manual de eventos."""
        return False

    def has_change_permission(self, request, obj=None):
        """Desabilita edição de eventos."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Permite exclusão apenas para superusers."""
        return request.user.is_superuser
