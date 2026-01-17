"""
Admin para CMMS
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import (
    ChecklistTemplate,
    ExternalCost,
    ExternalCostAttachment,
    MaintenancePlan,
    PartUsage,
    Request,
    RequestItem,
    TimeEntry,
    WorkOrder,
    WorkOrderItem,
    WorkOrderPhoto,
)


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "item_count", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]

    def item_count(self, obj):
        return len(obj.items) if obj.items else 0

    item_count.short_description = "Itens"


class WorkOrderPhotoInline(admin.TabularInline):
    model = WorkOrderPhoto
    extra = 0
    readonly_fields = ["uploaded_at", "uploaded_by"]


class WorkOrderItemInline(admin.TabularInline):
    model = WorkOrderItem
    extra = 0
    readonly_fields = ["total_cost"]

    def total_cost(self, obj):
        return obj.quantity * obj.unit_cost if obj.unit_cost else "-"

    total_cost.short_description = "Custo Total"


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = [
        "number",
        "asset",
        "type",
        "priority",
        "status_badge",
        "scheduled_date",
        "assigned_to",
    ]
    list_filter = ["status", "type", "priority", "scheduled_date"]
    search_fields = ["number", "description", "asset__tag", "asset__name"]
    readonly_fields = [
        "number",
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
    ]
    raw_id_fields = [
        "asset",
        "assigned_to",
        "created_by",
        "request",
        "maintenance_plan",
    ]
    date_hierarchy = "scheduled_date"
    inlines = [WorkOrderPhotoInline, WorkOrderItemInline]
    list_per_page = 25
    list_select_related = ["asset", "assigned_to", "request", "maintenance_plan"]
    ordering = ["-scheduled_date", "-created_at"]
    
    actions = ["mark_in_progress", "mark_completed", "mark_cancelled"]

    fieldsets = (
        (
            "Identificação",
            {"fields": ("number", "asset", "request", "maintenance_plan")},
        ),
        ("Classificação", {"fields": ("type", "priority", "status")}),
        (
            "Agendamento",
            {"fields": ("scheduled_date", "estimated_hours", "assigned_to")},
        ),
        ("Descrição", {"fields": ("description", "execution_description")}),
        (
            "Checklist",
            {
                "fields": ("checklist_template", "checklist_responses"),
                "classes": ("collapse",),
            },
        ),
        (
            "Execução",
            {
                "fields": (
                    "started_at",
                    "completed_at",
                    "actual_hours",
                    "cancel_reason",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadados",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def status_badge(self, obj):
        colors = {
            "OPEN": "#3b82f6",
            "IN_PROGRESS": "#f59e0b",
            "COMPLETED": "#10b981",
            "CANCELLED": "#ef4444",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    @admin.action(description="✅ Marcar como Em Andamento")
    def mark_in_progress(self, request, queryset):
        updated = queryset.filter(status="OPEN").update(status="IN_PROGRESS")
        self.message_user(request, f"{updated} ordem(s) atualizada(s) para Em Andamento.")

    @admin.action(description="✅ Marcar como Concluída")
    def mark_completed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.exclude(status__in=["COMPLETED", "CANCELLED"]).update(
            status="COMPLETED", completed_at=timezone.now()
        )
        self.message_user(request, f"{updated} ordem(s) marcada(s) como concluída(s).")

    @admin.action(description="❌ Cancelar Ordens")
    def mark_cancelled(self, request, queryset):
        updated = queryset.exclude(status__in=["COMPLETED", "CANCELLED"]).update(
            status="CANCELLED"
        )
        self.message_user(request, f"{updated} ordem(s) cancelada(s).")


class RequestItemInline(admin.TabularInline):
    model = RequestItem
    extra = 0


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = [
        "number",
        "sector",
        "asset",
        "status_badge",
        "requester",
        "created_at",
    ]
    list_filter = ["status", "created_at", "sector"]
    search_fields = ["number", "note", "asset__tag"]
    readonly_fields = ["number", "created_at", "updated_at"]
    raw_id_fields = ["sector", "subsection", "asset", "requester"]
    inlines = [RequestItemInline]

    def status_badge(self, obj):
        colors = {
            "PENDING": "#3b82f6",
            "APPROVED": "#10b981",
            "REJECTED": "#ef4444",
            "CONVERTED": "#8b5cf6",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"


@admin.register(MaintenancePlan)
class MaintenancePlanAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "frequency",
        "is_active",
        "asset_count",
        "next_execution",
        "last_execution",
    ]
    list_filter = ["is_active", "frequency", "next_execution"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at", "last_execution"]
    filter_horizontal = ["assets"]

    fieldsets = (
        ("Identificação", {"fields": ("name", "description")}),
        ("Configuração", {"fields": ("is_active", "frequency", "frequency_value")}),
        ("Execução", {"fields": ("next_execution", "last_execution")}),
        ("Ativos e Checklist", {"fields": ("assets", "checklist_template")}),
        (
            "Metadados",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def asset_count(self, obj):
        return obj.assets.count()

    asset_count.short_description = "Ativos"


# ============================================
# COST COMPONENTS ADMIN (CMMS-001)
# ============================================


class TimeEntryInline(admin.TabularInline):
    """Inline de TimeEntry para WorkOrder."""

    model = TimeEntry
    extra = 0
    readonly_fields = ["total_cost", "created_at", "created_by"]
    fields = [
        "technician",
        "role",
        "role_code",
        "hours",
        "work_date",
        "hourly_rate",
        "total_cost",
        "description",
    ]

    def total_cost(self, obj):
        if obj.hourly_rate:
            return f"R$ {obj.hours * obj.hourly_rate:.2f}"
        return "-"

    total_cost.short_description = "Custo Total"


class PartUsageInline(admin.TabularInline):
    """Inline de PartUsage para WorkOrder."""

    model = PartUsage
    extra = 0
    readonly_fields = ["total_cost", "created_at", "inventory_deducted"]
    fields = [
        "inventory_item",
        "part_name",
        "part_number",
        "quantity",
        "unit",
        "unit_cost",
        "total_cost",
        "inventory_deducted",
    ]
    raw_id_fields = ["inventory_item"]

    def total_cost(self, obj):
        if obj.unit_cost:
            return f"R$ {obj.quantity * obj.unit_cost:.2f}"
        return "-"

    total_cost.short_description = "Custo Total"


class ExternalCostAttachmentInline(admin.TabularInline):
    """Inline de anexos para ExternalCost."""

    model = ExternalCostAttachment
    extra = 0
    readonly_fields = ["uploaded_at", "uploaded_by"]
    fields = [
        "file",
        "file_type",
        "file_name",
        "description",
        "uploaded_at",
        "uploaded_by",
    ]


class ExternalCostInline(admin.TabularInline):
    """Inline de ExternalCost para WorkOrder."""

    model = ExternalCost
    extra = 0
    readonly_fields = ["created_at", "created_by"]
    fields = [
        "cost_type",
        "supplier_name",
        "description",
        "amount",
        "invoice_number",
        "invoice_date",
    ]


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    """Admin para TimeEntry."""

    list_display = [
        "work_order_number",
        "technician",
        "role",
        "hours",
        "work_date",
        "hourly_rate",
        "total_cost_display",
    ]
    list_filter = ["work_date", "role"]
    search_fields = [
        "work_order__number",
        "technician__first_name",
        "role",
        "description",
    ]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    raw_id_fields = ["work_order", "technician"]
    date_hierarchy = "work_date"

    fieldsets = (
        ("Ordem de Serviço", {"fields": ("work_order",)}),
        (
            "Trabalho",
            {"fields": ("technician", "role", "role_code", "hours", "work_date")},
        ),
        ("Custo", {"fields": ("hourly_rate",)}),
        ("Descrição", {"fields": ("description",)}),
        (
            "Metadados",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def work_order_number(self, obj):
        return obj.work_order.number

    work_order_number.short_description = "OS"
    work_order_number.admin_order_field = "work_order__number"

    def total_cost_display(self, obj):
        cost = obj.total_cost
        if cost:
            return f"R$ {cost:.2f}"
        return "-"

    total_cost_display.short_description = "Custo Total"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(PartUsage)
class PartUsageAdmin(admin.ModelAdmin):
    """Admin para PartUsage."""

    list_display = [
        "work_order_number",
        "item_display",
        "quantity",
        "unit",
        "unit_cost",
        "total_cost_display",
        "inventory_deducted",
    ]
    list_filter = ["inventory_deducted", "created_at"]
    search_fields = ["work_order__number", "part_name", "part_number"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "created_by",
        "inventory_movement_id",
    ]
    raw_id_fields = ["work_order", "inventory_item"]

    fieldsets = (
        ("Ordem de Serviço", {"fields": ("work_order",)}),
        ("Item", {"fields": ("inventory_item", "part_name", "part_number")}),
        ("Quantidade e Custo", {"fields": ("quantity", "unit", "unit_cost")}),
        (
            "Inventário",
            {
                "fields": ("inventory_deducted", "inventory_movement_id"),
                "classes": ("collapse",),
            },
        ),
        ("Observações", {"fields": ("description",)}),
        (
            "Metadados",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def work_order_number(self, obj):
        return obj.work_order.number

    work_order_number.short_description = "OS"

    def item_display(self, obj):
        if obj.inventory_item:
            return f"{obj.inventory_item.code} - {obj.inventory_item.name}"
        return obj.part_name or obj.part_number

    item_display.short_description = "Item"

    def total_cost_display(self, obj):
        cost = obj.total_cost
        if cost:
            return f"R$ {cost:.2f}"
        return "-"

    total_cost_display.short_description = "Custo Total"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ExternalCost)
class ExternalCostAdmin(admin.ModelAdmin):
    """Admin para ExternalCost."""

    list_display = [
        "work_order_number",
        "cost_type",
        "supplier_name",
        "amount_display",
        "invoice_number",
        "invoice_date",
        "attachment_count",
    ]
    list_filter = ["cost_type", "invoice_date", "created_at"]
    search_fields = [
        "work_order__number",
        "supplier_name",
        "description",
        "invoice_number",
    ]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    raw_id_fields = ["work_order"]
    date_hierarchy = "invoice_date"
    inlines = [ExternalCostAttachmentInline]

    fieldsets = (
        ("Ordem de Serviço", {"fields": ("work_order",)}),
        ("Fornecedor", {"fields": ("supplier_name", "supplier_document")}),
        ("Custo", {"fields": ("cost_type", "description", "amount", "currency")}),
        ("Documento Fiscal", {"fields": ("invoice_number", "invoice_date")}),
        ("Anexos (JSON)", {"fields": ("attachments",), "classes": ("collapse",)}),
        (
            "Metadados",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def work_order_number(self, obj):
        return obj.work_order.number

    work_order_number.short_description = "OS"

    def amount_display(self, obj):
        return f"R$ {obj.amount:.2f}"

    amount_display.short_description = "Valor"

    def attachment_count(self, obj):
        count = obj.attachment_files.count()
        return count if count > 0 else "-"

    attachment_count.short_description = "Anexos"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ExternalCostAttachment)
class ExternalCostAttachmentAdmin(admin.ModelAdmin):
    """Admin para ExternalCostAttachment."""

    list_display = [
        "file_name",
        "external_cost_display",
        "file_type",
        "uploaded_by",
        "uploaded_at",
    ]
    list_filter = ["file_type", "uploaded_at"]
    search_fields = ["file_name", "description", "external_cost__supplier_name"]
    readonly_fields = ["uploaded_at", "uploaded_by"]
    raw_id_fields = ["external_cost"]

    def external_cost_display(self, obj):
        return (
            f"{obj.external_cost.work_order.number} - {obj.external_cost.supplier_name}"
        )

    external_cost_display.short_description = "Custo Externo"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)
