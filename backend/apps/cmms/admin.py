"""
Admin para CMMS
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import (
    ChecklistTemplate, WorkOrder, WorkOrderPhoto,
    WorkOrderItem, Request, RequestItem, MaintenancePlan
)


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'item_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def item_count(self, obj):
        return len(obj.items) if obj.items else 0
    item_count.short_description = 'Itens'


class WorkOrderPhotoInline(admin.TabularInline):
    model = WorkOrderPhoto
    extra = 0
    readonly_fields = ['uploaded_at', 'uploaded_by']


class WorkOrderItemInline(admin.TabularInline):
    model = WorkOrderItem
    extra = 0
    readonly_fields = ['total_cost']
    
    def total_cost(self, obj):
        return obj.quantity * obj.unit_cost if obj.unit_cost else '-'
    total_cost.short_description = 'Custo Total'


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'asset', 'type', 'priority', 
        'status_badge', 'scheduled_date', 'assigned_to'
    ]
    list_filter = ['status', 'type', 'priority', 'scheduled_date']
    search_fields = ['number', 'description', 'asset__tag', 'asset__name']
    readonly_fields = ['number', 'created_at', 'updated_at', 'started_at', 'completed_at']
    raw_id_fields = ['asset', 'assigned_to', 'created_by', 'request', 'maintenance_plan']
    date_hierarchy = 'scheduled_date'
    inlines = [WorkOrderPhotoInline, WorkOrderItemInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('number', 'asset', 'request', 'maintenance_plan')
        }),
        ('Classificação', {
            'fields': ('type', 'priority', 'status')
        }),
        ('Agendamento', {
            'fields': ('scheduled_date', 'estimated_hours', 'assigned_to')
        }),
        ('Descrição', {
            'fields': ('description', 'execution_description')
        }),
        ('Checklist', {
            'fields': ('checklist_template', 'checklist_responses'),
            'classes': ('collapse',)
        }),
        ('Execução', {
            'fields': ('started_at', 'completed_at', 'actual_hours', 'cancel_reason'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'OPEN': '#3b82f6',
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


class RequestItemInline(admin.TabularInline):
    model = RequestItem
    extra = 0


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'sector', 'asset', 'status_badge', 
        'requester', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'sector']
    search_fields = ['number', 'note', 'asset__tag']
    readonly_fields = ['number', 'created_at', 'updated_at']
    raw_id_fields = ['sector', 'subsection', 'asset', 'requester']
    inlines = [RequestItemInline]
    
    def status_badge(self, obj):
        colors = {
            'PENDING': '#3b82f6',
            'APPROVED': '#10b981',
            'REJECTED': '#ef4444',
            'CONVERTED': '#8b5cf6',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 4px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(MaintenancePlan)
class MaintenancePlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'frequency', 'is_active', 'asset_count',
        'next_execution', 'last_execution'
    ]
    list_filter = ['is_active', 'frequency', 'next_execution']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'last_execution']
    filter_horizontal = ['assets']
    
    fieldsets = (
        ('Identificação', {
            'fields': ('name', 'description')
        }),
        ('Configuração', {
            'fields': ('is_active', 'frequency', 'frequency_value')
        }),
        ('Execução', {
            'fields': ('next_execution', 'last_execution')
        }),
        ('Ativos e Checklist', {
            'fields': ('assets', 'checklist_template')
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def asset_count(self, obj):
        return obj.assets.count()
    asset_count.short_description = 'Ativos'
