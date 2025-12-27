"""
Views para CMMS - Gestão de Manutenção
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone

from .models import (
    ChecklistCategory, ChecklistTemplate, WorkOrder, WorkOrderPhoto, 
    WorkOrderItem, Request, RequestItem, MaintenancePlan,
    ProcedureCategory, Procedure, ProcedureVersion
)
from .serializers import (
    ChecklistCategorySerializer, ChecklistTemplateSerializer,
    ChecklistTemplateListSerializer, ChecklistTemplateDetailSerializer,
    ChecklistTemplateCreateSerializer, ChecklistTemplateUpdateSerializer,
    WorkOrderSerializer, WorkOrderListSerializer, WorkOrderPhotoSerializer,
    WorkOrderItemSerializer, WorkOrderStatsSerializer,
    RequestSerializer, RequestListSerializer, RequestItemSerializer,
    ConvertToWorkOrderSerializer,
    MaintenancePlanSerializer, MaintenancePlanListSerializer,
    ProcedureCategorySerializer, ProcedureListSerializer,
    ProcedureDetailSerializer, ProcedureCreateSerializer,
    ProcedureUpdateSerializer, ProcedureVersionSerializer,
    ProcedureApproveSerializer
)
from apps.inventory.models import InventoryMovement


class ChecklistCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorias de checklist."""
    
    queryset = ChecklistCategory.objects.all()
    serializer_class = ChecklistCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar apenas ativos por padrão
        if self.action == 'list':
            is_active = self.request.query_params.get('is_active', None)
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet para templates de checklist."""
    
    queryset = ChecklistTemplate.objects.select_related('category', 'created_by')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'category': ['exact'],
        'status': ['exact', 'in'],
        'is_active': ['exact'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'usage_count']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ChecklistTemplateListSerializer
        if self.action == 'retrieve':
            return ChecklistTemplateDetailSerializer
        if self.action == 'create':
            return ChecklistTemplateCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ChecklistTemplateUpdateSerializer
        return ChecklistTemplateSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retorna estatísticas dos checklists."""
        queryset = self.get_queryset()
        
        total = queryset.count()
        active = queryset.filter(is_active=True, status='ACTIVE').count()
        inactive = queryset.filter(Q(is_active=False) | ~Q(status='ACTIVE')).count()
        
        # Calcular total de itens e uso
        total_items = 0
        total_usage = 0
        for checklist in queryset:
            if checklist.items:
                total_items += len(checklist.items)
            total_usage += checklist.usage_count
        
        # Por categoria
        by_category = {}
        for cat in ChecklistCategory.objects.all():
            by_category[cat.name] = queryset.filter(category=cat).count()
        
        return Response({
            'total': total,
            'active': active,
            'inactive': inactive,
            'total_items': total_items,
            'total_usage': total_usage,
            'by_category': by_category,
        })

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplica um checklist."""
        original = self.get_object()
        
        # Criar cópia
        new_checklist = ChecklistTemplate.objects.create(
            name=f"{original.name} (Cópia)",
            description=original.description,
            category=original.category,
            items=original.items.copy() if original.items else [],
            status='DRAFT',
            is_active=True,
            estimated_time=original.estimated_time,
            created_by=request.user,
        )
        
        serializer = ChecklistTemplateDetailSerializer(new_checklist)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Ativa ou desativa um checklist."""
        checklist = self.get_object()
        is_active = request.data.get('is_active', not checklist.is_active)
        
        checklist.is_active = is_active
        checklist.save(update_fields=['is_active', 'updated_at'])
        
        serializer = ChecklistTemplateDetailSerializer(checklist)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def increment_usage(self, request, pk=None):
        """Incrementa o contador de uso."""
        checklist = self.get_object()
        checklist.increment_usage()
        
        return Response({'usage_count': checklist.usage_count})


