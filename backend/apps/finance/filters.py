"""
Finance Filters

Filtros para os ViewSets do módulo Finance.
"""

import django_filters
from .models import (
    CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth,
    CostTransaction, LedgerAdjustment, Commitment
)


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
        year = int(value)  # NumberFilter returns Decimal, convert to int
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        return queryset.filter(month__gte=start, month__lte=end)


# =============================================================================
# Ledger Filters (CostTransaction, LedgerAdjustment)
# =============================================================================

class CostTransactionFilter(django_filters.FilterSet):
    """
    Filtros para Transações de Custo (Ledger).
    
    Filtros principais:
    - Por período (start_date, end_date)
    - Por tipo e categoria
    - Por centro de custo, ativo, OS
    - Por status de lock
    """
    
    # Filtros de texto
    description = django_filters.CharFilter(lookup_expr='icontains')
    idempotency_key = django_filters.CharFilter(lookup_expr='icontains')
    
    # Filtros de classificação
    transaction_type = django_filters.ChoiceFilter(choices=CostTransaction.TransactionType.choices)
    category = django_filters.ChoiceFilter(choices=CostTransaction.Category.choices)
    
    # Filtros de relacionamento
    cost_center = django_filters.UUIDFilter(field_name='cost_center_id')
    asset = django_filters.UUIDFilter(field_name='asset_id')
    work_order = django_filters.UUIDFilter(field_name='work_order_id')
    vendor_id = django_filters.UUIDFilter()
    
    # Filtros de período (occurred_at)
    start_date = django_filters.DateFilter(field_name='occurred_at', lookup_expr='date__gte')
    end_date = django_filters.DateFilter(field_name='occurred_at', lookup_expr='date__lte')
    occurred_at_gte = django_filters.DateTimeFilter(field_name='occurred_at', lookup_expr='gte')
    occurred_at_lte = django_filters.DateTimeFilter(field_name='occurred_at', lookup_expr='lte')
    year = django_filters.NumberFilter(method='filter_year')
    month = django_filters.NumberFilter(method='filter_month')
    
    # Filtros de valor
    min_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    
    # Filtros de status
    is_locked = django_filters.BooleanFilter()
    
    # Filtros de criação
    created_at_gte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_lte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    created_by = django_filters.UUIDFilter(field_name='created_by_id')
    
    class Meta:
        model = CostTransaction
        fields = [
            'description', 'idempotency_key',
            'transaction_type', 'category',
            'cost_center', 'asset', 'work_order', 'vendor_id',
            'start_date', 'end_date', 'occurred_at_gte', 'occurred_at_lte',
            'year', 'month',
            'min_amount', 'max_amount',
            'is_locked',
            'created_at_gte', 'created_at_lte', 'created_by'
        ]
    
    def filter_year(self, queryset, name, value):
        """Filtra por ano da ocorrência."""
        return queryset.filter(occurred_at__year=value)
    
    def filter_month(self, queryset, name, value):
        """Filtra por mês da ocorrência."""
        return queryset.filter(occurred_at__month=value)


