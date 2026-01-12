"""
TrakService Admin Configuration

Admin interfaces for TrakService models.
"""

from django.contrib import admin

from .models import ServiceAssignment, TechnicianProfile


@admin.register(TechnicianProfile)
class TechnicianProfileAdmin(admin.ModelAdmin):
    """Admin for TechnicianProfile model."""

    list_display = [
        "user",
        "phone",
        "is_active",
        "allow_tracking",
        "work_start_time",
        "work_end_time",
        "created_at",
    ]
    list_filter = ["is_active", "allow_tracking"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "phone"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["user"]

    fieldsets = (
        (None, {"fields": ("id", "user", "phone", "is_active")}),
        ("Habilidades", {"fields": ("skills",)}),
        ("Horário de Trabalho", {"fields": ("work_start_time", "work_end_time")}),
        ("Privacidade", {"fields": ("allow_tracking",)}),
        (
            "Metadados",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(ServiceAssignment)
class ServiceAssignmentAdmin(admin.ModelAdmin):
    """Admin for ServiceAssignment model."""

    list_display = [
        "id",
        "work_order",
        "technician",
        "scheduled_date",
        "scheduled_start",
        "status",
        "created_at",
    ]
    list_filter = ["status", "scheduled_date", "technician"]
    search_fields = [
        "work_order__number",
        "technician__user__email",
        "technician__user__first_name",
        "notes",
    ]
    readonly_fields = [
        "id",
        "departed_at",
        "arrived_at",
        "completed_at",
        "canceled_at",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = ["work_order", "technician", "created_by"]
    date_hierarchy = "scheduled_date"

    fieldsets = (
        (None, {"fields": ("id", "work_order", "technician", "status")}),
        (
            "Agendamento",
            {"fields": ("scheduled_date", "scheduled_start", "scheduled_end")},
        ),
        (
            "Timestamps de Status",
            {
                "fields": ("departed_at", "arrived_at", "completed_at", "canceled_at"),
                "classes": ("collapse",),
            },
        ),
        ("Notas", {"fields": ("notes", "cancellation_reason")}),
        (
            "Auditoria",
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
