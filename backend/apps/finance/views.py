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
