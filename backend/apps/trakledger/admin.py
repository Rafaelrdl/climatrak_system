from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from apps.common.admin_base import (
    BaseAdmin,
    BaseTabularInline,
    TimestampedAdminMixin,
    get_status_color,
    status_badge,
)

from .models import BudgetEnvelope, BudgetMonth, BudgetPlan, CostCenter, RateCard


class CostCenterChildInline(BaseTabularInline):
    model = CostCenter
    fk_name = "parent"
    extra = 0
    fields = ["code", "name", "is_active"]
    readonly_fields = ["code", "name"]
    show_change_link = True
    verbose_name = _("Centro de Custo Filho")
    verbose_name_plural = _("Centros de Custo Filhos")


@admin.register(CostCenter)
class CostCenterAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = ["code", "name", "parent_link", "level", "active_badge", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["code", "name", "description"]
    list_select_related = ["parent", "created_by"]
    readonly_fields = ["id", "created_at", "updated_at", "level", "full_path"]
    autocomplete_fields = ["parent", "created_by"]
    inlines = [CostCenterChildInline]

    fieldsets = (
        (None, {"fields": ("id", "code", "name", "description")}),
        (_("Hierarquia"), {"fields": ("parent", "level", "full_path")}),
        (_("Classificação"), {"fields": ("tags", "is_active")}),
        (
            _("Auditoria"),
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def parent_link(self, obj):
        if obj.parent:
            return format_html(
                '<a href="/admin/trakledger/costcenter/{}/change/">{}</a>',
                obj.parent.pk,
                obj.parent.code,
            )
        return "-"

    parent_link.short_description = _("Pai")
    parent_link.admin_order_field = "parent__code"

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"

    def level(self, obj):
        return obj.level

    level.short_description = _("Nível")

    def full_path(self, obj):
        return obj.full_path

    full_path.short_description = _("Caminho Completo")


@admin.register(RateCard)
class RateCardAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "role",
        "role_code",
        "cost_per_hour",
        "currency",
        "effective_from",
        "effective_to",
        "active_badge",
    ]
    list_filter = ["is_active", "currency", "effective_from"]
    search_fields = ["role", "role_code", "description"]
    list_select_related = ["created_by"]
    readonly_fields = ["id", "created_at", "updated_at"]
    autocomplete_fields = ["created_by"]

    fieldsets = (
        (None, {"fields": ("id", "role", "role_code", "description")}),
        (_("Custo"), {"fields": ("cost_per_hour", "currency")}),
        (_("Vigência"), {"fields": ("effective_from", "effective_to", "is_active")}),
        (
            _("Auditoria"),
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"


class BudgetEnvelopeInline(BaseTabularInline):
    model = BudgetEnvelope
    extra = 0
    fields = ["name", "category", "cost_center", "amount", "is_active"]
    autocomplete_fields = ["cost_center"]
    show_change_link = True


@admin.register(BudgetPlan)
class BudgetPlanAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "code",
        "name",
        "year",
        "status_badge",
        "total_planned",
        "currency",
        "created_at",
    ]
    list_filter = ["status", "year", "created_at"]
    search_fields = ["code", "name", "description"]
    list_select_related = ["created_by"]
    readonly_fields = ["id", "total_planned", "created_at", "updated_at"]
    autocomplete_fields = ["created_by"]
    inlines = [BudgetEnvelopeInline]

    fieldsets = (
        (None, {"fields": ("id", "code", "name", "description")}),
        (_("Período"), {"fields": ("year", "start_date", "end_date")}),
        (_("Valores"), {"fields": ("total_planned", "currency", "status")}),
        (
            _("Auditoria"),
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def status_badge(self, obj):
        colors = {
            "draft": "neutral",
            "approved": "success",
            "active": "info",
            "closed": "warning",
        }
        color = get_status_color(colors.get(obj.status, "neutral"))
        return status_badge(obj.get_status_display(), color)

    status_badge.short_description = _("Status")
    status_badge.admin_order_field = "status"


class BudgetMonthInline(BaseTabularInline):
    model = BudgetMonth
    extra = 0
    fields = ["month", "planned_amount", "is_locked", "locked_at", "locked_by"]
    readonly_fields = ["locked_at", "locked_by"]


@admin.register(BudgetEnvelope)
class BudgetEnvelopeAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "name",
        "budget_plan_link",
        "cost_center_link",
        "category",
        "amount",
        "active_badge",
    ]
    list_filter = ["category", "is_active", "budget_plan__year"]
    search_fields = ["name", "description", "cost_center__name", "budget_plan__name"]
    list_select_related = ["budget_plan", "cost_center"]
    readonly_fields = ["id", "created_at", "updated_at"]
    autocomplete_fields = ["budget_plan", "cost_center"]
    inlines = [BudgetMonthInline]

    fieldsets = (
        (None, {"fields": ("id", "name", "description")}),
        (_("Relacionamentos"), {"fields": ("budget_plan", "cost_center", "category")}),
        (_("Valores"), {"fields": ("amount", "currency", "is_active")}),
        (
            _("Auditoria"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def budget_plan_link(self, obj):
        if obj.budget_plan:
            return format_html(
                '<a href="/admin/trakledger/budgetplan/{}/change/">{}</a>',
                obj.budget_plan.pk,
                obj.budget_plan.name,
            )
        return "-"

    budget_plan_link.short_description = _("Plano")
    budget_plan_link.admin_order_field = "budget_plan__name"

    def cost_center_link(self, obj):
        if obj.cost_center:
            return format_html(
                '<a href="/admin/trakledger/costcenter/{}/change/">{}</a>',
                obj.cost_center.pk,
                obj.cost_center.code,
            )
        return "-"

    cost_center_link.short_description = _("Centro de Custo")
    cost_center_link.admin_order_field = "cost_center__code"

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"


@admin.register(BudgetMonth)
class BudgetMonthAdmin(TimestampedAdminMixin, BaseAdmin):
    """
    Admin para BudgetMonth com proteção de meses bloqueados.

    IMPORTANTE: Meses bloqueados (is_locked=True) não podem ser editados.
    Para correções, use o mecanismo de ajustes/adjustments.
    """

    list_display = [
        "envelope_link",
        "month",
        "planned_amount",
        "lock_status_badge",
        "locked_at",
        "locked_by",
    ]
    list_filter = ["is_locked", "month", "envelope__budget_plan__year"]
    search_fields = ["envelope__name", "envelope__budget_plan__name"]
    readonly_fields = ["id", "created_at", "updated_at", "locked_at", "locked_by"]
    autocomplete_fields = ["envelope"]
    list_select_related = ["envelope", "envelope__budget_plan", "locked_by"]
    list_per_page = 25
    ordering = ["-envelope__budget_plan__year", "month"]

    fieldsets = (
        (None, {"fields": ("id", "envelope", "month")}),
        (_("Valores"), {"fields": ("planned_amount",)}),
        (
            _("🔒 Lock (Fechamento Mensal)"),
            {
                "fields": ("is_locked", "locked_at", "locked_by"),
                "description": _(
                    "⚠️ ATENÇÃO: Meses bloqueados não podem ser editados. "
                    "Use ajustes para correções."
                ),
            },
        ),
        (
            _("Auditoria"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    actions = ["lock_months", "unlock_months"]

    def envelope_link(self, obj):
        if obj.envelope:
            return format_html(
                '<a href="/admin/trakledger/budgetenvelope/{}/change/">{}</a>',
                obj.envelope.pk,
                obj.envelope.name,
            )
        return "-"

    envelope_link.short_description = _("Envelope")
    envelope_link.admin_order_field = "envelope__name"

    def lock_status_badge(self, obj):
        """Badge visual para status de lock."""
        if obj.is_locked:
            return status_badge(_("BLOQUEADO"), get_status_color("locked"), "🔒")
        return status_badge(_("ABERTO"), get_status_color("success"), "✅")

    lock_status_badge.short_description = _("Status")
    lock_status_badge.admin_order_field = "is_locked"

    def get_readonly_fields(self, request, obj=None):
        """Torna planned_amount readonly se o mês estiver bloqueado."""
        readonly = list(super().get_readonly_fields(request, obj))
        if obj and obj.is_locked:
            # Mês bloqueado: não pode editar valor
            readonly.extend(["planned_amount", "is_locked"])
        return readonly

    def has_change_permission(self, request, obj=None):
        """Restringe edição de meses bloqueados para não-superusers."""
        if obj and obj.is_locked and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        """Proíbe deleção de meses bloqueados."""
        if obj and obj.is_locked:
            return False
        return super().has_delete_permission(request, obj)

    @admin.action(description=_("🔒 Bloquear meses selecionados"))
    def lock_months(self, request, queryset):
        locked_count = 0
        for month in queryset:
            if not month.is_locked:
                month.lock(request.user)
                locked_count += 1
        self.message_user(
            request,
            _("✅ %(count)d mês(es) bloqueado(s) com sucesso.") % {"count": locked_count},
            level="success" if locked_count > 0 else "warning",
        )

    @admin.action(description=_("🔓 Desbloquear meses (requer superuser)"))
    def unlock_months(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(
                request,
                _("❌ Apenas superusuários podem desbloquear meses."),
                level="error",
            )
            return

        unlocked_count = 0
        for month in queryset:
            if month.is_locked:
                month.unlock(request.user)
                unlocked_count += 1
        self.message_user(
            request,
            _(
                "⚠️ %(count)d mês(es) desbloqueado(s). "
                "Lembre-se: alterações em meses já fechados podem afetar relatórios."
            )
            % {"count": unlocked_count},
            level="warning",
        )
