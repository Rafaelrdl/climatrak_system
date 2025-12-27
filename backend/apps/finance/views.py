"""
Finance Views

ViewSets para:
- CostCenter (CRUD + hierarquia)
- RateCard (CRUD + vigência)
- BudgetPlan, BudgetEnvelope, BudgetMonth (CRUD + operações)
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q
from django.utils import timezone

from .models import CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth
from .serializers import (
    CostCenterSerializer,
    CostCenterTreeSerializer,
    RateCardSerializer,
    BudgetPlanSerializer,
    BudgetPlanDetailSerializer,
    BudgetEnvelopeSerializer,
    BudgetEnvelopeWriteSerializer,
    BudgetMonthSerializer,
)
from .filters import (
    CostCenterFilter,
    RateCardFilter,
    BudgetPlanFilter,
    BudgetEnvelopeFilter,
    BudgetMonthFilter,
)


class CostCenterViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Centros de Custo.
    
    Endpoints:
    - GET /api/finance/cost-centers/ - Listar
    - POST /api/finance/cost-centers/ - Criar
    - GET /api/finance/cost-centers/{id}/ - Detalhes
    - PUT/PATCH /api/finance/cost-centers/{id}/ - Atualizar
    - DELETE /api/finance/cost-centers/{id}/ - Excluir
    - GET /api/finance/cost-centers/tree/ - Árvore hierárquica
    - GET /api/finance/cost-centers/roots/ - Apenas raízes
    """
    queryset = CostCenter.objects.all()
    serializer_class = CostCenterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CostCenterFilter
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'name', 'created_at']
    ordering = ['code']
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Retorna árvore hierárquica de centros de custo."""
        roots = self.queryset.filter(parent__isnull=True, is_active=True)
        serializer = CostCenterTreeSerializer(roots, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def roots(self, request):
        """Retorna apenas centros de custo raiz."""
        roots = self.queryset.filter(parent__isnull=True)
        serializer = self.get_serializer(roots, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """Retorna filhos diretos de um centro de custo."""
        cost_center = self.get_object()
        children = cost_center.children.all()
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)


class RateCardViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Tabelas de Custo (RateCard).
    
    Endpoints:
    - GET /api/finance/rate-cards/ - Listar
    - POST /api/finance/rate-cards/ - Criar
    - GET /api/finance/rate-cards/{id}/ - Detalhes
    - PUT/PATCH /api/finance/rate-cards/{id}/ - Atualizar
    - DELETE /api/finance/rate-cards/{id}/ - Excluir
    - GET /api/finance/rate-cards/current/ - Apenas vigentes
    - GET /api/finance/rate-cards/for-role/?role=X - Para uma função
    """
    queryset = RateCard.objects.all()
    serializer_class = RateCardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RateCardFilter
    search_fields = ['role', 'role_code', 'description']
    ordering_fields = ['role', 'cost_per_hour', 'effective_from']
    ordering = ['role', '-effective_from']
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Retorna apenas rate cards vigentes."""
        today = timezone.now().date()
        current = self.queryset.filter(
            is_active=True,
            effective_from__lte=today
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=today)
        )
        serializer = self.get_serializer(current, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def for_role(self, request):
        """Retorna rate card vigente para uma função específica."""
        role = request.query_params.get('role')
        if not role:
            return Response(
                {'error': 'Parâmetro role é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rate_card = RateCard.get_rate_for_role(role, timezone.now().date())
        if rate_card:
            serializer = self.get_serializer(rate_card)
            return Response(serializer.data)
        return Response(
            {'error': f'Rate card não encontrado para função: {role}'},
            status=status.HTTP_404_NOT_FOUND
        )


class BudgetPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Planos Orçamentários.
    
    Endpoints:
    - GET /api/finance/budget-plans/ - Listar
    - POST /api/finance/budget-plans/ - Criar
    - GET /api/finance/budget-plans/{id}/ - Detalhes (com envelopes)
    - PUT/PATCH /api/finance/budget-plans/{id}/ - Atualizar
    - DELETE /api/finance/budget-plans/{id}/ - Excluir
    - POST /api/finance/budget-plans/{id}/activate/ - Ativar
    - POST /api/finance/budget-plans/{id}/close/ - Fechar
    """
    queryset = BudgetPlan.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BudgetPlanFilter
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['year', 'name', 'created_at', 'total_planned']
    ordering = ['-year', 'name']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BudgetPlanDetailSerializer
        return BudgetPlanSerializer
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Ativa um plano orçamentário."""
        plan = self.get_object()
        if plan.status != BudgetPlan.Status.DRAFT:
            return Response(
                {'error': 'Apenas planos em rascunho podem ser ativados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        plan.status = BudgetPlan.Status.ACTIVE
        plan.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(plan)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Fecha um plano orçamentário."""
        plan = self.get_object()
        if plan.status != BudgetPlan.Status.ACTIVE:
            return Response(
                {'error': 'Apenas planos ativos podem ser fechados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        plan.status = BudgetPlan.Status.CLOSED
        plan.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(plan)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Retorna resumo do plano com totais por categoria."""
        plan = self.get_object()
        
        by_category = plan.envelopes.values('category').annotate(
            total=Sum('amount')
        ).order_by('category')
        
        by_cost_center = plan.envelopes.values(
            'cost_center__code', 'cost_center__name'
        ).annotate(
            total=Sum('amount')
        ).order_by('cost_center__code')
        
        return Response({
            'plan_id': str(plan.id),
            'plan_name': plan.name,
            'year': plan.year,
            'total_planned': plan.total_planned,
            'by_category': list(by_category),
            'by_cost_center': list(by_cost_center),
        })


class BudgetEnvelopeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Envelopes de Orçamento.
    
    Endpoints:
    - GET /api/finance/budget-envelopes/ - Listar
    - POST /api/finance/budget-envelopes/ - Criar (com meses)
    - GET /api/finance/budget-envelopes/{id}/ - Detalhes
    - PUT/PATCH /api/finance/budget-envelopes/{id}/ - Atualizar
    - DELETE /api/finance/budget-envelopes/{id}/ - Excluir
    """
    queryset = BudgetEnvelope.objects.select_related('budget_plan', 'cost_center')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BudgetEnvelopeFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'category', 'amount', 'created_at']
    ordering = ['budget_plan', 'category', 'name']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BudgetEnvelopeWriteSerializer
        return BudgetEnvelopeSerializer


class BudgetMonthViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Meses do Orçamento.
    
    Endpoints:
    - GET /api/finance/budget-months/ - Listar
    - POST /api/finance/budget-months/ - Criar
    - GET /api/finance/budget-months/{id}/ - Detalhes
    - PUT/PATCH /api/finance/budget-months/{id}/ - Atualizar
    - DELETE /api/finance/budget-months/{id}/ - Excluir
    - POST /api/finance/budget-months/{id}/lock/ - Bloquear
    - POST /api/finance/budget-months/{id}/unlock/ - Desbloquear
    """
    queryset = BudgetMonth.objects.select_related('envelope', 'locked_by')
    serializer_class = BudgetMonthSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = BudgetMonthFilter
    ordering_fields = ['month', 'planned_amount']
    ordering = ['month']
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """Bloqueia o mês para edição."""
        month = self.get_object()
        if month.is_locked:
            return Response(
                {'error': 'Mês já está bloqueado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        month.lock(request.user)
        serializer = self.get_serializer(month)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        """Desbloqueia o mês (requer permissão)."""
        month = self.get_object()
        if not month.is_locked:
            return Response(
                {'error': 'Mês não está bloqueado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # TODO: Verificar permissão especial para desbloquear
        month.unlock(request.user)
        serializer = self.get_serializer(month)
        return Response(serializer.data)
