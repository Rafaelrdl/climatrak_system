"""
Finance Filters

Filtros para os ViewSets do módulo Finance.
"""

import django_filters
from .models import CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth


class CostCenterFilter(django_filters.FilterSet):
    """Filtros para Centro de Custo."""
    
    code = django_filters.CharFilter(lookup_expr='icontains')
    name = django_filters.CharFilter(lookup_expr='icontains')
    parent = django_filters.UUIDFilter(field_name='parent_id')
    is_root = django_filters.BooleanFilter(method='filter_is_root')
    is_active = django_filters.BooleanFilter()
    has_tag = django_filters.CharFilter(method='filter_has_tag')
    
    class Meta:
        model = CostCenter
        fields = ['code', 'name', 'parent', 'is_root', 'is_active', 'has_tag']
    
    def filter_is_root(self, queryset, name, value):
        if value:
            return queryset.filter(parent__isnull=True)
        return queryset.filter(parent__isnull=False)
    
    def filter_has_tag(self, queryset, name, value):
        return queryset.filter(tags__contains=[value])


class RateCardFilter(django_filters.FilterSet):
    """Filtros para Tabela de Custos."""
    
    role = django_filters.CharFilter(lookup_expr='icontains')
    role_code = django_filters.CharFilter(lookup_expr='icontains')
    is_active = django_filters.BooleanFilter()
    is_current = django_filters.BooleanFilter(method='filter_is_current')
    min_cost = django_filters.NumberFilter(field_name='cost_per_hour', lookup_expr='gte')
    max_cost = django_filters.NumberFilter(field_name='cost_per_hour', lookup_expr='lte')
    effective_date = django_filters.DateFilter(method='filter_effective_date')
    
    class Meta:
        model = RateCard
        fields = ['role', 'role_code', 'is_active', 'is_current', 'min_cost', 'max_cost', 'effective_date']
    
    def filter_is_current(self, queryset, name, value):
        from django.utils import timezone
        from django.db.models import Q
        
        today = timezone.now().date()
        if value:
            return queryset.filter(
                is_active=True,
                effective_from__lte=today
            ).filter(
                Q(effective_to__isnull=True) | Q(effective_to__gte=today)
            )
        return queryset
    
    def filter_effective_date(self, queryset, name, value):
        """Filtra rate cards vigentes em uma data específica."""
        from django.db.models import Q
        return queryset.filter(
            effective_from__lte=value
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=value)
        )


class BudgetPlanFilter(django_filters.FilterSet):
    """Filtros para Plano Orçamentário."""
    
    code = django_filters.CharFilter(lookup_expr='icontains')
    name = django_filters.CharFilter(lookup_expr='icontains')
    year = django_filters.NumberFilter()
    year_gte = django_filters.NumberFilter(field_name='year', lookup_expr='gte')
    year_lte = django_filters.NumberFilter(field_name='year', lookup_expr='lte')
    status = django_filters.ChoiceFilter(choices=BudgetPlan.Status.choices)
    min_total = django_filters.NumberFilter(field_name='total_planned', lookup_expr='gte')
    max_total = django_filters.NumberFilter(field_name='total_planned', lookup_expr='lte')
    
    class Meta:
        model = BudgetPlan
        fields = ['code', 'name', 'year', 'year_gte', 'year_lte', 'status', 'min_total', 'max_total']


class BudgetEnvelopeFilter(django_filters.FilterSet):
    """Filtros para Envelope de Orçamento."""
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    budget_plan = django_filters.UUIDFilter()
    cost_center = django_filters.UUIDFilter()
    category = django_filters.ChoiceFilter(choices=BudgetEnvelope.Category.choices)
    is_active = django_filters.BooleanFilter()
    year = django_filters.NumberFilter(field_name='budget_plan__year')
    min_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    
    class Meta:
        model = BudgetEnvelope
        fields = ['name', 'budget_plan', 'cost_center', 'category', 'is_active', 'year', 'min_amount', 'max_amount']


class BudgetMonthFilter(django_filters.FilterSet):
    """Filtros para Mês do Orçamento."""
    
    envelope = django_filters.UUIDFilter()
    budget_plan = django_filters.UUIDFilter(field_name='envelope__budget_plan')
    cost_center = django_filters.UUIDFilter(field_name='envelope__cost_center')
    month = django_filters.DateFilter()
    month_gte = django_filters.DateFilter(field_name='month', lookup_expr='gte')
    month_lte = django_filters.DateFilter(field_name='month', lookup_expr='lte')
    is_locked = django_filters.BooleanFilter()
    year = django_filters.NumberFilter(method='filter_year')
    
    class Meta:
        model = BudgetMonth
        fields = ['envelope', 'budget_plan', 'cost_center', 'month', 'month_gte', 'month_lte', 'is_locked', 'year']
    
    def filter_year(self, queryset, name, value):
        from datetime import date
        start = date(value, 1, 1)
        end = date(value, 12, 31)
        return queryset.filter(month__gte=start, month__lte=end)
