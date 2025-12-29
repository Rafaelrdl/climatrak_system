"""
Finance Views

ViewSets para:
- CostCenter (CRUD + hierarquia)
- RateCard (CRUD + vigência)
- BudgetPlan, BudgetEnvelope, BudgetMonth (CRUD + operações)
- CostTransaction (Ledger)
- LedgerAdjustment
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q, Count
from django.utils import timezone
from decimal import Decimal

from .models import (
    CostCenter, RateCard, BudgetPlan, BudgetEnvelope, BudgetMonth,
    CostTransaction, LedgerAdjustment, Commitment
)
from .serializers import (
    CostCenterSerializer,
    CostCenterTreeSerializer,
    RateCardSerializer,
    BudgetPlanSerializer,
    BudgetPlanDetailSerializer,
    BudgetEnvelopeSerializer,
    BudgetEnvelopeWriteSerializer,
    BudgetMonthSerializer,
    CostTransactionSerializer,
    CostTransactionCreateSerializer,
    CostTransactionSummarySerializer,
    LedgerAdjustmentSerializer,
    LedgerAdjustmentCreateSerializer,
    CommitmentSerializer,
    CommitmentCreateSerializer,
    CommitmentApproveSerializer,
    CommitmentRejectSerializer,
)
from .filters import (
    CostCenterFilter,
    RateCardFilter,
    BudgetPlanFilter,
    BudgetEnvelopeFilter,
    BudgetMonthFilter,
    CostTransactionFilter,
    LedgerAdjustmentFilter,
    CommitmentFilter,
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


# =============================================================================
# Ledger ViewSets (CostTransaction, LedgerAdjustment)
# =============================================================================

class CostTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Transações de Custo (Ledger).
    
    Endpoints:
    - GET /api/finance/transactions/ - Listar transações
    - POST /api/finance/transactions/ - Criar transação manual
    - GET /api/finance/transactions/{id}/ - Detalhes
    - PUT/PATCH /api/finance/transactions/{id}/ - Atualizar (se não bloqueado)
    - DELETE /api/finance/transactions/{id}/ - Excluir (se não bloqueado)
    - POST /api/finance/transactions/{id}/lock/ - Bloquear transação
    - GET /api/finance/transactions/summary/ - Resumo por categoria/tipo
    - GET /api/finance/transactions/by-month/ - Totais por mês
    - GET /api/finance/transactions/by-cost-center/ - Totais por centro de custo
    """
    queryset = CostTransaction.objects.select_related(
        'cost_center', 'asset', 'work_order', 'created_by', 'locked_by'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CostTransactionFilter
    search_fields = ['description', 'idempotency_key']
    ordering_fields = ['occurred_at', 'amount', 'created_at', 'transaction_type', 'category']
    ordering = ['-occurred_at', '-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CostTransactionCreateSerializer
        return CostTransactionSerializer
    
    def perform_destroy(self, instance):
        """Impedir exclusão de transação bloqueada."""
        if instance.is_locked:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Transação bloqueada não pode ser excluída.')
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """Bloqueia a transação para edição."""
        transaction = self.get_object()
        if transaction.is_locked:
            return Response(
                {'error': 'Transação já está bloqueada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        transaction.lock(request.user)
        serializer = self.get_serializer(transaction)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Retorna resumo agregado das transações.
        
        Query params:
        - start_date: Data inicial (YYYY-MM-DD)
        - end_date: Data final (YYYY-MM-DD)
        - cost_center: UUID do centro de custo
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Agregação por categoria e tipo
        by_category = queryset.values('category').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('category')
        
        by_type = queryset.values('transaction_type').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('transaction_type')
        
        # Total geral
        totals = queryset.aggregate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        )
        
        return Response({
            'totals': {
                'total_amount': totals['total_amount'] or Decimal('0.00'),
                'transaction_count': totals['transaction_count'] or 0
            },
            'by_category': [
                {
                    'category': item['category'],
                    'category_display': dict(CostTransaction.Category.choices).get(item['category'], item['category']),
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'transaction_count': item['transaction_count']
                }
                for item in by_category
            ],
            'by_type': [
                {
                    'transaction_type': item['transaction_type'],
                    'type_display': dict(CostTransaction.TransactionType.choices).get(item['transaction_type'], item['transaction_type']),
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'transaction_count': item['transaction_count']
                }
                for item in by_type
            ]
        })
    
    @action(detail=False, methods=['get'])
    def by_month(self, request):
        """
        Retorna totais agregados por mês.
        
        Query params:
        - year: Ano (opcional, default: ano atual)
        - cost_center: UUID do centro de custo
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        year = request.query_params.get('year')
        if year:
            queryset = queryset.filter(occurred_at__year=int(year))
        
        # Agrupar por mês
        from django.db.models.functions import TruncMonth
        
        by_month = queryset.annotate(
            month=TruncMonth('occurred_at')
        ).values('month').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('month')
        
        return Response({
            'by_month': [
                {
                    'month': item['month'].strftime('%Y-%m') if item['month'] else None,
                    'month_name': item['month'].strftime('%B/%Y') if item['month'] else None,
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'transaction_count': item['transaction_count']
                }
                for item in by_month
            ]
        })
    
    @action(detail=False, methods=['get'])
    def by_cost_center(self, request):
        """
        Retorna totais agregados por centro de custo.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        by_cc = queryset.values(
            'cost_center__id', 'cost_center__code', 'cost_center__name'
        ).annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('cost_center__code')
        
        return Response({
            'by_cost_center': [
                {
                    'cost_center_id': str(item['cost_center__id']),
                    'cost_center_code': item['cost_center__code'],
                    'cost_center_name': item['cost_center__name'],
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'transaction_count': item['transaction_count']
                }
                for item in by_cc
            ]
        })
    
    @action(detail=False, methods=['post'])
    def bulk_lock(self, request):
        """
        Bloqueia múltiplas transações de um período.
        
        Body:
        - start_date: Data inicial (YYYY-MM-DD)
        - end_date: Data final (YYYY-MM-DD)
        - cost_center: UUID do centro de custo (opcional)
        """
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        cost_center = request.data.get('cost_center')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date e end_date são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            occurred_at__date__gte=start_date,
            occurred_at__date__lte=end_date,
            is_locked=False
        )
        
        if cost_center:
            queryset = queryset.filter(cost_center_id=cost_center)
        
        count = queryset.count()
        now = timezone.now()
        
        queryset.update(
            is_locked=True,
            locked_at=now,
            locked_by=request.user
        )
        
        return Response({
            'message': f'{count} transações bloqueadas',
            'locked_count': count
        })


class LedgerAdjustmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Ajustes de Ledger.
    
    Endpoints:
    - GET /api/finance/adjustments/ - Listar ajustes
    - POST /api/finance/adjustments/ - Criar ajuste
    - GET /api/finance/adjustments/{id}/ - Detalhes
    
    Nota: Ajustes não podem ser editados ou excluídos (auditoria).
    """
    queryset = LedgerAdjustment.objects.select_related(
        'original_transaction', 'adjustment_transaction', 
        'created_by', 'approved_by'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LedgerAdjustmentFilter
    search_fields = ['reason']
    ordering_fields = ['created_at', 'adjustment_amount', 'adjustment_type']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'head', 'options']  # Sem PUT/PATCH/DELETE
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LedgerAdjustmentCreateSerializer
        return LedgerAdjustmentSerializer
    
    def create(self, request, *args, **kwargs):
        """Cria um ajuste de ledger."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        adjustment = serializer.save()
        
        # Retornar com serializer de leitura
        read_serializer = LedgerAdjustmentSerializer(adjustment, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Retorna resumo dos ajustes."""
        queryset = self.filter_queryset(self.get_queryset())
        
        by_type = queryset.values('adjustment_type').annotate(
            total_amount=Sum('adjustment_amount'),
            adjustment_count=Count('id')
        ).order_by('adjustment_type')
        
        return Response({
            'by_type': [
                {
                    'adjustment_type': item['adjustment_type'],
                    'type_display': dict(LedgerAdjustment.AdjustmentType.choices).get(
                        item['adjustment_type'], item['adjustment_type']
                    ),
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'adjustment_count': item['adjustment_count']
                }
                for item in by_type
            ]
        })


# =============================================================================
# Commitment ViewSet
# =============================================================================

class CommitmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Compromissos de Orçamento.
    
    Endpoints:
    - GET /api/finance/commitments/ - Listar compromissos
    - POST /api/finance/commitments/ - Criar compromisso
    - GET /api/finance/commitments/{id}/ - Detalhes
    - PUT/PATCH /api/finance/commitments/{id}/ - Atualizar (apenas DRAFT)
    - DELETE /api/finance/commitments/{id}/ - Excluir (apenas DRAFT)
    - POST /api/finance/commitments/{id}/submit/ - Submeter para aprovação
    - POST /api/finance/commitments/{id}/approve/ - Aprovar
    - POST /api/finance/commitments/{id}/reject/ - Rejeitar
    - POST /api/finance/commitments/{id}/cancel/ - Cancelar
    - GET /api/finance/commitments/summary/ - Resumo por status/categoria
    - GET /api/finance/commitments/pending/ - Pendentes de aprovação
    """
    queryset = Commitment.objects.select_related(
        'cost_center', 'work_order', 'approved_by', 'created_by'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CommitmentFilter
    search_fields = ['description', 'vendor_name']
    ordering_fields = ['created_at', 'budget_month', 'amount', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CommitmentCreateSerializer
        if self.action == 'approve':
            return CommitmentApproveSerializer
        if self.action == 'reject':
            return CommitmentRejectSerializer
        return CommitmentSerializer
    
    def create(self, request, *args, **kwargs):
        """Cria commitment e retorna com serializer de leitura."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        commitment = serializer.save()
        
        # Retornar com serializer de leitura para incluir todos os campos
        read_serializer = CommitmentSerializer(commitment, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_update(self, serializer):
        """Permite atualização apenas de compromissos em DRAFT."""
        commitment = self.get_object()
        if commitment.status != Commitment.Status.DRAFT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Apenas compromissos em rascunho podem ser alterados.')
        serializer.save()
    
    def perform_destroy(self, instance):
        """Permite exclusão apenas de compromissos em DRAFT."""
        if instance.status != Commitment.Status.DRAFT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Apenas compromissos em rascunho podem ser excluídos.')
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submete o compromisso para aprovação."""
        commitment = self.get_object()
        
        try:
            commitment.submit()
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CommitmentSerializer(commitment, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Aprova o compromisso.
        
        Emite evento commitment.approved na outbox.
        """
        commitment = self.get_object()
        
        try:
            event = commitment.approve(user=request.user)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CommitmentSerializer(commitment, context={'request': request})
        return Response({
            **serializer.data,
            'event_id': str(event.id) if event else None
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeita o compromisso."""
        commitment = self.get_object()
        serializer = CommitmentRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            commitment.reject(
                user=request.user,
                reason=serializer.validated_data['reason']
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        response_serializer = CommitmentSerializer(commitment, context={'request': request})
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancela o compromisso."""
        commitment = self.get_object()
        
        try:
            commitment.cancel(user=request.user)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CommitmentSerializer(commitment, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Retorna compromissos pendentes de aprovação (SUBMITTED)."""
        queryset = self.filter_queryset(self.get_queryset()).filter(
            status=Commitment.Status.SUBMITTED
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CommitmentSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = CommitmentSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Retorna resumo de compromissos.
        
        Query params:
        - budget_month: Mês do orçamento (YYYY-MM-DD)
        - year: Ano
        - cost_center: UUID do centro de custo
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Agregação por status
        by_status = queryset.values('status').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('status')
        
        # Agregação por categoria
        by_category = queryset.values('category').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('category')
        
        # Totais gerais
        totals = queryset.aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id')
        )
        
        # Totais por status específico (para dashboard)
        approved_total = queryset.filter(
            status=Commitment.Status.APPROVED
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        pending_total = queryset.filter(
            status=Commitment.Status.SUBMITTED
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return Response({
            'totals': {
                'total_amount': totals['total_amount'] or Decimal('0.00'),
                'total_count': totals['total_count'] or 0,
                'approved_amount': approved_total,
                'pending_amount': pending_total,
            },
            'by_status': [
                {
                    'status': item['status'],
                    'status_display': dict(Commitment.Status.choices).get(
                        item['status'], item['status']
                    ),
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_status
            ],
            'by_category': [
                {
                    'category': item['category'],
                    'category_display': dict(Commitment.Category.choices).get(
                        item['category'], item['category']
                    ),
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_category
            ]
        })
    
    @action(detail=False, methods=['get'])
    def by_month(self, request):
        """
        Retorna totais de compromissos por mês.
        
        Query params:
        - year: Ano (opcional, default: ano atual)
        - status: Filtrar por status
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        by_month = queryset.values('budget_month').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('budget_month')
        
        return Response({
            'by_month': [
                {
                    'budget_month': item['budget_month'].isoformat() if item['budget_month'] else None,
                    'month_name': item['budget_month'].strftime('%B/%Y') if item['budget_month'] else None,
                    'total_amount': item['total_amount'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_month
            ]
        })


# =============================================================================
# SavingsEvent ViewSet
# =============================================================================

from .models import SavingsEvent
from .serializers import (
    SavingsEventSerializer,
    SavingsEventCreateSerializer,
    SavingsEventSummarySerializer,
    BudgetMonthlySummarySerializer,
)
from .filters import SavingsEventFilter


class SavingsEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Eventos de Economia.
    
    Endpoints:
    - GET /api/finance/savings-events/ - Listar eventos de economia
    - POST /api/finance/savings-events/ - Criar evento de economia
    - GET /api/finance/savings-events/{id}/ - Detalhes do evento
    - PUT/PATCH /api/finance/savings-events/{id}/ - Atualizar evento
    - DELETE /api/finance/savings-events/{id}/ - Excluir evento
    - GET /api/finance/savings-events/summary/ - Resumo agregado
    - GET /api/finance/savings-events/by_type/ - Por tipo de evento
    - GET /api/finance/savings-events/by_month/ - Por mês
    
    Ref: docs/finance/01-erd.md, docs/api/finance.yaml
    """
    queryset = SavingsEvent.objects.select_related(
        'cost_center', 'asset', 'work_order', 'alert', 'created_by'
    ).all()
    serializer_class = SavingsEventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SavingsEventFilter
    search_fields = ['description', 'calculation_method']
    ordering_fields = ['occurred_at', 'savings_amount', 'created_at', 'event_type']
    ordering = ['-occurred_at']
    
    def get_serializer_class(self):
        """Retorna serializer apropriado para a ação."""
        if self.action == 'create':
            return SavingsEventCreateSerializer
        return SavingsEventSerializer
    
    def create(self, request, *args, **kwargs):
        """Cria evento de economia e retorna dados completos."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Retornar serializer de leitura com dados completos
        response_serializer = SavingsEventSerializer(instance, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Retorna resumo agregado de economias.
        
        Query params:
        - start_date: Data inicial (YYYY-MM-DD)
        - end_date: Data final (YYYY-MM-DD)
        - cost_center: UUID do centro de custo
        - event_type: Tipo de evento
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Total geral
        totals = queryset.aggregate(
            total_savings=Sum('savings_amount'),
            count=Count('id')
        )
        
        # Por tipo de evento
        by_event_type = queryset.values('event_type').annotate(
            total=Sum('savings_amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Por nível de confiança
        by_confidence = queryset.values('confidence').annotate(
            total=Sum('savings_amount'),
            count=Count('id')
        ).order_by('confidence')
        
        # Datas do período filtrado
        dates = queryset.aggregate(
            start=db_models.Min('occurred_at'),
            end=db_models.Max('occurred_at')
        )
        
        return Response({
            'period_start': dates['start'].date().isoformat() if dates['start'] else None,
            'period_end': dates['end'].date().isoformat() if dates['end'] else None,
            'total_savings': totals['total_savings'] or Decimal('0.00'),
            'count': totals['count'] or 0,
            'by_event_type': [
                {
                    'event_type': item['event_type'],
                    'event_type_display': dict(SavingsEvent.EventType.choices).get(
                        item['event_type'], item['event_type']
                    ),
                    'total': item['total'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_event_type
            ],
            'by_confidence': [
                {
                    'confidence': item['confidence'],
                    'confidence_display': dict(SavingsEvent.Confidence.choices).get(
                        item['confidence'], item['confidence']
                    ),
                    'total': item['total'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_confidence
            ]
        })
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Retorna totais de economia por tipo."""
        queryset = self.filter_queryset(self.get_queryset())
        
        by_type = queryset.values('event_type').annotate(
            total_savings=Sum('savings_amount'),
            count=Count('id')
        ).order_by('-total_savings')
        
        return Response({
            'by_type': [
                {
                    'event_type': item['event_type'],
                    'event_type_display': dict(SavingsEvent.EventType.choices).get(
                        item['event_type'], item['event_type']
                    ),
                    'total_savings': item['total_savings'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_type
            ]
        })
    
    @action(detail=False, methods=['get'])
    def by_month(self, request):
        """
        Retorna totais de economia por mês.
        
        Query params:
        - year: Ano (opcional)
        """
        from django.db.models.functions import TruncMonth
        
        queryset = self.filter_queryset(self.get_queryset())
        
        by_month = queryset.annotate(
            month=TruncMonth('occurred_at')
        ).values('month').annotate(
            total_savings=Sum('savings_amount'),
            count=Count('id')
        ).order_by('month')
        
        return Response({
            'by_month': [
                {
                    'month': item['month'].isoformat() if item['month'] else None,
                    'month_name': item['month'].strftime('%B/%Y') if item['month'] else None,
                    'total_savings': item['total_savings'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_month
            ]
        })
    
    @action(detail=False, methods=['get'])
    def by_cost_center(self, request):
        """Retorna totais de economia por centro de custo."""
        queryset = self.filter_queryset(self.get_queryset())
        
        by_cc = queryset.values(
            'cost_center', 'cost_center__code', 'cost_center__name'
        ).annotate(
            total_savings=Sum('savings_amount'),
            count=Count('id')
        ).order_by('-total_savings')
        
        return Response({
            'by_cost_center': [
                {
                    'cost_center_id': str(item['cost_center']),
                    'cost_center_code': item['cost_center__code'],
                    'cost_center_name': item['cost_center__name'],
                    'total_savings': item['total_savings'] or Decimal('0.00'),
                    'count': item['count']
                }
                for item in by_cc
            ]
        })


# =============================================================================
# Budget Summary ViewSet (Relatório Mensal)
# =============================================================================

from django.db import models as db_models


class BudgetSummaryViewSet(viewsets.ViewSet):
    """
    ViewSet para Summary Mensal de Orçamento.
    
    Endpoints:
    - GET /api/finance/budget-summary/?month=2024-06-01 - Summary do mês
    - GET /api/finance/budget-summary/year/?year=2024 - Summary do ano
    
    Retorna:
    - planned: soma do BudgetMonth para o período
    - committed: soma de Commitments ativos (SUBMITTED + APPROVED)
    - actual: soma do Ledger (CostTransaction)
    - savings: soma de SavingsEvent
    - variance: planned - actual
    
    Ref: docs/finance/02-regras-negocio.md seção 8
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """
        Summary mensal.
        
        Query params:
        - month: Data do mês (YYYY-MM-DD ou YYYY-MM-01) - obrigatório
        - cost_center: UUID do centro de custo (opcional)
        """
        from datetime import date
        from dateutil.relativedelta import relativedelta
        
        month_str = request.query_params.get('month')
        cost_center_id = request.query_params.get('cost_center')
        
        if not month_str:
            return Response(
                {'error': 'Parâmetro month é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            month_date = date.fromisoformat(month_str)
            # Normalizar para primeiro dia do mês
            month_date = month_date.replace(day=1)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Período do mês
        month_start = month_date
        month_end = month_date + relativedelta(months=1, days=-1)
        
        # Filtros base
        cc_filter = Q()
        if cost_center_id:
            cc_filter = Q(cost_center_id=cost_center_id)
        
        # 1. Planned: BudgetMonth
        planned_qs = BudgetMonth.objects.filter(
            month=month_date
        )
        if cost_center_id:
            planned_qs = planned_qs.filter(envelope__cost_center_id=cost_center_id)
        
        planned = planned_qs.aggregate(
            total=Sum('planned_amount')
        )['total'] or Decimal('0.00')
        
        # 2. Committed: Commitments ativos (SUBMITTED + APPROVED)
        committed_statuses = [
            Commitment.Status.SUBMITTED,
            Commitment.Status.APPROVED
        ]
        committed_qs = Commitment.objects.filter(
            budget_month=month_date,
            status__in=committed_statuses
        )
        if cost_center_id:
            committed_qs = committed_qs.filter(cost_center_id=cost_center_id)
        
        committed = committed_qs.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # 3. Actual: CostTransaction do período
        actual_qs = CostTransaction.objects.filter(
            occurred_at__date__gte=month_start,
            occurred_at__date__lte=month_end
        )
        if cost_center_id:
            actual_qs = actual_qs.filter(cost_center_id=cost_center_id)
        
        actual = actual_qs.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # 4. Savings: SavingsEvent do período
        savings_qs = SavingsEvent.objects.filter(
            occurred_at__date__gte=month_start,
            occurred_at__date__lte=month_end
        )
        if cost_center_id:
            savings_qs = savings_qs.filter(cost_center_id=cost_center_id)
        
        savings = savings_qs.aggregate(
            total=Sum('savings_amount')
        )['total'] or Decimal('0.00')
        
        # Variância
        variance = planned - actual
        variance_percent = Decimal('0.00')
        if planned > 0:
            variance_percent = (variance / planned * 100).quantize(Decimal('0.01'))
        
        # Breakdown por categoria
        by_category = self._get_category_breakdown(
            month_date, month_start, month_end, cost_center_id
        )
        
        # Cost center info
        cost_center_name = None
        if cost_center_id:
            try:
                cc = CostCenter.objects.get(id=cost_center_id)
                cost_center_name = cc.name
            except CostCenter.DoesNotExist:
                pass
        
        return Response({
            'month': month_date.isoformat(),
            'cost_center_id': cost_center_id,
            'cost_center_name': cost_center_name,
            'planned': planned,
            'committed': committed,
            'actual': actual,
            'savings': savings,
            'variance': variance,
            'variance_percent': variance_percent,
            'by_category': by_category
        })
    
    def _get_category_breakdown(self, month_date, month_start, month_end, cost_center_id):
        """Retorna breakdown por categoria."""
        categories = dict(CostTransaction.Category.choices)
        result = []
        
        for cat_key, cat_display in categories.items():
            # Planned por categoria (via BudgetEnvelope.category)
            planned_qs = BudgetMonth.objects.filter(
                month=month_date,
                envelope__category=cat_key
            )
            if cost_center_id:
                planned_qs = planned_qs.filter(envelope__cost_center_id=cost_center_id)
            cat_planned = planned_qs.aggregate(
                total=Sum('planned_amount')
            )['total'] or Decimal('0.00')
            
            # Committed por categoria
            committed_statuses = [
                Commitment.Status.SUBMITTED,
                Commitment.Status.APPROVED
            ]
            committed_qs = Commitment.objects.filter(
                budget_month=month_date,
                category=cat_key,
                status__in=committed_statuses
            )
            if cost_center_id:
                committed_qs = committed_qs.filter(cost_center_id=cost_center_id)
            cat_committed = committed_qs.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Actual por categoria
            actual_qs = CostTransaction.objects.filter(
                occurred_at__date__gte=month_start,
                occurred_at__date__lte=month_end,
                category=cat_key
            )
            if cost_center_id:
                actual_qs = actual_qs.filter(cost_center_id=cost_center_id)
            cat_actual = actual_qs.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Savings por categoria (usando event_type mapeado para category)
            # Por simplicidade, agrupamos all savings sem categorizar
            # Em produção, poderia haver um mapeamento event_type -> category
            cat_savings = Decimal('0.00')
            
            # Só adiciona se tiver algum valor
            if any([cat_planned, cat_committed, cat_actual]):
                result.append({
                    'category': cat_key,
                    'category_display': cat_display,
                    'planned': cat_planned,
                    'committed': cat_committed,
                    'actual': cat_actual,
                    'savings': cat_savings
                })
        
        return result
    
    @action(detail=False, methods=['get'])
    def year(self, request):
        """
        Summary anual.
        
        Query params:
        - year: Ano (YYYY) - obrigatório
        - cost_center: UUID do centro de custo (opcional)
        """
        from datetime import date
        
        year_str = request.query_params.get('year')
        cost_center_id = request.query_params.get('cost_center')
        
        if not year_str:
            return Response(
                {'error': 'Parâmetro year é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            year = int(year_str)
        except ValueError:
            return Response(
                {'error': 'Formato de ano inválido. Use YYYY'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        
        # Filtros base
        cc_filter = Q()
        if cost_center_id:
            cc_filter = Q(cost_center_id=cost_center_id)
        
        # Planned
        planned_qs = BudgetMonth.objects.filter(
            month__gte=year_start,
            month__lte=year_end
        )
        if cost_center_id:
            planned_qs = planned_qs.filter(envelope__cost_center_id=cost_center_id)
        planned = planned_qs.aggregate(
            total=Sum('planned_amount')
        )['total'] or Decimal('0.00')
        
        # Committed
        committed_statuses = [
            Commitment.Status.SUBMITTED,
            Commitment.Status.APPROVED
        ]
        committed_qs = Commitment.objects.filter(
            budget_month__gte=year_start,
            budget_month__lte=year_end,
            status__in=committed_statuses
        )
        if cost_center_id:
            committed_qs = committed_qs.filter(cost_center_id=cost_center_id)
        committed = committed_qs.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Actual
        actual_qs = CostTransaction.objects.filter(
            occurred_at__date__gte=year_start,
            occurred_at__date__lte=year_end
        )
        if cost_center_id:
            actual_qs = actual_qs.filter(cost_center_id=cost_center_id)
        actual = actual_qs.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Savings
        savings_qs = SavingsEvent.objects.filter(
            occurred_at__date__gte=year_start,
            occurred_at__date__lte=year_end
        )
        if cost_center_id:
            savings_qs = savings_qs.filter(cost_center_id=cost_center_id)
        savings = savings_qs.aggregate(
            total=Sum('savings_amount')
        )['total'] or Decimal('0.00')
        
        # Variância
        variance = planned - actual
        variance_percent = Decimal('0.00')
        if planned > 0:
            variance_percent = (variance / planned * 100).quantize(Decimal('0.01'))
        
        # By month
        by_month = self._get_monthly_breakdown(year, cost_center_id)
        
        return Response({
            'year': year,
            'cost_center_id': cost_center_id,
            'planned': planned,
            'committed': committed,
            'actual': actual,
            'savings': savings,
            'variance': variance,
            'variance_percent': variance_percent,
            'by_month': by_month
        })
    
    def _get_monthly_breakdown(self, year, cost_center_id):
        """Retorna breakdown por mês do ano."""
        from datetime import date
        from dateutil.relativedelta import relativedelta
        
        result = []
        
        for month_num in range(1, 13):
            month_date = date(year, month_num, 1)
            month_end = month_date + relativedelta(months=1, days=-1)
            
            # Planned
            planned_qs = BudgetMonth.objects.filter(month=month_date)
            if cost_center_id:
                planned_qs = planned_qs.filter(envelope__cost_center_id=cost_center_id)
            planned = planned_qs.aggregate(
                total=Sum('planned_amount')
            )['total'] or Decimal('0.00')
            
            # Committed
            committed_statuses = [
                Commitment.Status.SUBMITTED,
                Commitment.Status.APPROVED
            ]
            committed_qs = Commitment.objects.filter(
                budget_month=month_date,
                status__in=committed_statuses
            )
            if cost_center_id:
                committed_qs = committed_qs.filter(cost_center_id=cost_center_id)
            committed = committed_qs.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Actual
            actual_qs = CostTransaction.objects.filter(
                occurred_at__date__gte=month_date,
                occurred_at__date__lte=month_end
            )
            if cost_center_id:
                actual_qs = actual_qs.filter(cost_center_id=cost_center_id)
            actual = actual_qs.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Savings
            savings_qs = SavingsEvent.objects.filter(
                occurred_at__date__gte=month_date,
                occurred_at__date__lte=month_end
            )
            if cost_center_id:
                savings_qs = savings_qs.filter(cost_center_id=cost_center_id)
            savings = savings_qs.aggregate(
                total=Sum('savings_amount')
            )['total'] or Decimal('0.00')
            
            result.append({
                'month': month_date.isoformat(),
                'month_name': month_date.strftime('%B'),
                'planned': planned,
                'committed': committed,
                'actual': actual,
                'savings': savings,
                'variance': planned - actual
            })
        
        return result


# ============================================================================
# V2 (M4/M5) - Energy, Baseline, Risk ViewSets
# ============================================================================

from .models import EnergyTariff, EnergyReading, Baseline, RiskSnapshot
from .serializers import (
    EnergyTariffSerializer,
    EnergyTariffListSerializer,
    EnergyReadingSerializer,
    EnergyReadingCreateSerializer,
    BaselineSerializer,
    BaselineCreateSerializer,
    BaselineTransitionSerializer,
    RiskSnapshotSerializer,
    RiskSnapshotCreateSerializer,
    BARSummarySerializer,
    BARCostCenterSerializer,
    BARForecastSerializer,
)
from .filters import (
    EnergyTariffFilter,
    EnergyReadingFilter,
    BaselineFilter,
    RiskSnapshotFilter,
)


class EnergyTariffViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Tarifas de Energia.
    
    Endpoints:
    - GET /api/finance/energy-tariffs/ - Listar
    - POST /api/finance/energy-tariffs/ - Criar
    - GET /api/finance/energy-tariffs/{id}/ - Detalhes
    - PUT/PATCH /api/finance/energy-tariffs/{id}/ - Atualizar
    - DELETE /api/finance/energy-tariffs/{id}/ - Excluir
    - GET /api/finance/energy-tariffs/current/ - Tarifas vigentes
    - GET /api/finance/energy-tariffs/by-distributor/?distributor=CEMIG - Por distribuidora
    """
    queryset = EnergyTariff.objects.all()
    serializer_class = EnergyTariffSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EnergyTariffFilter
    search_fields = ['name', 'distributor', 'tariff_class', 'description']
    ordering_fields = ['distributor', 'effective_from', 'rate_off_peak', 'created_at']
    ordering = ['-effective_from']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EnergyTariffListSerializer
        return EnergyTariffSerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Retorna apenas tarifas vigentes hoje."""
        today = timezone.now().date()
        tariffs = self.queryset.filter(
            is_active=True,
            effective_from__lte=today
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=today)
        )
        serializer = self.get_serializer(tariffs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_distributor(self, request):
        """Retorna tarifas filtradas por distribuidora."""
        distributor = request.query_params.get('distributor')
        if not distributor:
            return Response(
                {'error': 'Parâmetro distributor é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tariffs = self.queryset.filter(distributor__icontains=distributor)
        serializer = self.get_serializer(tariffs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def calculate_rate(self, request, pk=None):
        """Calcula taxa efetiva para um horário e bandeira."""
        tariff = self.get_object()
        
        from datetime import time as time_type
        hour = int(request.query_params.get('hour', 12))
        minute = int(request.query_params.get('minute', 0))
        bandeira = request.query_params.get('bandeira', 'verde')
        
        rate_time = time_type(hour, minute)
        effective_rate = tariff.get_rate_for_time(rate_time, bandeira)
        
        return Response({
            'tariff_id': str(tariff.id),
            'tariff_name': tariff.name,
            'time': f'{hour:02d}:{minute:02d}',
            'bandeira': bandeira,
            'is_peak': tariff.peak_start <= rate_time <= tariff.peak_end if tariff.peak_start <= tariff.peak_end else rate_time >= tariff.peak_start or rate_time <= tariff.peak_end,
            'effective_rate': float(effective_rate),
        })


class EnergyReadingViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Leituras de Energia.
    
    Endpoints:
    - GET /api/finance/energy-readings/ - Listar
    - POST /api/finance/energy-readings/ - Criar (com cálculo automático)
    - GET /api/finance/energy-readings/{id}/ - Detalhes
    - PUT/PATCH /api/finance/energy-readings/{id}/ - Atualizar
    - DELETE /api/finance/energy-readings/{id}/ - Excluir
    - POST /api/finance/energy-readings/{id}/process/ - Processar custo
    - GET /api/finance/energy-readings/summary/ - Resumo
    """
    queryset = EnergyReading.objects.select_related(
        'asset', 'cost_center', 'tariff', 'cost_transaction'
    )
    serializer_class = EnergyReadingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EnergyReadingFilter
    search_fields = ['notes']
    ordering_fields = ['reading_date', 'kwh_total', 'calculated_cost', 'created_at']
    ordering = ['-reading_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EnergyReadingCreateSerializer
        return EnergyReadingSerializer
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Processa uma leitura e cria transação no ledger."""
        reading = self.get_object()
        
        if reading.cost_transaction:
            return Response(
                {'error': 'Leitura já processada', 'transaction_id': str(reading.cost_transaction_id)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .energy_engine import EnergyCostEngine
        from django.db import connection
        
        tenant = connection.tenant
        result = EnergyCostEngine.process_reading(
            reading,
            tenant_id=str(tenant.id) if tenant else None,
            user=request.user,
        )
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo de consumo de energia."""
        from django.db.models import Sum, Avg, Count
        from datetime import date
        
        # Filtros
        cost_center_id = request.query_params.get('cost_center_id')
        asset_id = request.query_params.get('asset_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        qs = self.queryset
        
        if cost_center_id:
            qs = qs.filter(cost_center_id=cost_center_id)
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        if start_date:
            qs = qs.filter(reading_date__gte=start_date)
        if end_date:
            qs = qs.filter(reading_date__lte=end_date)
        
        aggregation = qs.aggregate(
            total_kwh=Sum('kwh_total'),
            total_cost=Sum('calculated_cost'),
            avg_daily_kwh=Avg('kwh_total'),
            readings_count=Count('id'),
        )
        
        return Response({
            'total_kwh': float(aggregation['total_kwh'] or 0),
            'total_cost': float(aggregation['total_cost'] or 0),
            'avg_daily_kwh': float(aggregation['avg_daily_kwh'] or 0),
            'readings_count': aggregation['readings_count'] or 0,
        })


class BaselineViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Baselines de Savings Automático.
    
    Endpoints:
    - GET /api/finance/baselines/ - Listar
    - POST /api/finance/baselines/ - Criar
    - GET /api/finance/baselines/{id}/ - Detalhes
    - PUT/PATCH /api/finance/baselines/{id}/ - Atualizar
    - DELETE /api/finance/baselines/{id}/ - Excluir
    - POST /api/finance/baselines/{id}/transition/ - Transição de status
    - POST /api/finance/baselines/{id}/collect/ - Coletar dados
    - POST /api/finance/baselines/{id}/calculate/ - Calcular economia
    """
    queryset = Baseline.objects.select_related(
        'asset', 'cost_center', 'work_order', 'savings_event'
    )
    serializer_class = BaselineSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BaselineFilter
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'status', 'savings_percent']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BaselineCreateSerializer
        return BaselineSerializer
    
    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        """Executa transição de status no baseline."""
        baseline = self.get_object()
        serializer = BaselineTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_name = serializer.validated_data['action']
        
        from .auto_savings_engine import AutoSavingsEngine
        from django.db import connection
        
        tenant = connection.tenant
        
        if action_name == 'start_intervention':
            intervention_date = serializer.validated_data.get('intervention_date')
            AutoSavingsEngine.start_intervention(baseline, intervention_date)
            return Response({'status': 'intervention_started'})
        
        elif action_name == 'start_after':
            start_date = serializer.validated_data.get('after_start_date')
            AutoSavingsEngine.start_after_collection(baseline, start_date)
            return Response({'status': 'after_collection_started'})
        
        elif action_name == 'calculate':
            result = AutoSavingsEngine.calculate_savings(
                baseline,
                tenant_id=str(tenant.id) if tenant else None,
                user=request.user,
            )
            return Response(result)
        
        elif action_name == 'cancel':
            baseline.status = Baseline.Status.CANCELLED
            baseline.save(update_fields=['status', 'updated_at'])
            return Response({'status': 'cancelled'})
        
        return Response({'error': 'Ação desconhecida'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def collect(self, request, pk=None):
        """Coleta dados para o baseline."""
        baseline = self.get_object()
        
        from .auto_savings_engine import AutoSavingsEngine
        from datetime import date
        
        end_date = request.data.get('end_date')
        if end_date:
            end_date = date.fromisoformat(end_date)
        
        if baseline.status == Baseline.Status.COLLECTING_BEFORE:
            result = AutoSavingsEngine.collect_before_data(baseline, end_date)
        elif baseline.status == Baseline.Status.COLLECTING_AFTER:
            result = AutoSavingsEngine.collect_after_data(baseline, end_date)
        else:
            return Response(
                {'error': f'Status {baseline.status} não permite coleta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(result)
    
    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Calcula economia do baseline."""
        baseline = self.get_object()
        
        from .auto_savings_engine import AutoSavingsEngine
        from django.db import connection
        
        tenant = connection.tenant
        result = AutoSavingsEngine.calculate_savings(
            baseline,
            tenant_id=str(tenant.id) if tenant else None,
            user=request.user,
        )
        
        return Response(result)


class RiskSnapshotViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Snapshots de Risco.
    
    Endpoints:
    - GET /api/finance/risk-snapshots/ - Listar
    - POST /api/finance/risk-snapshots/ - Criar
    - GET /api/finance/risk-snapshots/{id}/ - Detalhes
    - PUT/PATCH /api/finance/risk-snapshots/{id}/ - Atualizar
    - DELETE /api/finance/risk-snapshots/{id}/ - Excluir
    - GET /api/finance/risk-snapshots/by-level/?level=critical - Por nível
    """
    queryset = RiskSnapshot.objects.select_related('asset', 'cost_center')
    serializer_class = RiskSnapshotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RiskSnapshotFilter
    search_fields = ['notes', 'data_source']
    ordering_fields = ['snapshot_date', 'risk_score', 'failure_probability', 'created_at']
    ordering = ['-snapshot_date', '-risk_score']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RiskSnapshotCreateSerializer
        return RiskSnapshotSerializer
    
    def create(self, request, *args, **kwargs):
        """Cria snapshot e retorna com campos derivados."""
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        instance = create_serializer.save()
        
        # Retornar com serializer completo (incluindo campos derivados)
        response_serializer = RiskSnapshotSerializer(instance)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def by_level(self, request):
        """Lista snapshots por nível de risco."""
        level = request.query_params.get('level')
        if not level:
            return Response(
                {'error': 'Parâmetro level é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .bar_calculator import BARCalculator
        
        cost_center_id = request.query_params.get('cost_center_id')
        cost_center = None
        if cost_center_id:
            cost_center = CostCenter.objects.filter(id=cost_center_id).first()
        
        assets = BARCalculator.get_assets_by_risk_level(level, cost_center)
        return Response(assets)


class BARViewSet(viewsets.ViewSet):
    """
    ViewSet para Budget-at-Risk (BAR).
    
    Endpoints:
    - GET /api/finance/bar/summary/ - Resumo geral
    - GET /api/finance/bar/cost-center/{id}/ - BAR por centro de custo
    - GET /api/finance/bar/forecast/ - Projeção
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Retorna resumo consolidado de BAR."""
        from .bar_calculator import BARCalculator
        from datetime import date
        
        snapshot_date_str = request.query_params.get('snapshot_date')
        snapshot_date = date.fromisoformat(snapshot_date_str) if snapshot_date_str else None
        top_n = int(request.query_params.get('top_n', 10))
        
        result = BARCalculator.calculate_bar_summary(snapshot_date, top_n)
        serializer = BARSummarySerializer(result)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='cost-center/(?P<cost_center_id>[^/.]+)')
    def cost_center(self, request, cost_center_id=None):
        """Retorna BAR para um centro de custo específico."""
        from .bar_calculator import BARCalculator
        from datetime import date
        
        cost_center = CostCenter.objects.filter(id=cost_center_id).first()
        if not cost_center:
            return Response(
                {'error': 'Centro de custo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        snapshot_date_str = request.query_params.get('snapshot_date')
        snapshot_date = date.fromisoformat(snapshot_date_str) if snapshot_date_str else None
        include_children = request.query_params.get('include_children', 'true').lower() == 'true'
        
        result = BARCalculator.calculate_bar_for_cost_center(
            cost_center, snapshot_date, include_children
        )
        serializer = BARCostCenterSerializer(result)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def forecast(self, request):
        """Retorna projeção de BAR."""
        from .bar_calculator import BARCalculator
        
        cost_center_id = request.query_params.get('cost_center_id')
        cost_center = None
        if cost_center_id:
            cost_center = CostCenter.objects.filter(id=cost_center_id).first()
        
        months_ahead = int(request.query_params.get('months', 3))
        
        result = BARCalculator.forecast_bar(cost_center, months_ahead)
        serializer = BARForecastSerializer(result)
        return Response(serializer.data)