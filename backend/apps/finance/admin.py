from django.contrib import admin

from .models import BudgetEnvelope, BudgetMonth, BudgetPlan, CostCenter, RateCard


class CostCenterChildInline(admin.TabularInline):
    model = CostCenter
    fk_name = "parent"
    extra = 0
    fields = ["code", "name", "is_active"]
    readonly_fields = ["code", "name"]
    show_change_link = True
    verbose_name = "Centro de Custo Filho"
    verbose_name_plural = "Centros de Custo Filhos"


@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
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
class RateCardAdmin(admin.ModelAdmin):
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


class BudgetEnvelopeInline(admin.TabularInline):
    model = BudgetEnvelope
    extra = 0
    fields = ["name", "category", "cost_center", "amount", "is_active"]
    autocomplete_fields = ["cost_center"]
    show_change_link = True


@admin.register(BudgetPlan)
class BudgetPlanAdmin(admin.ModelAdmin):
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


class BudgetMonthInline(admin.TabularInline):
    model = BudgetMonth
    extra = 0
    fields = ["month", "planned_amount", "is_locked", "locked_at", "locked_by"]
    readonly_fields = ["locked_at", "locked_by"]


@admin.register(BudgetEnvelope)
class BudgetEnvelopeAdmin(admin.ModelAdmin):
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
class BudgetMonthAdmin(admin.ModelAdmin):
    list_display = ["envelope", "month", "planned_amount", "is_locked", "locked_at"]
    list_filter = ["is_locked", "month", "envelope__budget_plan__year"]
    search_fields = ["envelope__name", "envelope__budget_plan__name"]
    readonly_fields = ["id", "created_at", "updated_at", "locked_at", "locked_by"]
    autocomplete_fields = ["envelope"]

    fieldsets = (
        (None, {"fields": ("id", "envelope", "month")}),
        ("Valores", {"fields": ("planned_amount",)}),
        ("Lock", {"fields": ("is_locked", "locked_at", "locked_by")}),
        (
            "Auditoria",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    actions = ["lock_months", "unlock_months"]

    @admin.action(description="Bloquear meses selecionados")
    def lock_months(self, request, queryset):
        for month in queryset:
            if not month.is_locked:
                month.lock(request.user)
        self.message_user(request, f"{queryset.count()} mês(es) bloqueado(s).")

    @admin.action(description="Desbloquear meses selecionados")
    def unlock_months(self, request, queryset):
        for month in queryset:
            if month.is_locked:
                month.unlock(request.user)
        self.message_user(request, f"{queryset.count()} mês(es) desbloqueado(s).")
