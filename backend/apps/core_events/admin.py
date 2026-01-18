"""
Core Events Admin - Administração da Outbox

Interface administrativa para visualização e gestão de eventos.
Foco em operações de suporte e debugging (READONLY por padrão).

REGRAS:
1. Eventos são IMUTÁVEIS - não editáveis
2. Reprocessamento é IDEMPOTENTE via idempotency_key
3. Delete apenas para superusers (limpeza de falhos)
"""

import json
import logging

from django.contrib import admin
from django.db.models import Count
from django.utils import timezone
from django.utils.html import format_html

from apps.common.admin_base import BaseAdmin

from .models import OutboxEvent, OutboxEventStatus

logger = logging.getLogger(__name__)


@admin.register(OutboxEvent)
class OutboxEventAdmin(BaseAdmin):
    """
    Admin para visualização e gestão de eventos da Outbox.
    
    READONLY por padrão - eventos são imutáveis.
    Ações disponíveis:
    - Reprocessar (idempotente via idempotency_key)
    - Marcar como falho
    - Exportar para análise
    """

    list_display = [
        "id_short",
        "event_name",
        "aggregate_info",
        "status_badge",
        "attempts_badge",
        "occurred_at",
        "processing_time",
        "created_at",
    ]

    list_filter = [
        "status",
        "event_name",
        "aggregate_type",
        ("created_at", admin.DateFieldListFilter),
        ("occurred_at", admin.DateFieldListFilter),
    ]

    search_fields = [
        "id",
        "event_name",
        "aggregate_id",
        "idempotency_key",
        "last_error",
    ]
    
    date_hierarchy = "occurred_at"
    list_per_page = 50
    ordering = ["-occurred_at"]

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

    actions = ["retry_selected_events", "mark_as_failed", "export_events_csv"]

    def id_short(self, obj):
        """Exibe ID truncado para melhor visualização."""
        return str(obj.id)[:8] + "..."

    id_short.short_description = "ID"

    def aggregate_info(self, obj):
        """Exibe informação do agregado."""
        return f"{obj.aggregate_type}:{str(obj.aggregate_id)[:8]}"

    aggregate_info.short_description = "Agregado"

    def status_badge(self, obj):
        """Exibe status com cores Bootstrap."""
        badge_map = {
            OutboxEventStatus.PENDING: ("warning", "⏳"),
            OutboxEventStatus.PROCESSED: ("success", "✅"),
            OutboxEventStatus.FAILED: ("danger", "❌"),
        }
        badge_class, icon = badge_map.get(obj.status, ("secondary", "❓"))
        return format_html(
            '<span class="badge badge-{}">{} {}</span>',
            badge_class,
            icon,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"
    
    def attempts_badge(self, obj):
        """Exibe tentativas com cor baseada em threshold."""
        if obj.attempts >= obj.max_attempts:
            color = "danger"
        elif obj.attempts > 0:
            color = "warning"
        else:
            color = "secondary"
        return format_html(
            '<span class="badge badge-{}">{}/{}</span>',
            color,
            obj.attempts,
            obj.max_attempts,
        )
    
    attempts_badge.short_description = "Tentativas"
    
    def processing_time(self, obj):
        """Tempo entre ocorrência e processamento."""
        if obj.processed_at and obj.occurred_at:
            delta = obj.processed_at - obj.occurred_at
            seconds = delta.total_seconds()
            if seconds < 60:
                return f"{seconds:.1f}s"
            elif seconds < 3600:
                return f"{seconds/60:.1f}m"
            else:
                return f"{seconds/3600:.1f}h"
        elif obj.status == OutboxEventStatus.PENDING:
            # Ainda pendente - mostrar tempo de espera
            delta = timezone.now() - obj.occurred_at
            seconds = delta.total_seconds()
            return format_html(
                '<span style="color: #dc3545;">⏱️ {:.0f}s</span>',
                seconds,
            )
        return "-"
    
    processing_time.short_description = "Tempo"

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

    @admin.action(description="🔄 Reprocessar eventos selecionados (idempotente)")
    def retry_selected_events(self, request, queryset):
        """
        Action para reprocessar eventos.
        
        IMPORTANTE: Reprocessamento é IDEMPOTENTE via idempotency_key.
        Consumidores devem verificar se já processaram o evento.
        """
        from .services import EventRetrier

        count = 0
        errors = []
        for event in queryset:
            try:
                EventRetrier.retry_event(event.id)
                count += 1
                logger.info(
                    f"Evento {event.id} marcado para reprocessamento",
                    extra={
                        "event_id": str(event.id),
                        "event_name": event.event_name,
                        "user": request.user.username,
                        "action": "admin_retry",
                    }
                )
            except Exception as e:
                errors.append(f"{event.id}: {e}")

        if count > 0:
            # Disparar processamento
            from .tasks import dispatch_pending_events

            dispatch_pending_events.delay(batch_size=count)

            self.message_user(
                request, 
                f"✅ {count} evento(s) resetado(s) para reprocessamento.",
                level="success",
            )
        
        for error in errors[:3]:  # Mostrar até 3 erros
            self.message_user(request, f"❌ Erro: {error}", level="error")

    @admin.action(description="❌ Marcar como falho (permanente)")
    def mark_as_failed(self, request, queryset):
        """Action para marcar eventos como falhos permanentemente."""
        count = queryset.filter(status=OutboxEventStatus.PENDING).update(
            status=OutboxEventStatus.FAILED,
            last_error=f"Marcado manualmente como falho via admin por {request.user.username}",
            last_attempt_at=timezone.now(),
        )
        
        if count > 0:
            logger.warning(
                f"{count} eventos marcados como falhos via admin",
                extra={
                    "user": request.user.username,
                    "action": "admin_mark_failed",
                    "count": count,
                }
            )

        self.message_user(request, f"⚠️ {count} evento(s) marcado(s) como falho.")
    
    @admin.action(description="📊 Exportar para CSV")
    def export_events_csv(self, request, queryset):
        """Exporta eventos selecionados para CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="outbox_events.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            "ID", "Event Name", "Aggregate Type", "Aggregate ID",
            "Status", "Attempts", "Occurred At", "Processed At",
            "Last Error", "Idempotency Key",
        ])
        
        for event in queryset:
            writer.writerow([
                str(event.id),
                event.event_name,
                event.aggregate_type,
                str(event.aggregate_id),
                event.get_status_display(),
                event.attempts,
                event.occurred_at.isoformat() if event.occurred_at else "",
                event.processed_at.isoformat() if event.processed_at else "",
                event.last_error or "",
                event.idempotency_key or "",
            ])
        
        return response

    def has_add_permission(self, request):
        """Desabilita criação manual de eventos."""
        return False

    def has_change_permission(self, request, obj=None):
        """Desabilita edição de eventos."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Permite exclusão apenas para superusers."""
        return request.user.is_superuser