class WorkOrderViewSet(viewsets.ModelViewSet):
    """ViewSet para Ordens de Serviço."""
    
    queryset = WorkOrder.objects.select_related(
        'asset', 'asset__site', 'assigned_to', 'created_by',
        'checklist_template', 'request', 'maintenance_plan'
    ).prefetch_related('photos', 'items__inventory_item')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact', 'in'],
        'type': ['exact', 'in'],
        'priority': ['exact', 'in'],
        'asset': ['exact'],
        'assigned_to': ['exact'],
        'scheduled_date': ['exact', 'gte', 'lte'],
    }
    search_fields = ['number', 'description', 'asset__tag', 'asset__name']
    ordering_fields = ['number', 'scheduled_date', 'priority', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkOrderListSerializer
        return WorkOrderSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Inicia a execução de uma OS."""
        work_order = self.get_object()
        
        if work_order.status != WorkOrder.Status.OPEN:
            return Response(
                {'error': 'Apenas OS abertas podem ser iniciadas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        work_order.start()
        serializer = self.get_serializer(work_order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Conclui uma OS."""
        work_order = self.get_object()
        
        if work_order.status not in [WorkOrder.Status.OPEN, WorkOrder.Status.IN_PROGRESS]:
            return Response(
                {'error': 'Apenas OS abertas ou em andamento podem ser concluídas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        execution_description = request.data.get('execution_description', '')
        actual_hours = request.data.get('actual_hours')
        
        if actual_hours:
            actual_hours = float(actual_hours)
        
        work_order.complete(execution_description, actual_hours)
        
        # Atualizar respostas do checklist se fornecidas
        checklist_responses = request.data.get('checklist_responses')
        if checklist_responses:
            work_order.checklist_responses = checklist_responses
            work_order.save(update_fields=['checklist_responses'])
        
        serializer = self.get_serializer(work_order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancela uma OS."""
        work_order = self.get_object()
        
        if work_order.status in [WorkOrder.Status.COMPLETED, WorkOrder.Status.CANCELLED]:
            return Response(
                {'error': 'OS já concluída ou cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {'error': 'Motivo do cancelamento é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        work_order.cancel(reason)
        serializer = self.get_serializer(work_order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def photos(self, request, pk=None):
        """Upload de foto para a OS."""
        work_order = self.get_object()
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'Arquivo não fornecido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        photo = WorkOrderPhoto.objects.create(
            work_order=work_order,
            file=file,
            caption=request.data.get('caption', ''),
            uploaded_by=request.user
        )
        
        serializer = WorkOrderPhotoSerializer(photo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='photos/(?P<photo_id>[^/.]+)')
    def delete_photo(self, request, pk=None, photo_id=None):
        """Deleta uma foto da OS."""
        work_order = self.get_object()
        
        try:
            photo = WorkOrderPhoto.objects.get(id=photo_id, work_order=work_order)
            # Deletar o arquivo físico
            if photo.file:
                photo.file.delete(save=False)
            photo.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WorkOrderPhoto.DoesNotExist:
            return Response(
                {'error': 'Foto não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='items')
    def add_item(self, request, pk=None):
        """Adiciona item de estoque à OS e registra saída do estoque."""
        work_order = self.get_object()
        
        serializer = WorkOrderItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        work_order_item = serializer.save(work_order=work_order)
        
        # Registrar saída no estoque
        InventoryMovement.objects.create(
            item=work_order_item.inventory_item,
            type=InventoryMovement.MovementType.OUT,
            reason=InventoryMovement.Reason.WORK_ORDER,
            quantity=work_order_item.quantity,
            work_order=work_order,
            reference=f"OS {work_order.number}",
            performed_by=request.user
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='items/(?P<item_id>[^/.]+)')
    def delete_item(self, request, pk=None, item_id=None):
        """Remove item de estoque da OS e devolve ao estoque."""
        work_order = self.get_object()
        
        try:
            work_order_item = WorkOrderItem.objects.get(id=item_id, work_order=work_order)
            
            # Registrar devolução ao estoque
            InventoryMovement.objects.create(
                item=work_order_item.inventory_item,
                type=InventoryMovement.MovementType.RETURN,
                reason=InventoryMovement.Reason.RETURN_STOCK,
                quantity=work_order_item.quantity,
                work_order=work_order,
                reference=f"Devolução OS {work_order.number}",
                performed_by=request.user
            )
            
            work_order_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WorkOrderItem.DoesNotExist:
            return Response(
                {'error': 'Item não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retorna estatísticas das OS."""
        queryset = self.get_queryset()
        today = timezone.now().date()
        
        # Contagens por status
        status_counts = queryset.values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        # Contagens por tipo
        type_counts = queryset.values('type').annotate(count=Count('id'))
        type_dict = {item['type'].lower(): item['count'] for item in type_counts}
        
        # Contagens por prioridade
        priority_counts = queryset.values('priority').annotate(count=Count('id'))
        priority_dict = {item['priority'].lower(): item['count'] for item in priority_counts}
        
        # Atrasadas
        overdue_count = queryset.filter(
            status__in=[WorkOrder.Status.OPEN, WorkOrder.Status.IN_PROGRESS],
            scheduled_date__lt=today
        ).count()
        
        stats = {
            'total': queryset.count(),
            'open': status_dict.get('OPEN', 0),
            'in_progress': status_dict.get('IN_PROGRESS', 0),
            'completed': status_dict.get('COMPLETED', 0),
            'overdue': overdue_count,
            'by_type': type_dict,
            'by_priority': priority_dict,
        }
        
        serializer = WorkOrderStatsSerializer(stats)
        return Response(serializer.data)


class RequestViewSet(viewsets.ModelViewSet):
    """ViewSet para Solicitações."""
    
    queryset = Request.objects.select_related(
        'sector', 'subsection', 'asset', 'requester'
    ).prefetch_related('items__inventory_item')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact', 'in'],
        'sector': ['exact'],
        'subsection': ['exact'],
        'asset': ['exact'],
        'requester': ['exact'],
    }
    search_fields = ['number', 'note', 'asset__tag']
    ordering_fields = ['number', 'status', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return RequestListSerializer
        return RequestSerializer

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Converte solicitação em ordem de serviço."""
        req = self.get_object()
        
        if req.status == Request.Status.CONVERTED:
            return Response(
                {'error': 'Solicitação já foi convertida'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if req.status == Request.Status.REJECTED:
            return Response(
                {'error': 'Solicitação rejeitada não pode ser convertida'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ConvertToWorkOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Verificar se a solicitação tem um ativo associado
        if not req.asset:
            return Response(
                {'error': 'Solicitação não possui ativo associado. Não é possível converter.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Criar OS com tipo REQUEST (fixo para solicitações convertidas)
        wo_data = serializer.validated_data
        work_order = WorkOrder.objects.create(
            asset=req.asset,
            type=WorkOrder.Type.REQUEST,
            priority=wo_data['priority'],
            scheduled_date=wo_data.get('scheduled_date'),
            assigned_to=wo_data.get('assigned_to'),
            description=wo_data.get('description') or req.note,
            request=req,
            created_by=request.user
        )
        
        # Atualizar status da solicitação
        req.update_status(Request.Status.CONVERTED, request.user)
        
        return Response({
            'request': RequestSerializer(req).data,
            'work_order_id': work_order.id,
            'work_order_number': work_order.number,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='items')
    def add_item(self, request, pk=None):
        """Adiciona item à solicitação."""
        req = self.get_object()
        
        serializer = RequestItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(request=req)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def counts(self, request):
        """Retorna contagens por status."""
        queryset = self.get_queryset()
        
        counts = queryset.values('status').annotate(count=Count('id'))
        result = {item['status'].lower(): item['count'] for item in counts}
        
        # Garantir que todas as chaves existem
        for status_choice in Request.Status.choices:
            key = status_choice[0].lower()
            if key not in result:
                result[key] = 0
        
        return Response(result)


class MaintenancePlanViewSet(viewsets.ModelViewSet):
    """ViewSet para Planos de Manutenção."""
    
    queryset = MaintenancePlan.objects.prefetch_related(
        'assets', 'checklist_template'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'is_active': ['exact'],
        'frequency': ['exact', 'in'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'next_execution', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return MaintenancePlanListSerializer
        return MaintenancePlanSerializer

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Gera ordens de serviço para o plano."""
        plan = self.get_object()
        
        if not plan.is_active:
            return Response(
                {'error': 'Plano inativo não pode gerar OS'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not plan.assets.exists():
            return Response(
                {'error': 'Plano não possui ativos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        work_order_ids = plan.generate_work_orders(request.user)
        
        return Response({
            'work_orders_created': len(work_order_ids),
            'work_order_ids': work_order_ids,
            'next_execution': plan.next_execution.isoformat() if plan.next_execution else None,
        })

    @action(detail=True, methods=['post'], url_path='assets')
    def add_asset(self, request, pk=None):
        """Adiciona ativo ao plano."""
        plan = self.get_object()
        asset_id = request.data.get('asset')
        
        if not asset_id:
            return Response(
                {'error': 'ID do ativo é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan.assets.add(asset_id)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['delete'], url_path='assets/(?P<asset_id>[^/.]+)')
    def remove_asset(self, request, pk=None, asset_id=None):
        """Remove ativo do plano."""
        plan = self.get_object()
        plan.assets.remove(asset_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retorna estatísticas dos planos."""
        queryset = self.get_queryset()
        
        # Contagens
        total = queryset.count()
        active = queryset.filter(is_active=True).count()
        inactive = total - active
        
        # Por frequência
        freq_counts = queryset.values('frequency').annotate(count=Count('id'))
        by_frequency = {item['frequency'].lower(): item['count'] for item in freq_counts}
        
        # Próximas execuções (top 5)
        next_executions = queryset.filter(
            is_active=True,
            next_execution__isnull=False
        ).order_by('next_execution')[:5].values('id', 'name', 'next_execution')
        
        return Response({
            'total': total,
            'active': active,
            'inactive': inactive,
            'by_frequency': by_frequency,
            'next_executions': [
                {
                    'plan_id': item['id'],
                    'plan_name': item['name'],
                    'next_date': item['next_execution'].isoformat() if item['next_execution'] else None
                }
                for item in next_executions
            ]
        })


# ========================
# ViewSets de Procedimentos
# ========================

class ProcedureCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorias de procedimentos."""
    
    queryset = ProcedureCategory.objects.all()
    serializer_class = ProcedureCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Adiciona contagem de procedures
        queryset = queryset.annotate(
            procedures_count=Count('procedures')
        )
        return queryset


class ProcedureViewSet(viewsets.ModelViewSet):
    """ViewSet para procedimentos."""
    
    queryset = Procedure.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'file_type']
    search_fields = ['title', 'code', 'description']
    ordering_fields = ['title', 'code', 'created_at', 'updated_at']
    ordering = ['-updated_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related(
            'category', 'created_by'
        ).annotate(
            versions_count=Count('versions')
        )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProcedureListSerializer
        elif self.action == 'retrieve':
            return ProcedureDetailSerializer
        elif self.action == 'create':
            return ProcedureCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProcedureUpdateSerializer
        return ProcedureDetailSerializer

    def perform_create(self, serializer):
        procedure = serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Aprova um procedimento (muda para ACTIVE)."""
        procedure = self.get_object()
        serializer = ProcedureApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if serializer.validated_data['approved']:
            procedure.status = 'ACTIVE'
            procedure.is_active = True
            procedure.save()
            return Response({
                'status': 'approved',
                'message': 'Procedimento aprovado com sucesso.'
            })
        else:
            procedure.status = 'INACTIVE'
            procedure.is_active = False
            procedure.save()
            return Response({
                'status': 'rejected',
                'message': 'Procedimento desativado.',
                'reason': serializer.validated_data.get('rejection_reason', '')
            })

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        """Envia procedimento para revisão."""
        procedure = self.get_object()
        
        if procedure.status not in ['DRAFT', 'ARCHIVED']:
            return Response(
                {'error': 'Apenas procedimentos em rascunho ou arquivados podem ser enviados para revisão.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        procedure.status = 'REVIEW'
        procedure.save()
        
        return Response({
            'status': 'submitted',
            'message': 'Procedimento enviado para revisão.'
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Arquiva um procedimento."""
        procedure = self.get_object()
        procedure.status = 'ARCHIVED'
        procedure.save()
        
        return Response({
            'status': 'archived',
            'message': 'Procedimento arquivado com sucesso.'
        })

    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """Cria uma nova versão do procedimento."""
        procedure = self.get_object()
        
        # Dados da nova versão
        changelog = request.data.get('changelog', 'Nova versão')
        file = request.FILES.get('file')
        
        # Salva versão anterior
        ProcedureVersion.objects.create(
            procedure=procedure,
            version_number=procedure.version,
            file=procedure.file,
            file_type=procedure.file_type,
            changelog=changelog,
            created_by=request.user
        )
        
        # Atualiza procedimento com novo arquivo se fornecido
        if file:
            procedure.file = file
            # Detecta tipo de arquivo
            if file.name.lower().endswith('.pdf'):
                procedure.file_type = 'PDF'
            elif file.name.lower().endswith('.md'):
                procedure.file_type = 'MARKDOWN'
            elif file.name.lower().endswith('.docx'):
                procedure.file_type = 'DOCX'
        
        # Incrementa versão
        procedure.version += 1
        procedure.save()
        
        return Response({
            'status': 'created',
            'version': procedure.version,
            'message': f'Versão {procedure.version} criada com sucesso.'
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Lista todas as versões do procedimento."""
        procedure = self.get_object()
        versions = procedure.versions.all().order_by('-version_number')
        serializer = ProcedureVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='versions/(?P<version_id>[^/.]+)/restore')
    def restore_version(self, request, pk=None, version_id=None):
        """Restaura uma versão anterior do procedimento."""
        procedure = self.get_object()
        
        try:
            version = procedure.versions.get(id=version_id)
        except ProcedureVersion.DoesNotExist:
            return Response(
                {'error': 'Versão não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Atualiza procedimento com dados da versão
        procedure.file = version.file
        procedure.file_type = version.file_type
        procedure.save()
        
        return Response({
            'status': 'restored',
            'message': f'Procedimento restaurado para versão {version.version_number}.'
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retorna estatísticas dos procedimentos."""
        queryset = self.get_queryset()
        
        total = queryset.count()
        by_status = {
            'active': queryset.filter(status='ACTIVE').count(),
            'inactive': queryset.filter(status='INACTIVE').count(),
            'draft': queryset.filter(status='DRAFT').count(),
            'archived': queryset.filter(status='ARCHIVED').count(),
        }
        by_type = {
            'pdf': queryset.filter(file_type='PDF').count(),
            'markdown': queryset.filter(file_type='MARKDOWN').count(),
            'docx': queryset.filter(file_type='DOCX').count(),
        }
        
        # Por categoria
        category_counts = queryset.values('category__name').annotate(count=Count('id'))
        by_category = {item['category__name']: item['count'] for item in category_counts if item['category__name']}
        
        return Response({
            'total': total,
            'by_status': by_status,
            'by_type': by_type,
            'by_category': by_category
        })

