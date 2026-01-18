"""
ClimaTrak Custom Admin Site

AdminSite customizado que integra com Jazzmin e fornece:
- Dashboard customizado com KPIs e quick actions
- Controle de visibilidade de apps por schema (public vs tenant)
- Branding e UX consistentes

Uso:
    Em urls_public.py:
        from apps.common.admin_site import climatrak_admin_site
        path("admin/", climatrak_admin_site.urls),
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _


class ClimaTrakAdminSite(admin.AdminSite):
    """
    AdminSite customizado para ClimaTrak.
    
    Sobrescreve o método index() para injetar contexto do dashboard
    sem depender do DASHBOARD_CALLBACK do Unfold.
    """
    
    site_title = _("ClimaTrak Admin")
    site_header = _("ClimaTrak")
    index_title = _("Dashboard")
    
    def index(self, request, extra_context=None):
        """
        Sobrescreve o índice do admin para adicionar contexto do dashboard.
        
        Chama a função dashboard_callback do apps.ops.admin_dashboard
        para popular o contexto com cards KPI, quick links, etc.
        """
        extra_context = extra_context or {}
        
        # Importar aqui para evitar imports circulares
        try:
            from apps.ops.admin_dashboard import dashboard_callback
            extra_context = dashboard_callback(request, extra_context)
        except ImportError:
            # Fallback se o módulo não existir
            pass
        except Exception:
            # Não quebrar o admin se houver erro no dashboard
            pass
        
        return super().index(request, extra_context=extra_context)
    
    def get_app_list(self, request, app_label=None):
        """
        Filtra a lista de apps baseado no schema atual.
        
        No schema público, esconde apps tenant-specific para evitar
        "Not available..." e UI poluída.
        """
        app_list = super().get_app_list(request, app_label)
        
        # Verificar se estamos no schema público
        is_public_schema = False
        try:
            tenant = getattr(request, 'tenant', None)
            if tenant:
                is_public_schema = tenant.schema_name == 'public'
        except Exception:
            pass
        
        # Apps que devem aparecer apenas no schema tenant
        tenant_only_apps = {
            'cmms',
            'inventory', 
            'locations',
            'assets',
            'alerts',
            'trakledger',
            'trakservice',
            'ingest',
        }
        
        if is_public_schema:
            # Filtrar apps tenant-specific no schema público
            app_list = [
                app for app in app_list 
                if app['app_label'] not in tenant_only_apps
            ]
        
        return app_list


# Instância global do AdminSite customizado
climatrak_admin_site = ClimaTrakAdminSite(name='climatrak_admin')

# Registrar modelos no admin site customizado
# Isso é feito automaticamente pelo Django quando usamos @admin.register
# mas precisamos garantir que o site customizado é usado

def register_all_models():
    """
    Registra todos os modelos do admin.site padrão no climatrak_admin_site.
    
    Deve ser chamado após todos os apps terem sido carregados (em urls_public.py).
    """
    # Copiar registros do admin.site padrão
    for model, admin_class in admin.site._registry.items():
        if model not in climatrak_admin_site._registry:
            climatrak_admin_site._registry[model] = admin_class
