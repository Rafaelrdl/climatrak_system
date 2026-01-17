"""
Admin para Locations

Hierarquia: Company > Unit > Sector > Subsection
"""

from django.contrib import admin

from apps.common.admin_base import BaseAdmin, BaseTabularInline

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
class CompanyAdmin(BaseAdmin):
    list_display = ["name", "code", "city", "state", "unit_count", "is_active"]
    list_filter = ["is_active", "state", "city"]
    search_fields = ["name", "code", "cnpj", "city"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["manager"]
    inlines = [UnitInline, CompanyContactInline]

    fieldsets = (
        ("Identificação", {"fields": ("name", "code", "cnpj", "is_active")}),
        ("Endereço", {"fields": ("address", "city", "state")}),
        (
            "Responsável",
            {"fields": ("responsible_name", "responsible_role", "manager")},
        ),
        ("Configurações", {"fields": ("logo", "timezone"), "classes": ("collapse",)}),
        ("Descrição", {"fields": ("description",), "classes": ("collapse",)}),
        (
            "Metadados",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def unit_count(self, obj):
        return obj.units.count()

    unit_count.short_description = "Unidades"


@admin.register(Unit)
class UnitAdmin(BaseAdmin):
    list_display = [
        "name",
        "company",
        "code",
        "city",
        "state",
        "sector_count",
        "is_active",
    ]
    list_filter = ["is_active", "company", "state", "city"]
    search_fields = ["name", "code", "company__name", "cnpj", "city"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["company", "manager"]
    inlines = [SectorInline, UnitContactInline]

    fieldsets = (
        ("Identificação", {"fields": ("name", "code", "company", "is_active")}),
        ("Endereço", {"fields": ("cnpj", "address", "city", "state", "zip_code")}),
        (
            "Responsável",
            {"fields": ("responsible_name", "responsible_role", "manager")},
        ),
        (
            "Dados Operacionais",
            {
                "fields": ("total_area", "occupants", "hvac_units"),
                "classes": ("collapse",),
            },
        ),
        ("Descrição", {"fields": ("description",), "classes": ("collapse",)}),
        (
            "Metadados",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def sector_count(self, obj):
        return obj.sectors.count()

    sector_count.short_description = "Setores"


@admin.register(Sector)
class SectorAdmin(BaseAdmin):
    list_display = [
        "name",
        "unit",
        "code",
        "building",
        "floor",
        "subsection_count",
        "is_active",
    ]
    list_filter = ["is_active", "unit", "unit__company", "building"]
    search_fields = ["name", "code", "unit__name", "unit__company__name", "building"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["unit", "supervisor"]
    inlines = [SubsectionInline, SectorContactInline]

    fieldsets = (
        ("Identificação", {"fields": ("name", "code", "unit", "is_active")}),
        ("Localização", {"fields": ("building", "floor", "area")}),
        (
            "Responsável",
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
            "Dados Operacionais",
            {"fields": ("occupants", "hvac_units"), "classes": ("collapse",)},
        ),
        ("Descrição", {"fields": ("description",), "classes": ("collapse",)}),
        (
            "Metadados",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def subsection_count(self, obj):
        return obj.subsections.count()

    subsection_count.short_description = "Subseções"


@admin.register(Subsection)
class SubsectionAdmin(BaseAdmin):
    list_display = ["name", "sector", "code", "position", "is_active"]
    list_filter = ["is_active", "sector__unit__company", "sector__unit", "sector"]
    search_fields = [
        "name",
        "code",
        "sector__name",
        "sector__unit__name",
        "sector__unit__company__name",
    ]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["sector"]
    inlines = [SubsectionContactInline]

    fieldsets = (
        ("Identificação", {"fields": ("name", "code", "sector", "is_active")}),
        ("Localização", {"fields": ("position", "reference")}),
        ("Descrição", {"fields": ("description",), "classes": ("collapse",)}),
        (
            "Metadados",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(LocationContact)
class LocationContactAdmin(BaseAdmin):
    list_display = ["name", "type", "location_display", "phone", "email"]
    list_filter = ["type", "created_at"]
    search_fields = ["name", "email", "phone"]
    raw_id_fields = ["company", "unit", "sector", "subsection"]

    def location_display(self, obj):
        loc = obj.location
        return str(loc) if loc else "-"

    location_display.short_description = "Localização"
