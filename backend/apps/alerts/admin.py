"""
Admin para o sistema de Alertas e Regras
"""
from django.contrib import admin
from .models import Rule, RuleParameter, Alert, NotificationPreference


class RuleParameterInline(admin.TabularInline):
    """Inline para editar parâmetros da regra"""
    model = RuleParameter
    extra = 1
    fields = ['parameter_key', 'variable_key', 'operator', 'threshold', 'unit', 'duration', 'severity', 'message_template', 'order']
    ordering = ['order']


@admin.register(Rule)
class RuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'equipment', 'enabled', 'parameters_count', 'created_at']
    list_filter = ['enabled', 'created_at']
    search_fields = ['name', 'description', 'equipment__name', 'equipment__tag']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    inlines = [RuleParameterInline]
    
    fieldsets = (
        ('Identificação', {
            'fields': ('name', 'description')
        }),
        ('Equipamento', {
            'fields': ('equipment',)
        }),
        ('Ações', {
            'fields': ('actions',)
        }),
        ('Estado', {
            'fields': ('enabled',)
        }),
        ('Campos Antigos (Deprecated)', {
            'fields': ('parameter_key', 'variable_key', 'operator', 'threshold', 'unit', 'duration', 'severity'),
            'classes': ('collapse',),
            'description': 'Campos mantidos para compatibilidade. Novas regras devem usar a tabela de Parâmetros abaixo.'
        }),
        ('Informações do Sistema', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    def parameters_count(self, obj):
        """Mostra quantidade de parâmetros"""
        count = obj.parameters.count()
        return f"{count} parâmetro(s)"
    parameters_count.short_description = 'Parâmetros'


@admin.register(RuleParameter)
class RuleParameterAdmin(admin.ModelAdmin):
    list_display = ['rule', 'parameter_key', 'operator', 'threshold', 'severity', 'order']
    list_filter = ['severity', 'operator']
    search_fields = ['rule__name', 'parameter_key', 'variable_key']
    list_select_related = ['rule']
    ordering = ['rule', 'order']


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['asset_tag', 'severity', 'message_preview', 'triggered_at', 'acknowledged', 'resolved']
    list_filter = ['severity', 'acknowledged', 'resolved', 'triggered_at']
    search_fields = ['asset_tag', 'message', 'parameter_key']
    readonly_fields = ['triggered_at', 'acknowledged_at', 'acknowledged_by', 'resolved_at', 'resolved_by']
    fieldsets = (
        ('Alerta', {
            'fields': ('rule', 'message', 'severity')
        }),
        ('Dados', {
            'fields': ('asset_tag', 'parameter_key', 'parameter_value', 'threshold')
        }),
        ('Estado', {
            'fields': ('triggered_at',)
        }),
        ('Reconhecimento', {
            'fields': ('acknowledged', 'acknowledged_at', 'acknowledged_by')
        }),
        ('Resolução', {
            'fields': ('resolved', 'resolved_at', 'resolved_by')
        }),
        ('Notas', {
            'fields': ('notes',)
        }),
    )
    
    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Mensagem'


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_enabled', 'push_enabled', 'sms_enabled', 'whatsapp_enabled']
    list_filter = ['email_enabled', 'push_enabled', 'sms_enabled', 'whatsapp_enabled']
    search_fields = ['user__email', 'phone_number', 'whatsapp_number']
    readonly_fields = ['updated_at']
    fieldsets = (
        ('Usuário', {
            'fields': ('user',)
        }),
        ('Canais de Notificação', {
            'fields': ('email_enabled', 'push_enabled', 'sound_enabled', 'sms_enabled', 'whatsapp_enabled')
        }),
        ('Severidades', {
            'fields': ('critical_alerts', 'high_alerts', 'medium_alerts', 'low_alerts')
        }),
        ('Contatos', {
            'fields': ('phone_number', 'whatsapp_number')
        }),
        ('Informações do Sistema', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )

