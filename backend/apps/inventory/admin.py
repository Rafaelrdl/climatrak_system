"""
Admin para Inventory
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import (
    InventoryCategory, InventoryItem, InventoryMovement,
    InventoryCount, InventoryCountItem
)


@admin.register(InventoryCategory)
class InventoryCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'parent', 'item_count', 'is_active']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Itens'


class InventoryMovementInline(admin.TabularInline):
    model = InventoryMovement
    extra = 0
    readonly_fields = [
        'type', 'reason', 'quantity', 'quantity_before', 
        'quantity_after', 'performed_by', 'created_at'
    ]
    can_delete = False
    max_num = 10
    ordering = ['-created_at']
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name', 'category', 'quantity', 
        'stock_status_badge', 'unit_cost', 'is_critical', 'is_active'
    ]
    list_filter = ['is_active', 'is_critical', 'category', 'supplier']
    search_fields = ['code', 'name', 'description', 'barcode']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['category']
    inlines = [InventoryMovementInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('code', 'name', 'description', 'barcode', 'category')
        }),
        ('Estoque', {
            'fields': (
                'unit', 'quantity', 'min_quantity', 'max_quantity', 
                'reorder_point'
            )
        }),
        ('Valores', {
            'fields': ('unit_cost', 'last_purchase_cost')
        }),
        ('Localização', {
            'fields': ('location', 'shelf', 'bin')
        }),
        ('Fornecedor', {
            'fields': ('supplier', 'supplier_code', 'lead_time_days'),
            'classes': ('collapse',)
        }),
        ('Configurações', {
            'fields': ('image', 'is_active', 'is_critical', 'notes'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def stock_status_badge(self, obj):
        status = obj.stock_status
        colors = {
            'OK': '#10b981',
            'LOW': '#f59e0b',
            'OUT_OF_STOCK': '#ef4444',
            'OVERSTOCKED': '#3b82f6',
        }
        labels = {
            'OK': 'OK',
            'LOW': 'Baixo',
            'OUT_OF_STOCK': 'Sem Estoque',
            'OVERSTOCKED': 'Excesso',
        }
        color = colors.get(status, '#6b7280')
        label = labels.get(status, status)
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color, label
        )
    stock_status_badge.short_description = 'Status'


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'item', 'type', 'reason', 'quantity',
        'quantity_before', 'quantity_after', 'performed_by', 'created_at'
    ]
    list_filter = ['type', 'reason', 'created_at']
    search_fields = ['item__code', 'item__name', 'reference', 'invoice_number']
    readonly_fields = [
        'item', 'type', 'reason', 'quantity', 'quantity_before',
        'quantity_after', 'unit_cost', 'work_order', 'reference',
        'invoice_number', 'note', 'performed_by', 'created_at'
    ]
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


class InventoryCountItemInline(admin.TabularInline):
    model = InventoryCountItem
    extra = 0
    readonly_fields = ['expected_quantity', 'difference', 'has_discrepancy']
    raw_id_fields = ['item']


@admin.register(InventoryCount)
class InventoryCountAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'status_badge', 'scheduled_date', 
        'item_count', 'created_by', 'created_at'
    ]
    list_filter = ['status', 'scheduled_date', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'started_at', 'completed_at']
    raw_id_fields = ['created_by', 'performed_by']
    filter_horizontal = ['categories']
    inlines = [InventoryCountItemInline]
    
    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Itens'
    
    def status_badge(self, obj):
        colors = {
            'DRAFT': '#6b7280',
            'IN_PROGRESS': '#f59e0b',
            'COMPLETED': '#10b981',
            'CANCELLED': '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
