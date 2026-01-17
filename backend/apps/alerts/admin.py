"""
Admin para o sistema de Alertas e Regras
"""

from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from apps.common.admin_base import (
    BaseAdmin,
    BaseTabularInline,
    TimestampedAdminMixin,
    get_status_color,
    status_badge,
)

from .models import Alert, NotificationPreference, Rule, RuleParameter


class RuleParameterInline(BaseTabularInline):
    """Inline para editar parâmetros da regra"""

    model = RuleParameter
    extra = 1
    fields = [
        "parameter_key",
        "variable_key",
        "operator",
        "threshold",
        "unit",
        "duration",
        "severity",
        "message_template",
        "order",
    ]
    ordering = ["order"]


@admin.register(Rule)
class RuleAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "name",
        "equipment_link",
        "enabled_badge",
        "parameters_count",
        "created_at",
    ]
    list_filter = ["enabled", "created_at"]
    search_fields = ["name", "description", "equipment__name", "equipment__tag"]
    list_select_related = ["equipment"]
    autocomplete_fields = ["equipment"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    inlines = [RuleParameterInline]

    fieldsets = (
        (_("Identificação"), {"fields": ("name", "description")}),
        (_("Equipamento"), {"fields": ("equipment",)}),
        (_("Ações"), {"fields": ("actions",)}),
        (_("Estado"), {"fields": ("enabled",)}),
        (
            _("Campos Antigos (Deprecated)"),
            {
                "fields": (
                    "parameter_key",
                    "variable_key",
                    "operator",
                    "threshold",
                    "unit",
                    "duration",
                    "severity",
                ),
                "classes": ("collapse",),
                "description": _(
                    "Campos mantidos para compatibilidade. "
                    "Novas regras devem usar a tabela de Parâmetros abaixo."
                ),
            },
        ),
        (
            _("Informações do Sistema"),
            {
                "fields": ("created_at", "updated_at", "created_by"),
                "classes": ("collapse",),
            },
        ),
    )

    def equipment_link(self, obj):
        """Link clicável para o equipamento."""
        if obj.equipment:
            return format_html(
                '<a href="/admin/assets/equipment/{}/change/">{}</a>',
                obj.equipment.pk,
                obj.equipment.name or obj.equipment.tag,
            )
        return "-"

    equipment_link.short_description = _("Equipamento")
    equipment_link.admin_order_field = "equipment__name"

    def enabled_badge(self, obj):
        """Badge colorido para status de enabled."""
        if obj.enabled:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    enabled_badge.short_description = _("Status")

    def parameters_count(self, obj):
        """Mostra quantidade de parâmetros"""
        count = obj.parameters.count()
        return f"{count} parâmetro(s)"

    parameters_count.short_description = _("Parâmetros")


@admin.register(RuleParameter)
class RuleParameterAdmin(BaseAdmin):
    list_display = [
        "rule",
        "parameter_key",
        "operator",
        "threshold",
        "severity_badge",
        "order",
    ]
    list_filter = ["severity", "operator"]
    search_fields = ["rule__name", "parameter_key", "variable_key"]
    list_select_related = ["rule"]
    autocomplete_fields = ["rule"]
    ordering = ["rule", "order"]

    def severity_badge(self, obj):
        """Badge colorido para severidade."""
        colors = {
            "critical": "danger",
            "high": "warning",
            "medium": "info",
            "low": "neutral",
        }
        color = get_status_color(colors.get(obj.severity, "neutral"))
        return status_badge(obj.get_severity_display(), color)

    severity_badge.short_description = _("Severidade")
    severity_badge.admin_order_field = "severity"


@admin.register(Alert)
class AlertAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "asset_tag",
        "severity_badge",
        "message_preview",
        "triggered_at",
        "acknowledged_badge",
        "resolved_badge",
    ]
    list_filter = ["severity", "acknowledged", "resolved", "triggered_at"]
    search_fields = ["asset_tag", "message", "parameter_key"]
    list_select_related = ["rule", "acknowledged_by", "resolved_by"]
    date_hierarchy = "triggered_at"
    readonly_fields = [
        "triggered_at",
        "acknowledged_at",
        "acknowledged_by",
        "resolved_at",
        "resolved_by",
    ]
    actions = ["acknowledge_alerts", "resolve_alerts"]

    fieldsets = (
        (_("Alerta"), {"fields": ("rule", "message", "severity")}),
        (
            _("Dados"),
            {"fields": ("asset_tag", "parameter_key", "parameter_value", "threshold")},
        ),
        (_("Estado"), {"fields": ("triggered_at",)}),
        (
            _("Reconhecimento"),
            {"fields": ("acknowledged", "acknowledged_at", "acknowledged_by")},
        ),
        (_("Resolução"), {"fields": ("resolved", "resolved_at", "resolved_by")}),
        (_("Notas"), {"fields": ("notes",)}),
    )

    def severity_badge(self, obj):
        """Badge colorido para severidade."""
        icons = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢",
        }
        color = get_status_color(obj.severity)
        return status_badge(
            obj.get_severity_display(), color, icons.get(obj.severity)
        )

    severity_badge.short_description = _("Severidade")
    severity_badge.admin_order_field = "severity"

    def acknowledged_badge(self, obj):
        """Badge para status de reconhecimento."""
        if obj.acknowledged:
            return status_badge(_("Sim"), get_status_color("success"), "✓")
        return status_badge(_("Não"), get_status_color("warning"), "⏳")

    acknowledged_badge.short_description = _("Reconhecido")
    acknowledged_badge.admin_order_field = "acknowledged"

    def resolved_badge(self, obj):
        """Badge para status de resolução."""
        if obj.resolved:
            return status_badge(_("Sim"), get_status_color("success"), "✓")
        return status_badge(_("Não"), get_status_color("danger"), "✗")

    resolved_badge.short_description = _("Resolvido")
    resolved_badge.admin_order_field = "resolved"

    def message_preview(self, obj):
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message

    message_preview.short_description = _("Mensagem")

    @admin.action(description=_("✓ Reconhecer alertas selecionados"))
    def acknowledge_alerts(self, request, queryset):
        """Ação para reconhecer alertas em lote."""
        already_acked = queryset.filter(acknowledged=True).count()
        to_ack = queryset.filter(acknowledged=False)
        count = to_ack.count()

        if count == 0:
            self.message_user(
                request,
                _("Nenhum alerta para reconhecer (todos já foram reconhecidos)."),
                messages.WARNING,
            )
            return

        to_ack.update(
            acknowledged=True,
            acknowledged_at=timezone.now(),
            acknowledged_by=request.user,
        )

        msg = _("%(count)d alerta(s) reconhecido(s) com sucesso.") % {"count": count}
        if already_acked > 0:
            msg += _(" (%(already)d já estavam reconhecidos)") % {"already": already_acked}

        self.message_user(request, msg, messages.SUCCESS)

    @admin.action(description=_("✓ Resolver alertas selecionados"))
    def resolve_alerts(self, request, queryset):
        """Ação para resolver alertas em lote."""
        already_resolved = queryset.filter(resolved=True).count()
        to_resolve = queryset.filter(resolved=False)
        count = to_resolve.count()

        if count == 0:
            self.message_user(
                request,
                _("Nenhum alerta para resolver (todos já foram resolvidos)."),
                messages.WARNING,
            )
            return

        # Resolve também reconhece automaticamente
        to_resolve.update(
            resolved=True,
            resolved_at=timezone.now(),
            resolved_by=request.user,
            acknowledged=True,
            acknowledged_at=timezone.now(),
            acknowledged_by=request.user,
        )

        msg = _("%(count)d alerta(s) resolvido(s) com sucesso.") % {"count": count}
        if already_resolved > 0:
            msg += _(" (%(already)d já estavam resolvidos)") % {"already": already_resolved}

        self.message_user(request, msg, messages.SUCCESS)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(BaseAdmin):
    list_display = [
        "user",
        "email_enabled",
        "push_enabled",
        "sms_enabled",
        "whatsapp_enabled",
    ]
    list_filter = ["email_enabled", "push_enabled", "sms_enabled", "whatsapp_enabled"]
    search_fields = ["user__email", "phone_number", "whatsapp_number"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    readonly_fields = ["updated_at"]
    fieldsets = (
        (_("Usuário"), {"fields": ("user",)}),
        (
            _("Canais de Notificação"),
            {
                "fields": (
                    "email_enabled",
                    "push_enabled",
                    "sound_enabled",
                    "sms_enabled",
                    "whatsapp_enabled",
                )
            },
        ),
        (
            _("Severidades"),
            {
                "fields": (
                    "critical_alerts",
                    "high_alerts",
                    "medium_alerts",
                    "low_alerts",
                )
            },
        ),
        (_("Contatos"), {"fields": ("phone_number", "whatsapp_number")}),
        (
            _("Informações do Sistema"),
            {"fields": ("updated_at",), "classes": ("collapse",)},
        ),
    )
