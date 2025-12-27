"""
Admin para Locations
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import Company, Sector, Subsection, LocationContact


class LocationContactInline(admin.TabularInline):
    model = LocationContact
    extra = 0
    fields = ['type', 'name', 'phone', 'email']
    
    def get_queryset(self, request):
        # Retorna queryset vazio por padrão - cada inline específico filtra
        return super().get_queryset(request)


class CompanyContactInline(LocationContactInline):
    fk_name = 'company'


class SectorContactInline(LocationContactInline):
    fk_name = 'sector'


class SubsectionContactInline(LocationContactInline):
    fk_name = 'subsection'


class SectorInline(admin.TabularInline):
    model = Sector
    extra = 0
    fields = ['name', 'code', 'building', 'floor', 'is_active']
    show_change_link = True


class SubsectionInline(admin.TabularInline):
    model = Subsection
    extra = 0
    fields = ['name', 'code', 'position', 'is_active']
    show_change_link = True


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'city', 'state', 
        'sector_count', 'is_active'
    ]
    list_filter = ['is_active', 'state', 'city']
    search_fields = ['name', 'code', 'cnpj', 'city']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['manager']
    inlines = [SectorInline, CompanyContactInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('name', 'code', 'cnpj', 'is_active')
        }),
        ('Endereço', {
            'fields': ('address', 'city', 'state')
        }),
        ('Contato', {
            'fields': ('phone', 'email', 'manager')
        }),
        ('Configurações', {
            'fields': ('logo', 'timezone'),
            'classes': ('collapse',)
        }),
        ('Descrição', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def sector_count(self, obj):
        return obj.sectors.count()
    sector_count.short_description = 'Setores'


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'company', 'code', 'building', 'floor',
        'subsection_count', 'is_active'
    ]
    list_filter = ['is_active', 'company', 'building']
    search_fields = ['name', 'code', 'company__name', 'building']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['company', 'supervisor']
    inlines = [SubsectionInline, SectorContactInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('name', 'code', 'company', 'is_active')
        }),
        ('Localização', {
            'fields': ('building', 'floor', 'area')
        }),
        ('Responsável', {
            'fields': ('supervisor',)
        }),
        ('Descrição', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def subsection_count(self, obj):
        return obj.subsections.count()
    subsection_count.short_description = 'Subseções'


@admin.register(Subsection)
class SubsectionAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'sector', 'code', 'position', 'is_active'
    ]
    list_filter = ['is_active', 'sector__company', 'sector']
    search_fields = ['name', 'code', 'sector__name', 'sector__company__name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['sector']
    inlines = [SubsectionContactInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('name', 'code', 'sector', 'is_active')
        }),
        ('Localização', {
            'fields': ('position', 'reference')
        }),
        ('Descrição', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LocationContact)
class LocationContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'location_display', 'phone', 'email']
    list_filter = ['type', 'created_at']
    search_fields = ['name', 'email', 'phone']
    raw_id_fields = ['company', 'sector', 'subsection']
    
    def location_display(self, obj):
        loc = obj.location
        return str(loc) if loc else '-'
    location_display.short_description = 'Localização'
