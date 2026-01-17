"""
ClimaTrak Admin Base Classes

Este módulo fornece classes base para ModelAdmins e Inlines usando django-unfold.
Todos os admins do projeto devem herdar dessas classes para garantir consistência visual
e comportamentos padrão de UX, performance e segurança multi-tenant.

Uso:
    from apps.common.admin_base import (
        BaseAdmin,
        BaseTabularInline,
        BaseStackedInline,
        TimestampedAdminMixin,
        ReadonlyIfLockedMixin,
    )

    @admin.register(MyModel)
    class MyModelAdmin(TimestampedAdminMixin, BaseAdmin):
        list_display = [...]

    class MyInline(BaseTabularInline):
        model = MyRelatedModel
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

try:
    from unfold.admin import ModelAdmin, StackedInline, TabularInline
    from unfold.decorators import action as unfold_action

    UNFOLD_AVAILABLE = True
except ModuleNotFoundError:
    from django.contrib.admin import ModelAdmin, StackedInline, TabularInline

    # Fallback para decorator padrão do Django
    unfold_action = admin.action
    UNFOLD_AVAILABLE = False


# =============================================================================
# MIXINS REUTILIZÁVEIS
# =============================================================================


class TimestampedAdminMixin:
    """
    Mixin para modelos com campos de timestamp (created_at, updated_at).

    Adiciona automaticamente:
    - created_at e updated_at como readonly_fields
    - ordering por -created_at (se não definido)
    - Fieldset de auditoria colapsado
    """

    # Campos de timestamp padrão (sobrescrever se necessário)
    timestamp_fields = ("created_at", "updated_at")

    def get_readonly_fields(self, request, obj=None):
        """Adiciona campos de timestamp aos readonly_fields."""
        readonly = list(super().get_readonly_fields(request, obj) or [])
        for field in self.timestamp_fields:
            if hasattr(self.model, field) and field not in readonly:
                readonly.append(field)
        return readonly

    def get_ordering(self, request):
        """Define ordering padrão por -created_at se não definido."""
        ordering = super().get_ordering(request)
        if not ordering and hasattr(self.model, "created_at"):
            return ["-created_at"]
        return ordering


class ReadonlyIfLockedMixin:
    """
    Mixin para modelos com campo de lock (is_locked).

    Funcionalidade:
    - Quando is_locked=True, todos os campos editáveis ficam readonly
    - Botões de salvar são removidos para registros locked
    - Apenas superusuários podem desbloquear

    Uso:
        class BudgetMonthAdmin(ReadonlyIfLockedMixin, BaseAdmin):
            lock_field = "is_locked"  # Nome do campo de lock
            lock_protected_fields = ["planned_amount"]  # Campos protegidos
    """

    # Nome do campo que indica lock (sobrescrever se diferente)
    lock_field = "is_locked"

    # Campos que ficam readonly quando locked (além dos já readonly)
    lock_protected_fields = []

    def is_locked(self, obj):
        """Verifica se o objeto está bloqueado."""
        if obj is None:
            return False
        return getattr(obj, self.lock_field, False)

    def get_readonly_fields(self, request, obj=None):
        """Adiciona campos protegidos aos readonly quando locked."""
        readonly = list(super().get_readonly_fields(request, obj) or [])

        if self.is_locked(obj):
            for field in self.lock_protected_fields:
                if field not in readonly:
                    readonly.append(field)
            # Adiciona o próprio campo de lock como readonly
            if self.lock_field not in readonly:
                readonly.append(self.lock_field)

        return readonly

    def has_change_permission(self, request, obj=None):
        """Restringe edição de registros locked para não-superusers."""
        if self.is_locked(obj) and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        """Proíbe deleção de registros locked."""
        if self.is_locked(obj):
            return False
        return super().has_delete_permission(request, obj)

    def change_view(self, request, object_id, form_url="", extra_context=None):
        """Adiciona contexto para templates sobre status de lock."""
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)
        if self.is_locked(obj):
            extra_context["is_locked"] = True
            extra_context["lock_message"] = _(
                "⚠️ Este registro está bloqueado e não pode ser editado. "
                "Use ajustes/adjustments para correções."
            )
        return super().change_view(request, object_id, form_url, extra_context)


class AuditFieldsMixin:
    """
    Mixin para campos de auditoria (created_by, updated_by).

    Preenche automaticamente o campo created_by/updated_by com o usuário
    da requisição ao salvar.
    """

    created_by_field = "created_by"
    updated_by_field = None  # Sobrescrever se existir

    def save_model(self, request, obj, form, change):
        """Preenche campos de auditoria automaticamente."""
        if not change and hasattr(obj, self.created_by_field):
            if getattr(obj, self.created_by_field) is None:
                setattr(obj, self.created_by_field, request.user)

        if (
            self.updated_by_field
            and hasattr(obj, self.updated_by_field)
        ):
            setattr(obj, self.updated_by_field, request.user)

        super().save_model(request, obj, form, change)


# =============================================================================
# CLASSES BASE
# =============================================================================


class BaseAdmin(ModelAdmin):
    """
    Classe base para todos os ModelAdmins do ClimaTrak.

    Herda de unfold.admin.ModelAdmin para garantir visual moderno.
    Inclui configurações padrão do projeto para melhor UX.

    Atributos Unfold habilitados:
    - warn_unsaved_form: Alerta ao sair de form com alterações não salvas
    - list_filter_submit: Botão "Aplicar" nos filtros (evita reload a cada filtro)
    - list_fullwidth: Lista ocupa toda a largura disponível
    - list_per_page: 25 itens por página (padrão)
    """

    # ==========================================================================
    # Unfold UX Options
    # ==========================================================================
    warn_unsaved_form = True  # Alerta ao sair sem salvar
    list_filter_submit = True  # Botão "Aplicar" nos filtros
    list_fullwidth = True  # Lista em largura total

    # ==========================================================================
    # Django Admin Options
    # ==========================================================================
    list_per_page = 25
    show_full_result_count = True
    date_hierarchy_drilldown = True
    save_on_top = True  # Botões de salvar no topo também

    # ==========================================================================
    # Performance
    # ==========================================================================
    # Sobrescrever em subclasses para otimizar queries
    # list_select_related = ["fk1", "fk2"]
    # prefetch_related = ["m2m1", "m2m2"]

    def get_queryset(self, request):
        """
        Otimiza queryset com select_related/prefetch_related se definido.

        Subclasses devem definir:
        - list_select_related: lista de FKs para select_related
        - list_prefetch_related: lista de M2M/reverse FKs para prefetch_related
        """
        qs = super().get_queryset(request)

        if hasattr(self, "list_select_related") and self.list_select_related:
            qs = qs.select_related(*self.list_select_related)

        if hasattr(self, "list_prefetch_related") and self.list_prefetch_related:
            qs = qs.prefetch_related(*self.list_prefetch_related)

        return qs


class BaseTabularInline(TabularInline):
    """
    Classe base para TabularInlines do ClimaTrak.

    Herda de unfold.admin.TabularInline para visual moderno.
    """

    extra = 0
    show_change_link = True
    classes = ["collapse"]  # Inlines colapsados por padrão


class BaseStackedInline(StackedInline):
    """
    Classe base para StackedInlines do ClimaTrak.

    Herda de unfold.admin.StackedInline para visual moderno.
    """

    extra = 0
    show_change_link = True
    classes = ["collapse"]  # Inlines colapsados por padrão


# =============================================================================
# HELPERS PARA BADGES E FORMATAÇÃO
# =============================================================================


def status_badge(value: str, color: str, icon: str = None) -> str:
    """
    Cria um badge colorido para exibição em list_display.

    Args:
        value: Texto a exibir
        color: Cor hex (ex: "#10b981")
        icon: Emoji opcional para prefixo

    Returns:
        HTML formatado do badge
    """
    icon_html = f"{icon} " if icon else ""
    return format_html(
        '<span style="background-color: {}; color: white; padding: 4px 8px; '
        'border-radius: 4px; font-size: 11px; font-weight: 500;">{}{}</span>',
        color,
        icon_html,
        value,
    )


# Cores padrão para status comuns
STATUS_COLORS = {
    # Geral
    "success": "#10b981",  # Verde
    "warning": "#f59e0b",  # Amarelo/Laranja
    "danger": "#ef4444",  # Vermelho
    "info": "#3b82f6",  # Azul
    "neutral": "#6b7280",  # Cinza
    "purple": "#8b5cf6",  # Roxo
    # Status específicos
    "open": "#3b82f6",
    "in_progress": "#f59e0b",
    "completed": "#10b981",
    "cancelled": "#ef4444",
    "pending": "#f59e0b",
    "approved": "#10b981",
    "rejected": "#ef4444",
    "locked": "#ef4444",
    "unlocked": "#10b981",
    "active": "#10b981",
    "inactive": "#6b7280",
    "critical": "#ef4444",
    "high": "#f59e0b",
    "medium": "#3b82f6",
    "low": "#6b7280",
}


def get_status_color(status: str) -> str:
    """Retorna cor para um status, com fallback para cinza."""
    return STATUS_COLORS.get(status.lower().replace(" ", "_"), STATUS_COLORS["neutral"])

