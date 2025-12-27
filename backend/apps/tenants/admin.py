"""
Admin configuration for Tenant models.

Nova arquitetura: Acesso aos dados de Assets, Devices, Sensors e Sites
é feito através do TenantAdmin, garantindo contexto correto do tenant.
"""

from django.contrib import admin
from django.urls import path, reverse
from django.utils.html import format_html
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django_tenants.admin import TenantAdminMixin
from django_tenants.utils import schema_context

from .models import Domain, Tenant


@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    """
    Admin interface for Tenant model.
    
    Permite gerenciar tenants e acessar seus dados (Assets, Devices, Sensors, Sites)
    através de views customizadas que garantem o contexto correto do schema.
    """
    
    list_display = ['name', 'slug', 'schema_name', 'domain_count', 'resources_summary', 'tenant_actions', 'created_at']
    search_fields = ['name', 'slug', 'schema_name']
    readonly_fields = ['schema_name', 'created_at', 'updated_at']
    list_per_page = 25
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'slug'),
            'description': 'Nome e identificador único do tenant/organização.'
        }),
        ('Schema e Timestamps', {
            'fields': ('schema_name', 'created_at', 'updated_at'),
            'classes': ('collapse',),
            'description': 'Schema PostgreSQL e datas de criação/modificação (gerados automaticamente).'
        }),
    )
    
    def domain_count(self, obj):
        """Número de domínios associados."""
        count = obj.domains.count()
        return format_html('<span style="color: #0066cc; font-weight: bold;">{}</span>', count)
    domain_count.short_description = '🌐 Domínios'
    
    def resources_summary(self, obj):
        """Resumo dos recursos do tenant."""
        if obj.schema_name == 'public':
            return format_html('<span style="color: #999;">-</span>')
        
        try:
            with schema_context(obj.schema_name):
                from apps.assets.models import Site, Asset, Device, Sensor
                
                site_count = Site.objects.count()
                asset_count = Asset.objects.count()
                device_count = Device.objects.count()
                sensor_count = Sensor.objects.count()
                
                return format_html(
                    '<div style="font-size: 11px; line-height: 1.4;">'
                    '📍 <b>{}</b> sites<br>'
                    '🏭 <b>{}</b> assets<br>'
                    '📡 <b>{}</b> devices<br>'
                    '🔬 <b>{}</b> sensors'
                    '</div>',
                    site_count, asset_count, device_count, sensor_count
                )
        except Exception as e:
            return format_html('<span style="color: red; font-size: 11px;">Erro: {}</span>', str(e)[:30])
    resources_summary.short_description = 'Recursos'
    
    def tenant_actions(self, obj):
        """Botões de ação para gerenciar recursos do tenant."""
        if obj.schema_name == 'public':
            return format_html('<span style="color: #999;">-</span>')
        
        return format_html(
            '<div style="white-space: nowrap;">'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">📍 Sites</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">🏭 Assets</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">📡 Devices</a>'
            '<a class="button" style="padding: 5px 10px; margin: 2px; background-color: #79aec8; color: white; '
            'text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px;" '
            'href="{}">🔬 Sensors</a>'
            '</div>',
            reverse('admin:tenant_sites', args=[obj.pk]),
            reverse('admin:tenant_assets', args=[obj.pk]),
            reverse('admin:tenant_devices', args=[obj.pk]),
            reverse('admin:tenant_sensors', args=[obj.pk]),
        )
    tenant_actions.short_description = 'Gerenciar'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('domains')
    
    def get_urls(self):
        """Adiciona URLs customizadas para gerenciar recursos do tenant."""
        urls = super().get_urls()
        custom_urls = [
            # Sites URLs
            path('<int:tenant_id>/sites/', 
                 self.admin_site.admin_view(self.tenant_sites_view), 
                 name='tenant_sites'),
            path('<int:tenant_id>/sites/add/', 
                 self.admin_site.admin_view(self.tenant_site_add_view), 
                 name='tenant_site_add'),
            path('<int:tenant_id>/sites/<int:site_id>/edit/', 
                 self.admin_site.admin_view(self.tenant_site_edit_view), 
                 name='tenant_site_edit'),
            path('<int:tenant_id>/sites/<int:site_id>/delete/', 
                 self.admin_site.admin_view(self.tenant_site_delete_view), 
                 name='tenant_site_delete'),
            # Assets, Devices, Sensors URLs
            path('<int:tenant_id>/assets/', 
                 self.admin_site.admin_view(self.tenant_assets_view), 
                 name='tenant_assets'),
            path('<int:tenant_id>/devices/', 
                 self.admin_site.admin_view(self.tenant_devices_view), 
                 name='tenant_devices'),
            path('<int:tenant_id>/sensors/', 
                 self.admin_site.admin_view(self.tenant_sensors_view), 
                 name='tenant_sensors'),
        ]
        return custom_urls + urls
    
    def tenant_sites_view(self, request, tenant_id):
        """View para gerenciar sites de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Site
            sites = Site.objects.all().order_by('-created_at')
            
            context = {
                'title': f'Sites - {tenant.name}',
                'tenant': tenant,
                'sites': sites,
                'opts': self.model._meta,
                'has_view_permission': self.has_view_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_sites.html', context)
    
    def tenant_site_add_view(self, request, tenant_id):
        """View para adicionar um novo site."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Site
            from django import forms
            
            # Timezones do Brasil e principais (alinhado com o frontend)
            TIMEZONE_CHOICES = [
                ('America/Sao_Paulo', 'Brasília (GMT-3) - Brasil'),
                ('America/Manaus', 'Manaus (GMT-4) - Brasil'),
                ('America/Fortaleza', 'Fortaleza (GMT-3) - Brasil'),
                ('America/Recife', 'Recife (GMT-3) - Brasil'),
                ('America/Noronha', 'Fernando de Noronha (GMT-2) - Brasil'),
                ('America/New_York', 'New York (GMT-5) - EUA'),
                ('America/Los_Angeles', 'Los Angeles (GMT-8) - EUA'),
                ('Europe/London', 'London (GMT+0) - Europa'),
                ('Europe/Paris', 'Paris (GMT+1) - Europa'),
                ('Asia/Tokyo', 'Tokyo (GMT+9) - Ásia'),
            ]
            
            class SiteForm(forms.ModelForm):
                timezone = forms.ChoiceField(
                    choices=TIMEZONE_CHOICES,
                    initial='America/Sao_Paulo',
                    label='Fuso Horário',
                    help_text='Selecione o fuso horário do site'
                )
                
                class Meta:
                    model = Site
                    fields = ['name', 'company', 'sector', 'address', 
                             'timezone', 'latitude', 'longitude', 'is_active']
                    widgets = {
                        'name': forms.TextInput(attrs={'placeholder': 'Ex: Hospital Central'}),
                        'company': forms.TextInput(attrs={'placeholder': 'Ex: Rede Hospitalar SP'}),
                        'sector': forms.TextInput(attrs={'placeholder': 'Ex: Saúde'}),
                        'address': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Endereço completo'}),
                        'latitude': forms.NumberInput(attrs={'step': '0.000001', 'placeholder': 'Ex: -15.793889'}),
                        'longitude': forms.NumberInput(attrs={'step': '0.000001', 'placeholder': 'Ex: -47.882778'}),
                    }
            
            if request.method == 'POST':
                form = SiteForm(request.POST)
                if form.is_valid():
                    site = form.save()
                    messages.success(request, f"✅ Site '{site.name}' criado com sucesso!")
                    return redirect('admin:tenant_sites', tenant_id=tenant_id)
            else:
                form = SiteForm(initial={
                    'company': tenant.name, 
                    'is_active': True,
                    'timezone': 'America/Sao_Paulo'
                })
            
            context = {
                'title': 'Adicionar Novo Site',
                'tenant': tenant,
                'form': form,
                'site': None,
                'opts': self.model._meta,
                'has_add_permission': self.has_add_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_site_form.html', context)
    
    def tenant_site_edit_view(self, request, tenant_id, site_id):
        """View para editar um site específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Site
            from django import forms
            
            site = get_object_or_404(Site, pk=site_id)
            
            # Timezones do Brasil e principais (alinhado com o frontend)
            TIMEZONE_CHOICES = [
                ('America/Sao_Paulo', 'Brasília (GMT-3) - Brasil'),
                ('America/Manaus', 'Manaus (GMT-4) - Brasil'),
                ('America/Fortaleza', 'Fortaleza (GMT-3) - Brasil'),
                ('America/Recife', 'Recife (GMT-3) - Brasil'),
                ('America/Noronha', 'Fernando de Noronha (GMT-2) - Brasil'),
                ('America/New_York', 'New York (GMT-5) - EUA'),
                ('America/Los_Angeles', 'Los Angeles (GMT-8) - EUA'),
                ('Europe/London', 'London (GMT+0) - Europa'),
                ('Europe/Paris', 'Paris (GMT+1) - Europa'),
                ('Asia/Tokyo', 'Tokyo (GMT+9) - Ásia'),
            ]
            
            class SiteForm(forms.ModelForm):
                timezone = forms.ChoiceField(
                    choices=TIMEZONE_CHOICES,
                    initial='America/Sao_Paulo',
                    label='Fuso Horário',
                    help_text='Selecione o fuso horário do site'
                )
                
                class Meta:
                    model = Site
                    fields = ['name', 'company', 'sector', 'address', 
                             'timezone', 'latitude', 'longitude', 'is_active']
                    widgets = {
                        'name': forms.TextInput(attrs={'placeholder': 'Ex: Hospital Central'}),
                        'company': forms.TextInput(attrs={'placeholder': 'Ex: Rede Hospitalar SP'}),
                        'sector': forms.TextInput(attrs={'placeholder': 'Ex: Saúde'}),
                        'address': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Endereço completo'}),
                        'latitude': forms.NumberInput(attrs={'step': '0.000001', 'placeholder': 'Ex: -15.793889'}),
                        'longitude': forms.NumberInput(attrs={'step': '0.000001', 'placeholder': 'Ex: -47.882778'}),
                    }
            
            if request.method == 'POST':
                form = SiteForm(request.POST, instance=site)
                if form.is_valid():
                    form.save()
                    messages.success(request, f"✅ Site '{site.name}' atualizado com sucesso!")
                    return redirect('admin:tenant_sites', tenant_id=tenant_id)
            else:
                form = SiteForm(instance=site)
            
            context = {
                'title': 'Editar Site',
                'tenant': tenant,
                'site': site,
                'form': form,
                'opts': self.model._meta,
                'has_change_permission': self.has_change_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_site_form.html', context)
    
    def tenant_site_delete_view(self, request, tenant_id, site_id):
        """View para excluir um site específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Site
            
            site = get_object_or_404(Site, pk=site_id)
            asset_count = site.assets.count()
            
            if request.method == 'POST' and 'confirm' in request.POST:
                site_name = site.name
                site.delete()
                messages.success(request, f"🗑️ Site '{site_name}' excluído com sucesso!")
                return redirect('admin:tenant_sites', tenant_id=tenant_id)
            
            context = {
                'title': f'Excluir Site: {site.name}',
                'tenant': tenant,
                'site': site,
                'asset_count': asset_count,
                'opts': self.model._meta,
                'has_delete_permission': self.has_delete_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_site_delete.html', context)
    
    def tenant_assets_view(self, request, tenant_id):
        """View para gerenciar assets de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Asset
            assets = Asset.objects.select_related('site').all().order_by('-created_at')
            
            context = {
                'title': f'Assets - {tenant.name}',
                'tenant': tenant,
                'assets': assets,
                'opts': self.model._meta,
                'has_view_permission': self.has_view_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_assets.html', context)
    
    def tenant_devices_view(self, request, tenant_id):
        """View para gerenciar devices de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Device
            devices = Device.objects.select_related('asset', 'asset__site').all().order_by('-created_at')
            
            context = {
                'title': f'Devices - {tenant.name}',
                'tenant': tenant,
                'devices': devices,
                'opts': self.model._meta,
                'has_view_permission': self.has_view_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_devices.html', context)
    
    def tenant_sensors_view(self, request, tenant_id):
        """View para gerenciar sensors de um tenant específico."""
        tenant = get_object_or_404(Tenant, pk=tenant_id)
        
        with schema_context(tenant.schema_name):
            from apps.assets.models import Sensor
            sensors = Sensor.objects.select_related('device', 'device__asset').all().order_by('-created_at')
            
            context = {
                'title': f'Sensors - {tenant.name}',
                'tenant': tenant,
                'sensors': sensors,
                'opts': self.model._meta,
                'has_view_permission': self.has_view_permission(request),
            }
            
            return render(request, 'admin/tenants/tenant_sensors.html', context)


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    """Admin interface for Domain model."""
    
    list_display = ['domain', 'tenant_link', 'schema_badge', 'primary_badge']
    list_filter = ['is_primary', 'tenant']
    search_fields = ['domain', 'tenant__name', 'tenant__slug']
    raw_id_fields = ['tenant']
    list_per_page = 50
    
    fieldsets = (
        ('Configuração do Domain', {
            'fields': ('domain', 'tenant', 'is_primary'),
            'description': 'Configure o hostname que será resolvido para este tenant.'
        }),
    )
    
    def tenant_link(self, obj):
        """Link para o tenant."""
        return format_html(
            '<a href="/admin/tenants/tenant/{}/change/" style="color: #0066cc; text-decoration: none;">'
            '🏢 {}</a>',
            obj.tenant.id,
            obj.tenant.name
        )
    tenant_link.short_description = 'Tenant'
    
    def schema_badge(self, obj):
        """Schema do tenant."""
        return format_html(
            '<code style="background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 11px;">{}</code>',
            obj.tenant.schema_name
        )
    schema_badge.short_description = 'Schema'
    
    def primary_badge(self, obj):
        """Badge de domínio primário."""
        if obj.is_primary:
            return format_html('<span style="color: #28a745; font-weight: bold;">⭐ Primário</span>')
        return format_html('<span style="color: #999;">Secundário</span>')
    primary_badge.short_description = 'Tipo'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('tenant')
