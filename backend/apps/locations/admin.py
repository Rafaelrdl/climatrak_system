"""
Admin para Locations

Hierarquia: Company > Unit > Sector > Subsection
"""

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

from .models import Company, LocationContact, Sector, Subsection, Unit


class LocationContactInline(BaseTabularInline):
    model = LocationContact
    extra = 0
    fields = ["type", "name", "phone", "email"]

    def get_queryset(self, request):
        # Retorna queryset vazio por padrão - cada inline específico filtra
        return super().get_queryset(request)


class CompanyContactInline(LocationContactInline):
    fk_name = "company"


class UnitContactInline(LocationContactInline):
    fk_name = "unit"


class SectorContactInline(LocationContactInline):
    fk_name = "sector"


class SubsectionContactInline(LocationContactInline):
    fk_name = "subsection"


class UnitInline(BaseTabularInline):
    model = Unit
    extra = 0
    fields = ["name", "code", "city", "state", "is_active"]
    show_change_link = True


class SectorInline(BaseTabularInline):
    model = Sector
    extra = 0
    fields = ["name", "code", "building", "floor", "is_active"]
    show_change_link = True


class SubsectionInline(BaseTabularInline):
    model = Subsection
    extra = 0
    fields = ["name", "code", "position", "is_active"]
    show_change_link = True


@admin.register(Company)
class CompanyAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = ["name", "code", "city", "state", "unit_count", "active_badge"]
    list_filter = ["is_active", "state", "city"]
    search_fields = ["name", "code", "cnpj", "city"]
    autocomplete_fields = ["manager"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [UnitInline, CompanyContactInline]

    fieldsets = (
        (_("Identificação"), {"fields": ("name", "code", "cnpj", "is_active")}),
        (_("Endereço"), {"fields": ("address", "city", "state")}),
        (
            _("Responsável"),
            {"fields": ("responsible_name", "responsible_role", "manager")},
        ),
        (_("Configurações"), {"fields": ("logo", "timezone"), "classes": ("collapse",)}),
        (_("Descrição"), {"fields": ("description",), "classes": ("collapse",)}),
        (
            _("Metadados"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"

    def unit_count(self, obj):
        return obj.units.count()

    unit_count.short_description = _("Unidades")


@admin.register(Unit)
class UnitAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "name",
        "company_link",
        "code",
        "city",
        "state",
        "sector_count",
        "active_badge",
    ]
    list_filter = ["is_active", "company", "state", "city"]
    search_fields = ["name", "code", "company__name", "cnpj", "city"]
    list_select_related = ["company"]
    autocomplete_fields = ["company", "manager"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [SectorInline, UnitContactInline]

    fieldsets = (
        (_("Identificação"), {"fields": ("name", "code", "company", "is_active")}),
        (_("Endereço"), {"fields": ("cnpj", "address", "city", "state", "zip_code")}),
        (
            _("Responsável"),
            {"fields": ("responsible_name", "responsible_role", "manager")},
        ),
        (
            _("Dados Operacionais"),
            {
                "fields": ("total_area", "occupants", "hvac_units"),
                "classes": ("collapse",),
            },
        ),
        (_("Descrição"), {"fields": ("description",), "classes": ("collapse",)}),
        (
            _("Metadados"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def company_link(self, obj):
        if obj.company:
            return format_html(
                '<a href="/admin/locations/company/{}/change/">{}</a>',
                obj.company.pk,
                obj.company.name,
            )
        return "-"

    company_link.short_description = _("Empresa")
    company_link.admin_order_field = "company__name"

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"

    def sector_count(self, obj):
        return obj.sectors.count()

    sector_count.short_description = _("Setores")


@admin.register(Sector)
class SectorAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = [
        "name",
        "unit_link",
        "code",
        "building",
        "floor",
        "subsection_count",
        "active_badge",
    ]
    list_filter = ["is_active", "unit", "unit__company", "building"]
    search_fields = ["name", "code", "unit__name", "unit__company__name", "building"]
    list_select_related = ["unit", "unit__company"]
    autocomplete_fields = ["unit", "supervisor"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [SubsectionInline, SectorContactInline]

    fieldsets = (
        (_("Identificação"), {"fields": ("name", "code", "unit", "is_active")}),
        (_("Localização"), {"fields": ("building", "floor", "area")}),
        (
            _("Responsável"),
            {
                "fields": (
                    "supervisor",
                    "responsible_name",
                    "responsible_phone",
                    "responsible_email",
                )
            },
        ),
        (
            _("Dados Operacionais"),
            {"fields": ("occupants", "hvac_units"), "classes": ("collapse",)},
        ),
        (_("Descrição"), {"fields": ("description",), "classes": ("collapse",)}),
        (
            _("Metadados"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def unit_link(self, obj):
        if obj.unit:
            return format_html(
                '<a href="/admin/locations/unit/{}/change/">{}</a>',
                obj.unit.pk,
                obj.unit.name,
            )
        return "-"

    unit_link.short_description = _("Unidade")
    unit_link.admin_order_field = "unit__name"

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"

    def subsection_count(self, obj):
        return obj.subsections.count()

    subsection_count.short_description = _("Subseções")


@admin.register(Subsection)
class SubsectionAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = ["name", "sector_link", "code", "position", "active_badge"]
    list_filter = ["is_active", "sector__unit__company", "sector__unit", "sector"]
    search_fields = [
        "name",
        "code",
        "sector__name",
        "sector__unit__name",
        "sector__unit__company__name",
    ]
    list_select_related = ["sector", "sector__unit", "sector__unit__company"]
    autocomplete_fields = ["sector"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [SubsectionContactInline]

    fieldsets = (
        (_("Identificação"), {"fields": ("name", "code", "sector", "is_active")}),
        (_("Localização"), {"fields": ("position", "reference")}),
        (_("Descrição"), {"fields": ("description",), "classes": ("collapse",)}),
        (
            _("Metadados"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def sector_link(self, obj):
        if obj.sector:
            return format_html(
                '<a href="/admin/locations/sector/{}/change/">{}</a>',
                obj.sector.pk,
                obj.sector.name,
            )
        return "-"

    sector_link.short_description = _("Setor")
    sector_link.admin_order_field = "sector__name"

    def active_badge(self, obj):
        if obj.is_active:
            return status_badge(_("Ativo"), get_status_color("active"), "✓")
        return status_badge(_("Inativo"), get_status_color("inactive"), "✗")

    active_badge.short_description = _("Status")
    active_badge.admin_order_field = "is_active"


@admin.register(LocationContact)
class LocationContactAdmin(TimestampedAdminMixin, BaseAdmin):
    list_display = ["name", "type", "location_display", "phone", "email"]
    list_filter = ["type", "created_at"]
    search_fields = ["name", "email", "phone"]
    list_select_related = ["company", "unit", "sector", "subsection"]
    autocomplete_fields = ["company", "unit", "sector", "subsection"]

    def location_display(self, obj):
        loc = obj.location
        return str(loc) if loc else "-"

    location_display.short_description = _("Localização")
