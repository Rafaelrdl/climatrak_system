"""
Views para Inventory
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from decimal import Decimal

from .models import (
    InventoryCategory, InventoryItem, InventoryMovement,
    InventoryCount, InventoryCountItem
)
from .serializers import (
    InventoryCategorySerializer, InventoryCategoryListSerializer,
    InventoryCategoryTreeSerializer,
    InventoryItemSerializer, InventoryItemListSerializer,
    InventoryMovementSerializer, InventoryMovementCreateSerializer,
    InventoryCountSerializer, InventoryCountListSerializer,
    InventoryCountItemSerializer, InventoryStatsSerializer
)


class InventoryCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para Categorias de Estoque."""
    
    queryset = InventoryCategory.objects.prefetch_related('children', 'items')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'is_active': ['exact'],
        'parent': ['exact', 'isnull'],
    }
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return InventoryCategoryListSerializer
        if self.action == 'tree':
            return InventoryCategoryTreeSerializer
        return InventoryCategorySerializer

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Retorna árvore hierárquica de categorias."""
        # Apenas categorias raiz (sem parent)
        root_categories = self.queryset.filter(parent__isnull=True, is_active=True)
        serializer = InventoryCategoryTreeSerializer(root_categories, many=True)
        return Response(serializer.data)


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet para Itens de Estoque."""
    
    queryset = InventoryItem.objects.select_related('category')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'is_active': ['exact'],
        'is_critical': ['exact'],
        'category': ['exact'],
        'supplier': ['exact', 'icontains'],
        'location': ['exact', 'icontains'],
    }
    search_fields = ['code', 'name', 'description', 'barcode', 'supplier']
    ordering_fields = ['code', 'name', 'quantity', 'unit_cost', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return InventoryItemListSerializer
        return InventoryItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros especiais
        stock_status = self.request.query_params.get('stock_status')
        if stock_status:
            if stock_status == 'LOW':
                queryset = queryset.filter(quantity__lt=F('min_quantity'))
            elif stock_status == 'OUT_OF_STOCK':
                queryset = queryset.filter(quantity__lte=0)
            elif stock_status == 'OK':
                queryset = queryset.filter(quantity__gte=F('min_quantity'))
        
        return queryset

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Lista itens com estoque baixo."""
        items = self.queryset.filter(
            is_active=True,
            quantity__lt=F('min_quantity')
        ).order_by('quantity')
        
        serializer = InventoryItemListSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def critical(self, request):
        """Lista itens críticos."""
        items = self.queryset.filter(is_active=True, is_critical=True)
        serializer = InventoryItemListSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retorna estatísticas do estoque."""
        queryset = self.queryset.filter(is_active=True)
        
        # Calcular estatísticas
        total_items = queryset.count()
        active_items = queryset.filter(quantity__gt=0).count()
        
        # Valor total
        total_value = queryset.aggregate(
            total=Sum(F('quantity') * F('unit_cost'))
        )['total'] or Decimal('0')
        
        # Contagens
        low_stock_count = queryset.filter(
            quantity__lt=F('min_quantity'),
            quantity__gt=0
        ).count()
        
        out_of_stock_count = queryset.filter(quantity__lte=0).count()
        critical_items_count = queryset.filter(is_critical=True).count()
        categories_count = InventoryCategory.objects.filter(is_active=True).count()
        
        # Movimentações recentes (últimos 30 dias)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        recent_movements = InventoryMovement.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        stats = {
            'total_items': total_items,
            'active_items': active_items,
            'total_value': total_value,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'critical_items_count': critical_items_count,
            'categories_count': categories_count,
            'recent_movements': recent_movements,
        }
        
        serializer = InventoryStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def movements(self, request, pk=None):
        """Lista movimentações do item."""
        item = self.get_object()
        movements = item.movements.all()[:50]
        serializer = InventoryMovementSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """Ajusta quantidade do item."""
        item = self.get_object()
        
        new_quantity = request.data.get('quantity')
        if new_quantity is None:
            return Response(
                {'error': 'Quantidade é obrigatória'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_quantity = Decimal(str(new_quantity))
        except:
            return Response(
                {'error': 'Quantidade inválida'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        note = request.data.get('note', 'Ajuste manual de estoque')
        
        # Criar movimentação de ajuste
        movement = InventoryMovement.objects.create(
            item=item,
            type=InventoryMovement.MovementType.ADJUSTMENT,
            reason=InventoryMovement.Reason.ADJUSTMENT,
            quantity=new_quantity,  # Para ajuste, quantity é o valor final
            unit_cost=item.unit_cost,
            note=note,
            performed_by=request.user
        )
        
        return Response({
            'item': InventoryItemSerializer(item).data,
            'movement': InventoryMovementSerializer(movement).data,
        })


class InventoryMovementViewSet(viewsets.ModelViewSet):
    """ViewSet para Movimentações de Estoque."""
    
    queryset = InventoryMovement.objects.select_related(
        'item', 'work_order', 'performed_by'
    )
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'type': ['exact', 'in'],
        'reason': ['exact', 'in'],
        'item': ['exact'],
        'work_order': ['exact'],
        'performed_by': ['exact'],
        'created_at': ['gte', 'lte'],
    }
    search_fields = ['item__code', 'item__name', 'reference', 'invoice_number']
    ordering_fields = ['created_at', 'quantity']
    ordering = ['-created_at']
    
    # Não permitir edição/exclusão de movimentações
    http_method_names = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return InventoryMovementCreateSerializer
        return InventoryMovementSerializer

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo de movimentações por período."""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timezone.timedelta(days=days)
        
        movements = self.queryset.filter(created_at__gte=start_date)
        
        # Contagens por tipo
        by_type = movements.values('type').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity')
        )
        
        # Contagens por motivo
        by_reason = movements.values('reason').annotate(
            count=Count('id')
        )
        
        return Response({
            'period_days': days,
            'total_movements': movements.count(),
            'by_type': list(by_type),
            'by_reason': list(by_reason),
        })

    @action(detail=False, methods=['get'])
    def consumption_by_category(self, request):
        """Retorna consumo (saídas) agrupado por categoria no período."""
        days = int(request.query_params.get('days', 90))
        start_date = timezone.now() - timezone.timedelta(days=days)
        
        # Filtrar apenas saídas (OUT) no período
        movements = self.queryset.filter(
            created_at__gte=start_date,
            type=InventoryMovement.MovementType.OUT
        ).select_related('item__category')
        
        # Agrupar por categoria
        consumption = movements.values(
            'item__category__id',
            'item__category__name'
        ).annotate(
            total_consumed=Sum('quantity')
        ).order_by('-total_consumed')
        
        # Formatar resultado
        result = [
            {
                'category_id': item['item__category__id'],
                'category_name': item['item__category__name'] or 'Sem Categoria',
                'total_consumed': int(item['total_consumed']) if item['total_consumed'] else 0
            }
            for item in consumption
            if item['total_consumed'] and item['total_consumed'] > 0
        ]
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def top_consumed_items(self, request):
        """Retorna os itens mais consumidos no período."""
        days = int(request.query_params.get('days', 90))
        limit = int(request.query_params.get('limit', 5))
        start_date = timezone.now() - timezone.timedelta(days=days)
        
        # Filtrar apenas saídas (OUT) no período
        movements = self.queryset.filter(
            created_at__gte=start_date,
            type=InventoryMovement.MovementType.OUT
        ).select_related('item', 'item__category')
        
        # Agrupar por item
        consumption = movements.values(
            'item__id',
            'item__name',
            'item__code',
            'item__unit',
            'item__category__name'
        ).annotate(
            total_consumed=Sum('quantity')
        ).order_by('-total_consumed')[:limit]
        
        # Formatar resultado
        result = [
            {
                'item_id': item['item__id'],
                'item_name': item['item__name'],
                'item_sku': item['item__code'],
                'item_unit': item['item__unit'],
                'category_name': item['item__category__name'] or 'Sem Categoria',
                'total_consumed': int(item['total_consumed']) if item['total_consumed'] else 0
            }
            for item in consumption
        ]
        
        return Response(result)


class InventoryCountViewSet(viewsets.ModelViewSet):
    """ViewSet para Contagens de Inventário."""
    
    queryset = InventoryCount.objects.prefetch_related(
        'items__item', 'categories'
    ).select_related('created_by', 'performed_by')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact', 'in'],
        'scheduled_date': ['exact', 'gte', 'lte'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'scheduled_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return InventoryCountListSerializer
        return InventoryCountSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Inicia a contagem."""
        count = self.get_object()
        
        if count.status != InventoryCount.Status.DRAFT:
            return Response(
                {'error': 'Apenas contagens em rascunho podem ser iniciadas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count.status = InventoryCount.Status.IN_PROGRESS
        count.started_at = timezone.now()
        count.performed_by = request.user
        count.save()
        
        serializer = self.get_serializer(count)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Conclui a contagem e aplica ajustes."""
        count = self.get_object()
        
        if count.status != InventoryCount.Status.IN_PROGRESS:
            return Response(
                {'error': 'Apenas contagens em andamento podem ser concluídas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se todos os itens foram contados
        uncounted = count.items.filter(is_counted=False).count()
        if uncounted > 0:
            apply_partial = request.data.get('apply_partial', False)
            if not apply_partial:
                return Response(
                    {'error': f'{uncounted} itens não foram contados', 'uncounted': uncounted},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Aplicar ajustes
        apply_adjustments = request.data.get('apply_adjustments', True)
        adjustments_made = 0
        
        if apply_adjustments:
            for count_item in count.items.filter(is_counted=True):
                if count_item.has_discrepancy:
                    # Criar movimentação de ajuste
                    InventoryMovement.objects.create(
                        item=count_item.item,
                        type=InventoryMovement.MovementType.ADJUSTMENT,
                        reason=InventoryMovement.Reason.ADJUSTMENT,
                        quantity=count_item.counted_quantity,
                        unit_cost=count_item.item.unit_cost,
                        reference=f"Contagem: {count.name}",
                        note=count_item.note or f"Ajuste de contagem #{count.id}",
                        performed_by=request.user
                    )
                    adjustments_made += 1
        
        count.status = InventoryCount.Status.COMPLETED
        count.completed_at = timezone.now()
        count.save()
        
        return Response({
            'count': InventoryCountSerializer(count).data,
            'adjustments_made': adjustments_made,
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancela a contagem."""
        count = self.get_object()
        
        if count.status == InventoryCount.Status.COMPLETED:
            return Response(
                {'error': 'Contagens concluídas não podem ser canceladas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count.status = InventoryCount.Status.CANCELLED
        count.save()
        
        serializer = self.get_serializer(count)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='generate-items')
    def generate_items(self, request, pk=None):
        """Gera itens para contagem baseado nos filtros."""
        count = self.get_object()
        
        if count.status != InventoryCount.Status.DRAFT:
            return Response(
                {'error': 'Itens só podem ser gerados para contagens em rascunho'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filtrar itens
        items_qs = InventoryItem.objects.filter(is_active=True)
        
        if count.categories.exists():
            items_qs = items_qs.filter(category__in=count.categories.all())
        
        if count.location:
            items_qs = items_qs.filter(location__icontains=count.location)
        
        # Criar itens de contagem
        created = 0
        for item in items_qs:
            _, was_created = InventoryCountItem.objects.get_or_create(
                count=count,
                item=item,
                defaults={'expected_quantity': item.quantity}
            )
            if was_created:
                created += 1
        
        return Response({
            'items_created': created,
            'total_items': count.items.count(),
        })

    @action(detail=True, methods=['post'], url_path='items/(?P<item_id>[^/.]+)/count')
    def count_item(self, request, pk=None, item_id=None):
        """Registra contagem de um item."""
        count = self.get_object()
        
        if count.status != InventoryCount.Status.IN_PROGRESS:
            return Response(
                {'error': 'Contagem não está em andamento'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            count_item = count.items.get(id=item_id)
        except InventoryCountItem.DoesNotExist:
            return Response(
                {'error': 'Item não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        counted_quantity = request.data.get('counted_quantity')
        if counted_quantity is None:
            return Response(
                {'error': 'Quantidade contada é obrigatória'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            count_item.counted_quantity = Decimal(str(counted_quantity))
        except:
            return Response(
                {'error': 'Quantidade inválida'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count_item.is_counted = True
        count_item.note = request.data.get('note', '')
        count_item.save()
        
        serializer = InventoryCountItemSerializer(count_item)
        return Response(serializer.data)