class LedgerAdjustmentFilter(django_filters.FilterSet):
    """
    Filtros para Ajustes de Ledger.
    """
    
    # Filtros de texto
    reason = django_filters.CharFilter(lookup_expr='icontains')
    
    # Filtros de classificação
    adjustment_type = django_filters.ChoiceFilter(choices=LedgerAdjustment.AdjustmentType.choices)
    
    # Filtros de relacionamento
    original_transaction = django_filters.UUIDFilter(field_name='original_transaction_id')
    
    # Filtros de valor
    min_amount = django_filters.NumberFilter(field_name='adjustment_amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='adjustment_amount', lookup_expr='lte')
    
    # Filtros de aprovação
    is_approved = django_filters.BooleanFilter()
    
    # Filtros de período
    created_at_gte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_lte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    created_by = django_filters.UUIDFilter(field_name='created_by_id')
    
    class Meta:
        model = LedgerAdjustment
        fields = [
            'reason', 'adjustment_type',
            'original_transaction',
            'min_amount', 'max_amount',
            'is_approved',
            'created_at_gte', 'created_at_lte', 'created_by'
        ]


# =============================================================================
# Commitment Filter
# =============================================================================

class CommitmentFilter(django_filters.FilterSet):
    """
    Filtros para Compromissos.
    
    Filtros principais:
    - Por status
    - Por período (budget_month)
    - Por centro de custo
    - Por categoria
    - Por OS vinculada
    """
    
    # Filtros de texto
    description = django_filters.CharFilter(lookup_expr='icontains')
    vendor_name = django_filters.CharFilter(lookup_expr='icontains')
    
    # Filtros de classificação
    status = django_filters.ChoiceFilter(choices=Commitment.Status.choices)
    status_in = django_filters.MultipleChoiceFilter(
        field_name='status',
        choices=Commitment.Status.choices,
    )
    category = django_filters.ChoiceFilter(choices=Commitment.Category.choices)
    
    # Filtros de relacionamento
    cost_center = django_filters.UUIDFilter(field_name='cost_center_id')
    work_order = django_filters.UUIDFilter(field_name='work_order_id')
    
    # Filtros de período (budget_month)
    budget_month = django_filters.DateFilter()
    budget_month_gte = django_filters.DateFilter(field_name='budget_month', lookup_expr='gte')
    budget_month_lte = django_filters.DateFilter(field_name='budget_month', lookup_expr='lte')
    year = django_filters.NumberFilter(method='filter_year')
    
    # Filtros de valor
    min_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    
    # Filtros de aprovação
    approved_by = django_filters.UUIDFilter(field_name='approved_by_id')
    approved_at_gte = django_filters.DateTimeFilter(field_name='approved_at', lookup_expr='gte')
    approved_at_lte = django_filters.DateTimeFilter(field_name='approved_at', lookup_expr='lte')
    
    # Filtros de criação
    created_at_gte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_lte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    created_by = django_filters.UUIDFilter(field_name='created_by_id')
    
    class Meta:
        model = Commitment
        fields = [
            'description', 'vendor_name',
            'status', 'status_in', 'category',
            'cost_center', 'work_order',
            'budget_month', 'budget_month_gte', 'budget_month_lte', 'year',
            'min_amount', 'max_amount',
            'approved_by', 'approved_at_gte', 'approved_at_lte',
            'created_at_gte', 'created_at_lte', 'created_by'
        ]
    
    def filter_year(self, queryset, name, value):
        """Filtra por ano do budget_month."""
        from datetime import date
        year = int(value)
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        return queryset.filter(budget_month__gte=start, budget_month__lte=end)


# =============================================================================
# SavingsEvent Filter
# =============================================================================

from .models import SavingsEvent


class SavingsEventFilter(django_filters.FilterSet):
    """
    Filtros para Eventos de Economia.
    
    Filtros principais:
    - Por tipo de evento (event_type)
    - Por período (occurred_at)
    - Por centro de custo
    - Por ativo ou OS vinculada
    - Por nível de confiança
    """
    
    # Filtros de texto
    description = django_filters.CharFilter(lookup_expr='icontains')
    calculation_method = django_filters.CharFilter(lookup_expr='icontains')
    
    # Filtros de classificação
    event_type = django_filters.ChoiceFilter(choices=SavingsEvent.EventType.choices)
    event_type_in = django_filters.MultipleChoiceFilter(
        field_name='event_type',
        choices=SavingsEvent.EventType.choices,
    )
    confidence = django_filters.ChoiceFilter(choices=SavingsEvent.Confidence.choices)
    
    # Filtros de relacionamento
    cost_center = django_filters.UUIDFilter(field_name='cost_center_id')
    asset = django_filters.UUIDFilter(field_name='asset_id')
    work_order = django_filters.UUIDFilter(field_name='work_order_id')
    alert = django_filters.UUIDFilter(field_name='alert_id')
    
    # Filtros de período (occurred_at)
    start_date = django_filters.DateFilter(field_name='occurred_at', lookup_expr='date__gte')
    end_date = django_filters.DateFilter(field_name='occurred_at', lookup_expr='date__lte')
    occurred_at_gte = django_filters.DateTimeFilter(field_name='occurred_at', lookup_expr='gte')
    occurred_at_lte = django_filters.DateTimeFilter(field_name='occurred_at', lookup_expr='lte')
    year = django_filters.NumberFilter(method='filter_year')
    month = django_filters.NumberFilter(method='filter_month')
    
    # Filtros de valor
    min_amount = django_filters.NumberFilter(field_name='savings_amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='savings_amount', lookup_expr='lte')
    
    # Filtros de criação
    created_at_gte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_lte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    created_by = django_filters.UUIDFilter(field_name='created_by_id')
    
    # Filtro para economias com evidência
    has_evidence = django_filters.BooleanFilter(method='filter_has_evidence')
    
    class Meta:
        model = SavingsEvent
        fields = [
            'description', 'calculation_method',
            'event_type', 'event_type_in', 'confidence',
            'cost_center', 'asset', 'work_order', 'alert',
            'start_date', 'end_date', 'occurred_at_gte', 'occurred_at_lte',
            'year', 'month',
            'min_amount', 'max_amount',
            'created_at_gte', 'created_at_lte', 'created_by',
            'has_evidence'
        ]
    
    def filter_year(self, queryset, name, value):
        """Filtra por ano da ocorrência."""
        return queryset.filter(occurred_at__year=int(value))
    
    def filter_month(self, queryset, name, value):
        """Filtra por mês da ocorrência."""
        return queryset.filter(occurred_at__month=int(value))
    
    def filter_has_evidence(self, queryset, name, value):
        """Filtra economias com/sem evidências."""
        from django.db.models import Q
        if value:
            # Has evidence: evidence is not empty dict/null
            return queryset.exclude(
                Q(evidence__isnull=True) | Q(evidence={})
            )
        else:
            # No evidence
            return queryset.filter(
                Q(evidence__isnull=True) | Q(evidence={})
            )