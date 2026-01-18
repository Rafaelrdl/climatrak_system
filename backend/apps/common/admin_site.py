"""
ClimaTrak Custom Admin Site

AdminSite customizado que integra com Jazzmin e fornece:
- Dashboard customizado com KPIs e quick actions
- Controle de visibilidade de apps por schema (public vs tenant)
- Banner fixo de tenant ativo (proteção multi-tenant)
- Bloqueio de operações em schema errado
- Branding e UX consistentes

PROTEÇÕES MULTI-TENANT:
1. Banner fixo mostrando tenant ativo + schema
2. Cor diferenciada quando em schema público (vermelho)
3. Bloqueio explícito de modelos tenant em schema público
4. Logging de operações administrativas

Uso:
    Em urls_public.py:
        from apps.common.admin_site import climatrak_admin_site
        path("admin/", climatrak_admin_site.urls),
"""

import logging
from functools import update_wrapper

from django.contrib import admin
from django.contrib.admin import AdminSite
from django.core.exceptions import PermissionDenied
from django.http import HttpRequest, HttpResponseForbidden
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURAÇÃO DE APPS POR SCHEMA
# =============================================================================

# Apps que existem APENAS no schema de tenant (não no public)
TENANT_ONLY_APPS = frozenset({
    "cmms",
    "inventory",
    "locations",
    "assets",
    "alerts",
    "trakledger",
    "trakservice",
    "ingest",
})

# Apps que existem APENAS no schema público (gestão de tenants)
PUBLIC_ONLY_APPS = frozenset({
    "tenants",
    "public_identity",
})

# Models críticos que são readonly por padrão (finance/audit)
READONLY_MODELS = frozenset({
    "costtransaction",
    "outboxevent",
    "inventorymovement",
})


def get_tenant_context(request: HttpRequest) -> dict:
    """
    Extrai contexto do tenant atual da request.
    
    Returns:
        dict com: tenant_name, schema_name, is_public, tenant_color
    """
    tenant = getattr(request, "tenant", None)
    
    if tenant is None:
        return {
            "tenant_name": "UNKNOWN",
            "schema_name": "unknown",
            "is_public": True,
            "tenant_color": "#dc3545",  # Vermelho - perigo
            "tenant_icon": "⚠️",
        }
    
    is_public = tenant.schema_name == "public"
    
    return {
        "tenant_name": getattr(tenant, "name", tenant.schema_name.upper()),
        "schema_name": tenant.schema_name,
        "is_public": is_public,
        "tenant_color": "#dc3545" if is_public else "#0d9488",  # Vermelho ou Teal
        "tenant_icon": "🌐" if is_public else "🏢",
    }


