from django.contrib import admin
from django.utils.html import format_html

from apps.common.admin_base import BaseAdmin, BaseTabularInline

from .models import BudgetEnvelope, BudgetMonth, BudgetPlan, CostCenter, RateCard


class CostCenterChildInline(BaseTabularInline):
    model = CostCenter
    fk_name = "parent"
    extra = 0
    fields = ["code", "name", "is_active"]
    readonly_fields = ["code", "name"]
    show_change_link = True
    verbose_name = "Centro de Custo Filho"
    verbose_name_plural = "Centros de Custo Filhos"


@admin.register(CostCenter)
class CostCenterAdmin(BaseAdmin):
    list_display = ["code", "name", "parent", "level", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["code", "name", "description"]
    readonly_fields = ["id", "created_at", "updated_at", "level", "full_path"]
    autocomplete_fields = ["parent", "created_by"]
    inlines = [CostCenterChildInline]

    fieldsets = (
        (None, {"fields": ("id", "code", "name", "description")}),
        ("Hierarquia", {"fields": ("parent", "level", "full_path")}),
        ("Classificação", {"fields": ("tags", "is_active")}),
        (
            "Auditoria",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def level(self, obj):
        return obj.level

    level.short_description = "Nível"

    def full_path(self, obj):
        return obj.full_path

    full_path.short_description = "Caminho Completo"


@admin.register(RateCard)
class RateCardAdmin(BaseAdmin):
    list_display = [
        "role",
        "role_code",
        "cost_per_hour",
        "currency",
        "effective_from",
        "effective_to",
        "is_active",
    ]
    list_filter = ["is_active", "currency", "effective_from"]
    search_fields = ["role", "role_code", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    autocomplete_fields = ["created_by"]

    fieldsets = (
        (None, {"fields": ("id", "role", "role_code", "description")}),
        ("Custo", {"fields": ("cost_per_hour", "currency")}),
        ("Vigência", {"fields": ("effective_from", "effective_to", "is_active")}),
        (
            "Auditoria",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


class BudgetEnvelopeInline(BaseTabularInline):
    model = BudgetEnvelope
    extra = 0
    fields = ["name", "category", "cost_center", "amount", "is_active"]
    autocomplete_fields = ["cost_center"]
    show_change_link = True


@admin.register(BudgetPlan)
class BudgetPlanAdmin(BaseAdmin):
    list_display = [
        "code",
        "name",
        "year",
        "status",
        "total_planned",
        "currency",
        "created_at",
    ]
    list_filter = ["status", "year", "created_at"]
    search_fields = ["code", "name", "description"]
    readonly_fields = ["id", "total_planned", "created_at", "updated_at"]
    autocomplete_fields = ["created_by"]
    inlines = [BudgetEnvelopeInline]

    fieldsets = (
        (None, {"fields": ("id", "code", "name", "description")}),
        ("Período", {"fields": ("year", "start_date", "end_date")}),
        ("Valores", {"fields": ("total_planned", "currency", "status")}),
        (
            "Auditoria",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


class BudgetMonthInline(BaseTabularInline):
    model = BudgetMonth
    extra = 0
    fields = ["month", "planned_amount", "is_locked", "locked_at", "locked_by"]
    readonly_fields = ["locked_at", "locked_by"]


@admin.register(BudgetEnvelope)
class BudgetEnvelopeAdmin(BaseAdmin):
    list_display = [
        "name",
        "budget_plan",
        "cost_center",
        "category",
        "amount",
        "is_active",
    ]
    list_filter = ["category", "is_active", "budget_plan__year"]
    search_fields = ["name", "description", "cost_center__name", "budget_plan__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    autocomplete_fields = ["budget_plan", "cost_center"]
    inlines = [BudgetMonthInline]

    fieldsets = (
        (None, {"fields": ("id", "name", "description")}),
        ("Relacionamentos", {"fields": ("budget_plan", "cost_center", "category")}),
        ("Valores", {"fields": ("amount", "currency", "is_active")}),
        (
            "Auditoria",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(BudgetMonth)
class BudgetMonthAdmin(BaseAdmin):
    """
    Admin para BudgetMonth com proteção de meses bloqueados.
    
    IMPORTANTE: Meses bloqueados (is_locked=True) não podem ser editados.
    Para correções, use o mecanismo de ajustes/adjustments.
    """
    list_display = [
        "envelope",
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
        ("Valores", {"fields": ("planned_amount",)}),
        (
            "🔒 Lock (Fechamento Mensal)",
            {
                "fields": ("is_locked", "locked_at", "locked_by"),
                "description": "⚠️ ATENÇÃO: Meses bloqueados não podem ser editados. "
                "Use ajustes para correções.",
            },
        ),
        (
            "Auditoria",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    actions = ["lock_months", "unlock_months"]

    def lock_status_badge(self, obj):
        """Badge visual para status de lock."""
        if obj.is_locked:
            return format_html(
                '<span style="background-color: #ef4444; color: white; padding: 4px 8px; '
                'border-radius: 4px; font-size: 11px;">🔒 BLOQUEADO</span>'
            )
        return format_html(
            '<span style="background-color: #10b981; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 11px;">✅ ABERTO</span>'
        )

    lock_status_badge.short_description = "Status"
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

    @admin.action(description="🔒 Bloquear meses selecionados")
    def lock_months(self, request, queryset):
        locked_count = 0
        for month in queryset:
            if not month.is_locked:
                month.lock(request.user)
                locked_count += 1
        self.message_user(
            request,
            f"✅ {locked_count} mês(es) bloqueado(s) com sucesso.",
            level="success" if locked_count > 0 else "warning",
        )

    @admin.action(description="🔓 Desbloquear meses (requer superuser)")
    def unlock_months(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(
                request,
                "❌ Apenas superusuários podem desbloquear meses.",
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
            f"⚠️ {unlocked_count} mês(es) desbloqueado(s). "
            "Lembre-se: alterações em meses já fechados podem afetar relatórios.",
            level="warning",
        )
