"""
ClimaTrak Admin Base Classes

Este módulo fornece classes base para ModelAdmins e Inlines usando django-unfold.
Todos os admins do projeto devem herdar dessas classes para garantir consistência visual.

Uso:
    from apps.common.admin_base import BaseAdmin, BaseTabularInline, BaseStackedInline

    @admin.register(MyModel)
    class MyModelAdmin(BaseAdmin):
        list_display = [...]

    class MyInline(BaseTabularInline):
        model = MyRelatedModel
"""

from unfold.admin import ModelAdmin, StackedInline, TabularInline


class BaseAdmin(ModelAdmin):
    """
    Classe base para todos os ModelAdmins do ClimaTrak.

    Herda de unfold.admin.ModelAdmin para garantir visual moderno.
    Adiciona configurações padrão do projeto.
    """

    # Paginação padrão
    list_per_page = 25

    # Formatação de datas consistente
    date_hierarchy_drilldown = True

    # Mostrar contagem total
    show_full_result_count = True


class BaseTabularInline(TabularInline):
    """
    Classe base para TabularInlines do ClimaTrak.

    Herda de unfold.admin.TabularInline para visual moderno.
    """

    extra = 0
    show_change_link = True


class BaseStackedInline(StackedInline):
    """
    Classe base para StackedInlines do ClimaTrak.

    Herda de unfold.admin.StackedInline para visual moderno.
    """

    extra = 0
    show_change_link = True