class ClimaTrakAdminSite(AdminSite):
    """
    AdminSite customizado para ClimaTrak com proteções multi-tenant.
    
    Funcionalidades:
    - Dashboard customizado com KPIs
    - Banner fixo de tenant ativo
    - Bloqueio de schema errado
    - Filtragem de apps por schema
    - Logging de operações
    """
    
    site_title = _("ClimaTrak Admin")
    site_header = _("ClimaTrak")
    index_title = _("Dashboard")
    
    # =========================================================================
    # OVERRIDE: Contexto global para todas as páginas
    # =========================================================================
    
    def each_context(self, request):
        """
        Adiciona contexto de tenant a TODAS as páginas do admin.
        
        Isso garante que o banner de tenant apareça em toda página.
        """
        context = super().each_context(request)
        
        # Adicionar contexto de tenant para o banner
        tenant_ctx = get_tenant_context(request)
        context.update({
            "tenant_banner": tenant_ctx,
            "is_public_schema": tenant_ctx["is_public"],
            "current_tenant_name": tenant_ctx["tenant_name"],
            "current_schema_name": tenant_ctx["schema_name"],
            "tenant_banner_color": tenant_ctx["tenant_color"],
            "tenant_banner_icon": tenant_ctx["tenant_icon"],
        })
        
        return context
    
    # =========================================================================
    # OVERRIDE: Dashboard/Index
    # =========================================================================
    
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
        except Exception as e:
            logger.warning(f"Erro ao carregar dashboard: {e}")
        
        return super().index(request, extra_context=extra_context)
    
    # =========================================================================
    # OVERRIDE: Filtragem de apps por schema
    # =========================================================================
    
    def get_app_list(self, request, app_label=None):
        """
        Filtra a lista de apps baseado no schema atual.
        
        - Schema público: mostra apenas apps públicos (tenants, public_identity, accounts)
        - Schema tenant: mostra apenas apps do tenant (cmms, inventory, etc.)
        """
        app_list = super().get_app_list(request, app_label)
        
        tenant_ctx = get_tenant_context(request)
        is_public = tenant_ctx["is_public"]
        
        if is_public:
            # Filtrar apps tenant-specific no schema público
            app_list = [
                app for app in app_list 
                if app["app_label"] not in TENANT_ONLY_APPS
            ]
        else:
            # Filtrar apps public-only no schema tenant
            app_list = [
                app for app in app_list 
                if app["app_label"] not in PUBLIC_ONLY_APPS
            ]
        
        return app_list
    
    # =========================================================================
    # PROTEÇÃO: Bloquear acesso a models no schema errado
    # =========================================================================
    
    def _check_schema_access(self, request, model) -> bool:
        """
        Verifica se o model pode ser acessado no schema atual.
        
        Returns:
            True se acesso permitido, False caso contrário
        """
        app_label = model._meta.app_label
        tenant_ctx = get_tenant_context(request)
        is_public = tenant_ctx["is_public"]
        
        if is_public and app_label in TENANT_ONLY_APPS:
            logger.warning(
                f"Bloqueado acesso a {app_label}.{model._meta.model_name} "
                f"no schema público (user: {request.user})"
            )
            return False
        
        if not is_public and app_label in PUBLIC_ONLY_APPS:
            logger.warning(
                f"Bloqueado acesso a {app_label}.{model._meta.model_name} "
                f"no schema {tenant_ctx['schema_name']} (user: {request.user})"
            )
            return False
        
        return True
    
    def _modeladmin_view(self, view, model, cacheable=False):
        """
        Wrapper para views de ModelAdmin que adiciona verificação de schema.
        """
        def wrapper(request, *args, **kwargs):
            if not self._check_schema_access(request, model):
                return HttpResponseForbidden(
                    f"<h1>403 - Acesso Negado</h1>"
                    f"<p>O modelo <strong>{model._meta.verbose_name}</strong> "
                    f"não está disponível neste schema.</p>"
                    f"<p>Verifique se você está acessando o tenant correto.</p>"
                    f"<a href='/admin/'>Voltar ao Dashboard</a>"
                )
            return view(request, *args, **kwargs)
        
        wrapper.model_admin = view.model_admin if hasattr(view, 'model_admin') else None
        return update_wrapper(wrapper, view)

    def admin_view(self, view, cacheable=False):
        """
        Override to inject schema protection into every ModelAdmin view.
        """
        decorated = super().admin_view(view, cacheable=cacheable)
        model_admin = getattr(decorated, "model_admin", None)
        if model_admin:
            decorated = self._modeladmin_view(
                decorated,
                model_admin.model,
                cacheable=cacheable,
            )
        return decorated
    
    # =========================================================================
    # OVERRIDE: URLs com proteção de schema
    # =========================================================================
    
    def get_urls(self):
        """
        Adiciona URLs customizadas e wrappers de proteção.
        """
        urls = super().get_urls()
        
        # URLs customizadas
        custom_urls = [
            path(
                "tenant-info/",
                self.admin_view(self.tenant_info_view),
                name="tenant_info",
            ),
        ]
        
        return custom_urls + urls
    
    def tenant_info_view(self, request):
        """
        View que exibe informações detalhadas do tenant atual.
        Útil para debugging e suporte.
        """
        tenant_ctx = get_tenant_context(request)
        
        context = {
            **self.each_context(request),
            "title": _("Informações do Tenant"),
            "tenant_info": tenant_ctx,
        }
        
        return TemplateResponse(
            request,
            "admin/tenant_info.html",
            context,
        )
    
    # =========================================================================
    # LOGGING: Registrar operações administrativas
    # =========================================================================
    
    def log_admin_action(self, request, model, action: str, object_id=None, extra=None):
        """
        Registra ação administrativa para auditoria.
        
        Args:
            request: HttpRequest
            model: Classe do model
            action: Tipo de ação (view, add, change, delete, action:name)
            object_id: ID do objeto (se aplicável)
            extra: Dados adicionais
        """
        tenant_ctx = get_tenant_context(request)
        
        log_data = {
            "admin_action": action,
            "model": f"{model._meta.app_label}.{model._meta.model_name}",
            "object_id": str(object_id) if object_id else None,
            "user_id": request.user.id if request.user else None,
            "username": request.user.username if request.user else None,
            "tenant": tenant_ctx["tenant_name"],
            "schema": tenant_ctx["schema_name"],
            "ip": request.META.get("REMOTE_ADDR"),
        }
        
        if extra:
            log_data["extra"] = extra
        
        logger.info(f"Admin action: {action}", extra=log_data)


# =============================================================================
# INSTÂNCIA GLOBAL
# =============================================================================

# Instância global do AdminSite customizado
climatrak_admin_site = ClimaTrakAdminSite(name="climatrak_admin")


def register_all_models():
    """
    Registra todos os modelos do admin.site padrão no climatrak_admin_site.
    
    Deve ser chamado após todos os apps terem sido carregados (em urls_public.py).
    """
    # Copiar registros do admin.site padrão
    for model, admin_class in admin.site._registry.items():
        if model not in climatrak_admin_site._registry:
            climatrak_admin_site._registry[model] = admin_class
