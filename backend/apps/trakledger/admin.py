from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from apps.common.admin_compat import display
from apps.common.admin_base import (
    BaseAdmin,
    BaseTabularInline,
    TimestampedAdminMixin,
)

from .models import (
    BudgetEnvelope,
    BudgetMonth,
    BudgetPlan,
    CostCenter,
    CostTransaction,
    RateCard,
)


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

    @display(
        description=_("Status"),
        ordering="is_active",
        label={
            True: "success",
            False: "danger",
        },
    )
    def active_badge(self, obj):
        if obj.is_active:
            return True, _("Ativo")
        return False, _("Inativo")

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

    @display(
        description=_("Status"),
        ordering="is_active",
        label={
            True: "success",
            False: "danger",
        },
    )
    def active_badge(self, obj):
        if obj.is_active:
            return True, _("Ativo")
        return False, _("Inativo")


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

    @display(
        description=_("Status"),
        ordering="status",
        label={
            "draft": "warning",
            "approved": "success",
            "active": "info",
            "closed": "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()


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

    @display(
        description=_("Status"),
        ordering="is_active",
        label={
            True: "success",
            False: "danger",
        },
    )
    def active_badge(self, obj):
        if obj.is_active:
            return True, _("Ativo")
        return False, _("Inativo")


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

    @display(
        description=_("Status"),
        ordering="is_locked",
        label={
            True: "danger",
            False: "success",
        },
    )
    def lock_status_badge(self, obj):
        """Badge visual para status de lock."""
        if obj.is_locked:
            return True, _("🔒 BLOQUEADO")
        return False, _("✅ ABERTO")

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


# =============================================================================
# CostTransaction Admin - Ledger (fonte da verdade)
# =============================================================================


@admin.register(CostTransaction)
class CostTransactionAdmin(TimestampedAdminMixin, BaseAdmin):
    """
    Admin para CostTransaction (Ledger de Custos).
    
    REGRAS DE NEGÓCIO (TrakLedger):
    1. Ledger é fonte da verdade - transações são IMUTÁVEIS após lock
    2. Sem delete - correções via adjustment (nova transação)
    3. Transações locked não podem ser editadas
    4. Idempotency_key garante não duplicação
    
    Este admin é READONLY por padrão. Edição apenas para superusers
    e transações não-locked.
    """
    
    # =========================================================================
    # List View
    # =========================================================================
    list_display = [
        "id_short",
        "transaction_type_badge",
        "category_badge",
        "amount_formatted",
        "cost_center_link",
        "work_order_link",
        "occurred_at",
        "lock_status_badge",
        "created_at",
    ]
    
    list_filter = [
        "transaction_type",
        "category",
        "is_locked",
        "currency",
        ("occurred_at", admin.DateFieldListFilter),
        ("created_at", admin.DateFieldListFilter),
        "cost_center",
    ]
    
    search_fields = [
        "id",
        "idempotency_key",
        "description",
        "cost_center__code",
        "cost_center__name",
        "work_order__number",
    ]
    
    date_hierarchy = "occurred_at"
    list_per_page = 50
    list_select_related = ["cost_center", "work_order", "asset", "created_by", "locked_by"]
    ordering = ["-occurred_at", "-created_at"]
    
    # =========================================================================
    # Form/Detail View
    # =========================================================================
    readonly_fields = [
        "id",
        "idempotency_key",
        "created_at",
        "updated_at",
        "locked_at",
        "locked_by",
        # Campos que não devem ser alterados após criação
        "transaction_type",
        "category",
        "amount",
        "currency",
        "occurred_at",
        "cost_center",
        "asset",
        "work_order",
        "vendor_id",
        "meta_formatted",
    ]
    
    autocomplete_fields = ["cost_center"]
    
    fieldsets = (
        (
            _("📋 Identificação"),
            {
                "fields": ("id", "idempotency_key"),
            },
        ),
        (
            _("💰 Transação"),
            {
                "fields": (
                    "transaction_type",
                    "category",
                    "amount",
                    "currency",
                    "occurred_at",
                    "description",
                ),
            },
        ),
        (
            _("🔗 Relacionamentos"),
            {
                "fields": ("cost_center", "asset", "work_order", "vendor_id"),
                "classes": ("collapse",),
            },
        ),
        (
            _("📊 Metadados"),
            {
                "fields": ("meta_formatted",),
                "classes": ("collapse",),
            },
        ),
        (
            _("🔒 Lock (Período Fechado)"),
            {
                "fields": ("is_locked", "locked_at", "locked_by"),
                "description": _(
                    "⚠️ IMUTABILIDADE: Transações locked não podem ser editadas. "
                    "Para correções, crie uma transação de ADJUSTMENT."
                ),
            },
        ),
        (
            _("📝 Auditoria"),
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    
    actions = ["create_adjustment", "lock_transactions", "export_selected"]
    
    # =========================================================================
    # Custom Display Methods
    # =========================================================================
    
    def id_short(self, obj):
        """Exibe ID truncado."""
        return str(obj.id)[:8] + "..."
    id_short.short_description = "ID"
    
    @display(
        description=_("Tipo"),
        ordering="transaction_type",
        label={
            "labor": "info",
            "parts": "warning",
            "third_party": "secondary",
            "energy": "success",
            "adjustment": "danger",
            "other": "secondary",
        },
    )
    def transaction_type_badge(self, obj):
        return obj.transaction_type, obj.get_transaction_type_display()
    
    @display(
        description=_("Categoria"),
        ordering="category",
        label={
            "preventive": "success",
            "corrective": "warning",
            "predictive": "info",
            "improvement": "primary",
            "contracts": "secondary",
            "parts": "warning",
            "energy": "success",
            "other": "secondary",
        },
    )
    def category_badge(self, obj):
        return obj.category, obj.get_category_display()
    
    def amount_formatted(self, obj):
        """Formata valor com cor (positivo=vermelho, negativo=verde)."""
        color = "#dc3545" if obj.amount > 0 else "#28a745"
        sign = "+" if obj.amount > 0 else ""
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}{} {}</span>',
            color,
            sign,
            f"{obj.amount:,.2f}",
            obj.currency,
        )
    amount_formatted.short_description = _("Valor")
    amount_formatted.admin_order_field = "amount"
    
    def cost_center_link(self, obj):
        """Link para o centro de custo."""
        if obj.cost_center:
            return format_html(
                '<a href="/admin/trakledger/costcenter/{}/change/">{}</a>',
                obj.cost_center.pk,
                obj.cost_center.code,
            )
        return "-"
    cost_center_link.short_description = _("Centro de Custo")
    cost_center_link.admin_order_field = "cost_center__code"
    
    def work_order_link(self, obj):
        """Link para a ordem de serviço."""
        if obj.work_order:
            return format_html(
                '<a href="/admin/cmms/workorder/{}/change/">{}</a>',
                obj.work_order.pk,
                obj.work_order.number,
            )
        return "-"
    work_order_link.short_description = _("OS")
    work_order_link.admin_order_field = "work_order__number"
    
    @display(
        description=_("Status"),
        ordering="is_locked",
        label={
            True: "danger",
            False: "success",
        },
    )
    def lock_status_badge(self, obj):
        if obj.is_locked:
            return True, _("🔒 LOCKED")
        return False, _("✅ OPEN")
    
    def meta_formatted(self, obj):
        """Exibe metadados formatados."""
        import json
        try:
            formatted = json.dumps(obj.meta, indent=2, ensure_ascii=False)
            return format_html('<pre style="white-space: pre-wrap;">{}</pre>', formatted)
        except Exception:
            return str(obj.meta)
    meta_formatted.short_description = _("Metadados (JSON)")
    
    # =========================================================================
    # Permissions - READONLY por padrão
    # =========================================================================
    
    def has_add_permission(self, request):
        """
        Criação via admin é desencorajada.
        Transações devem ser criadas via API/Services com idempotency_key.
        Apenas superusers podem criar via admin (para emergências).
        """
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        """
        Edição muito restrita:
        - Transações locked: NUNCA editáveis
        - Transações não-locked: apenas superusers
        """
        if obj and obj.is_locked:
            return False
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """
        DELETE PROIBIDO.
        Ledger é imutável. Correções via adjustment.
        """
        return False
    
    def get_readonly_fields(self, request, obj=None):
        """Todos os campos são readonly exceto para superusers em criação."""
        readonly = list(super().get_readonly_fields(request, obj))
        
        if obj is not None:
            # Objeto existente: tudo readonly
            all_fields = [f.name for f in self.model._meta.fields]
            for field in all_fields:
                if field not in readonly:
                    readonly.append(field)
        
        return readonly
    
    def change_view(self, request, object_id, form_url="", extra_context=None):
        """Adiciona contexto de lock e badge readonly."""
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)
        
        if obj and obj.is_locked:
            extra_context["is_locked"] = True
            extra_context["lock_message"] = _(
                "🔒 Esta transação está BLOQUEADA (período fechado). "
                "Não pode ser editada ou deletada. Para correções, "
                "crie uma transação de tipo ADJUSTMENT."
            )
        else:
            extra_context["show_save"] = request.user.is_superuser
        
        return super().change_view(request, object_id, form_url, extra_context)
    
    # =========================================================================
    # Actions
    # =========================================================================
    
    @admin.action(description=_("➕ Criar Adjustment para corrigir"))
    def create_adjustment(self, request, queryset):
        """
        Ação para criar transação de adjustment que corrige as selecionadas.
        
        Esta ação apenas redireciona para um formulário de criação de adjustment
        pré-preenchido com referência às transações originais.
        """
        if queryset.count() > 5:
            self.message_user(
                request,
                _("❌ Selecione no máximo 5 transações por vez."),
                level="error",
            )
            return
        
        # Calcular total para facilitar o adjustment
        total = sum(t.amount for t in queryset)
        ids = ",".join(str(t.id) for t in queryset)
        
        self.message_user(
            request,
            _(
                "📝 Para criar um adjustment, use a API ou crie uma nova transação "
                "com type='adjustment' referenciando: %(ids)s (total: %(total)s)"
            ) % {"ids": ids[:50], "total": total},
            level="info",
        )
    
    @admin.action(description=_("🔒 Bloquear transações (lock período)"))
    def lock_transactions(self, request, queryset):
        """Bloqueia transações selecionadas (fecha período)."""
        if not request.user.is_superuser:
            self.message_user(
                request,
                _("❌ Apenas superusuários podem bloquear transações."),
                level="error",
            )
            return
        
        from django.utils import timezone
        
        locked_count = 0
        for txn in queryset:
            if not txn.is_locked:
                txn.is_locked = True
                txn.locked_at = timezone.now()
                txn.locked_by = request.user
                txn.save(update_fields=["is_locked", "locked_at", "locked_by", "updated_at"])
                locked_count += 1
        
        self.message_user(
            request,
            _("✅ %(count)d transação(ões) bloqueada(s).") % {"count": locked_count},
            level="success" if locked_count > 0 else "warning",
        )
    
    @admin.action(description=_("📊 Exportar selecionadas (CSV)"))
    def export_selected(self, request, queryset):
        """Exporta transações selecionadas para CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="cost_transactions.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            "ID", "Tipo", "Categoria", "Valor", "Moeda", "Data Ocorrência",
            "Centro de Custo", "OS", "Ativo", "Locked", "Idempotency Key",
        ])
        
        for txn in queryset:
            writer.writerow([
                str(txn.id),
                txn.get_transaction_type_display(),
                txn.get_category_display(),
                str(txn.amount),
                txn.currency,
                txn.occurred_at.isoformat(),
                txn.cost_center.code if txn.cost_center else "",
                txn.work_order.number if txn.work_order else "",
                str(txn.asset_id) if txn.asset_id else "",
                "Sim" if txn.is_locked else "Não",
                txn.idempotency_key or "",
            ])
        
        return response
