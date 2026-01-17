"""
Views para CMMS - Gestão de Manutenção
"""

import logging
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

logger = logging.getLogger(__name__)

from apps.accounts.permissions import RoleBasedPermission
from apps.inventory.models import InventoryMovement

from .models import (
    ChecklistCategory,
    ChecklistTemplate,
    ExternalCost,
    ExternalCostAttachment,
    MaintenancePlan,
    PartUsage,
    Procedure,
    ProcedureCategory,
    ProcedureVersion,
    Request,
    RequestItem,
    TimeEntry,
    WorkOrder,
    WorkOrderItem,
    WorkOrderPhoto,
)
from .serializers import (
    ChecklistCategorySerializer,
    ChecklistTemplateCreateSerializer,
    ChecklistTemplateDetailSerializer,
    ChecklistTemplateListSerializer,
    ChecklistTemplateSerializer,
    ChecklistTemplateUpdateSerializer,
    ConvertToWorkOrderSerializer,
    ExternalCostAttachmentSerializer,
    ExternalCostListSerializer,
    ExternalCostSerializer,
    MaintenancePlanListSerializer,
    MaintenancePlanSerializer,
    PartUsageListSerializer,
    PartUsageSerializer,
    ProcedureApproveSerializer,
    ProcedureCategorySerializer,
    ProcedureCreateSerializer,
    ProcedureDetailSerializer,
    ProcedureListSerializer,
    ProcedureUpdateSerializer,
    ProcedureVersionSerializer,
    RequestItemSerializer,
    RequestListSerializer,
    RequestSerializer,
    TimeEntryListSerializer,
    TimeEntrySerializer,
    WorkOrderItemSerializer,
    WorkOrderListSerializer,
    WorkOrderPhotoSerializer,
    WorkOrderSerializer,
    WorkOrderStatsSerializer,
)


class ActionRolePermissionMixin:
    """Define permissões por ação usando RoleBasedPermission."""

    action_roles = {}

    def get_permissions(self):
        roles = self.action_roles.get(self.action)
        if roles is None:
            roles = RoleBasedPermission.ALL_ROLES
        self.required_roles = roles
        return [permission() for permission in self.permission_classes]


class ChecklistCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorias de checklist."""

    queryset = ChecklistCategory.objects.all()
    serializer_class = ChecklistCategorySerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    action_roles = {
        "create": ["owner", "admin", "operator"],
        "update": ["owner", "admin", "operator", "technician"],
        "partial_update": ["owner", "admin", "operator", "technician"],
        "destroy": ["owner", "admin", "operator"],
        "start": ["owner", "admin", "operator", "technician"],
        "complete": ["owner", "admin", "operator", "technician"],
        "cancel": ["owner", "admin", "operator"],
        "photos": ["owner", "admin", "operator", "technician"],
        "delete_photo": ["owner", "admin", "operator", "technician"],
        "add_item": ["owner", "admin", "operator", "technician"],
        "delete_item": ["owner", "admin", "operator", "technician"],
        "close_with_event": ["owner", "admin", "operator"],
        "post_costs": ["owner", "admin", "operator"],
    }
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar apenas ativos por padrão
        if self.action == "list":
            is_active = self.request.query_params.get("is_active", None)
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset


class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet para templates de checklist."""

    queryset = ChecklistTemplate.objects.select_related("category", "created_by")
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    action_roles = {
        "create": ["owner", "admin", "operator", "technician", "requester"],
        "update": ["owner", "admin", "operator", "technician", "requester"],
        "partial_update": ["owner", "admin", "operator", "technician", "requester"],
        "destroy": ["owner", "admin", "operator"],
        "convert": ["owner", "admin", "operator"],
        "add_item": ["owner", "admin", "operator", "technician", "requester"],
        "remove_item": ["owner", "admin", "operator", "technician", "requester"],
    }
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "category": ["exact"],
        "status": ["exact", "in"],
        "is_active": ["exact"],
    }
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "usage_count"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.action == "list":
            return ChecklistTemplateListSerializer
        if self.action == "retrieve":
            return ChecklistTemplateDetailSerializer
        if self.action == "create":
            return ChecklistTemplateCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ChecklistTemplateUpdateSerializer
        return ChecklistTemplateSerializer

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Retorna estatísticas dos checklists."""
        queryset = self.get_queryset()

        total = queryset.count()
        active = queryset.filter(is_active=True, status="ACTIVE").count()
        inactive = queryset.filter(Q(is_active=False) | ~Q(status="ACTIVE")).count()

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

        return Response(
            {
                "total": total,
                "active": active,
                "inactive": inactive,
                "total_items": total_items,
                "total_usage": total_usage,
                "by_category": by_category,
            }
        )

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplica um checklist."""
        original = self.get_object()

        # Criar cópia
        new_checklist = ChecklistTemplate.objects.create(
            name=f"{original.name} (Cópia)",
            description=original.description,
            category=original.category,
            items=original.items.copy() if original.items else [],
            status="DRAFT",
            is_active=True,
            estimated_time=original.estimated_time,
            created_by=request.user,
        )

        serializer = ChecklistTemplateDetailSerializer(new_checklist)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        """Ativa ou desativa um checklist."""
        checklist = self.get_object()
        is_active = request.data.get("is_active", not checklist.is_active)

        checklist.is_active = is_active
        checklist.save(update_fields=["is_active", "updated_at"])

        serializer = ChecklistTemplateDetailSerializer(checklist)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def increment_usage(self, request, pk=None):
        """Incrementa o contador de uso."""
        checklist = self.get_object()
        checklist.increment_usage()

        return Response({"usage_count": checklist.usage_count})


class WorkOrderViewSet(viewsets.ModelViewSet):
    """ViewSet para Ordens de Serviço."""

    queryset = WorkOrder.objects.select_related(
        "asset",
        "asset__site",
        "assigned_to",
        "created_by",
        "checklist_template",
        "request",
        "maintenance_plan",
        "cost_center",
    ).prefetch_related(
        "photos",
        "items__inventory_item",
        "time_entries",
        "part_usages",
        "external_costs",
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "status": ["exact", "in"],
        "type": ["exact", "in"],
        "priority": ["exact", "in"],
        "asset": ["exact"],
        "assigned_to": ["exact"],
        "cost_center": ["exact"],
        "scheduled_date": ["exact", "gte", "lte"],
    }
    search_fields = ["number", "description", "asset__tag", "asset__name"]
    ordering_fields = ["number", "scheduled_date", "priority", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return WorkOrderListSerializer
        return WorkOrderSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """Override update para processar custos automaticamente ao concluir."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_status = instance.status

        logger.info(f"🔄 UPDATE OS {instance.number}: status atual = {old_status}")

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Se mudou de qualquer status para COMPLETED, processar custos
        new_status = serializer.instance.status
        logger.info(f"📊 UPDATE OS {instance.number}: novo status = {new_status}")

        if (
            old_status != WorkOrder.Status.COMPLETED
            and new_status == WorkOrder.Status.COMPLETED
        ):
            logger.info(
                f"✅ Mudança detectada: {old_status} → {new_status}. Processando custos..."
            )
            self._process_costs_on_completion(serializer.instance)
        else:
            logger.info(
                f"⏭️ Sem mudança para COMPLETED (old={old_status}, new={new_status})"
            )

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update para processar custos automaticamente ao concluir."""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def _process_costs_on_completion(self, work_order):
        """Processa custos automaticamente quando OS é concluída."""
        try:
            from django.db import connection

            from apps.cmms.models import PartUsage, TimeEntry
            from apps.trakledger.cost_engine import CostEngineService

            logger.info(
                f"🤖 Processamento automático de custos para OS {work_order.number}..."
            )

            # Auto-criar TimeEntry se não existir
            time_entries_count = work_order.time_entries.count()
            if time_entries_count == 0:
                # Usar actual_hours ou criar entrada padrão de 1h
                hours = (
                    work_order.actual_hours
                    if work_order.actual_hours
                    else Decimal("1.0")
                )
                TimeEntry.objects.create(
                    work_order=work_order,
                    role="Técnico",
                    hours=hours,
                    hourly_rate=Decimal("75.00"),
                    work_date=timezone.now().date(),
                )
                logger.info(f"✅ TimeEntry auto-criado: {hours}h de Técnico")

            # Auto-criar PartUsage de WorkOrderItem se não existir
            part_usages_count = work_order.part_usages.count()
            if part_usages_count == 0:
                items_converted = 0
                for wo_item in work_order.items.all():
                    if wo_item.inventory_item:
                        PartUsage.objects.create(
                            work_order=work_order,
                            inventory_item=wo_item.inventory_item,
                            part_number=wo_item.inventory_item.code,
                            part_name=wo_item.inventory_item.name,
                            quantity=wo_item.quantity,
                            unit=wo_item.inventory_item.unit,
                            unit_cost=wo_item.inventory_item.unit_cost,
                            source=PartUsage.Source.WORK_ORDER_ITEM,
                        )
                        items_converted += 1
                if items_converted > 0:
                    logger.info(
                        f"✅ {items_converted} PartUsage auto-criados de WorkOrderItem"
                    )

            # Refresh para pegar os novos TimeEntry e PartUsage
            work_order.refresh_from_db()

            # Mapear tipo da OS para category
            type_to_category = {
                "PREVENTIVE": "preventive",
                "CORRECTIVE": "corrective",
                "EMERGENCY": "emergency",
                "REQUEST": "request",
            }
            category = type_to_category.get(work_order.type, "other")

            # Montar event_data no formato esperado pelo CostEngine
            event_data = {
                "work_order_id": str(work_order.id),
                "work_order_number": work_order.number,
                "asset_id": str(work_order.asset_id),
                "cost_center_id": (
                    str(work_order.cost_center_id)
                    if work_order.cost_center_id
                    else None
                ),
                "category": category,
                "completed_at": (
                    work_order.completed_at.isoformat()
                    if work_order.completed_at
                    else timezone.now().isoformat()
                ),
                "labor": [
                    {
                        "time_entry_id": str(te.id),
                        "role": te.role,
                        "hours": float(te.hours),
                        "hourly_rate": (
                            float(te.hourly_rate) if te.hourly_rate else 75.0
                        ),
                    }
                    for te in work_order.time_entries.all()
                ],
                "parts": [
                    {
                        "part_usage_id": str(pu.id),
                        "part_id": (
                            str(pu.inventory_item_id) if pu.inventory_item_id else None
                        ),
                        "part_number": pu.part_number,
                        "part_name": pu.part_name,
                        "qty": float(pu.quantity),
                        "unit_cost": float(pu.unit_cost) if pu.unit_cost else 0,
                    }
                    for pu in work_order.part_usages.all()
                ],
                "third_party": [
                    {
                        "external_cost_id": str(ec.id),
                        "description": ec.description,
                        "amount": float(ec.amount),
                    }
                    for ec in work_order.external_costs.all()
                ],
            }

            logger.info(
                f"📦 event_data: labor={len(event_data['labor'])}, parts={len(event_data['parts'])}, third_party={len(event_data['third_party'])}"
            )

            # Processar custos
            result = CostEngineService.process_work_order_closed(
                event_data=event_data,
                tenant_id=connection.schema_name,
            )

            logger.info(
                f"✅ Processamento automático concluído: {result.get('transactions_created', 0)} transação(ões) criada(s)"
            )

        except Exception as e:
            logger.error(
                f"❌ Erro ao processar custos automaticamente para OS {work_order.number}: {str(e)}",
                exc_info=True,
            )

        # === Resolver alertas vinculados automaticamente ===
        self._resolve_linked_alerts(work_order)

    def _resolve_linked_alerts(self, work_order, user=None):
        """Resolve automaticamente alertas vinculados quando a OS é concluída."""
        try:
            from apps.alerts.models import Alert

            linked_alerts = Alert.objects.filter(work_order=work_order, resolved=False)
            alerts_resolved = 0

            for alert in linked_alerts:
                alert.resolved = True
                alert.resolved_at = timezone.now()
                alert.resolved_by = user

                # Atualiza notas com informação da resolução automática
                resolution_note = (
                    f"[Resolução Automática] Resolvido via conclusão da OS #{work_order.number}"
                )
                alert.notes = (
                    f"{alert.notes}\n{resolution_note}" if alert.notes else resolution_note
                )
                alert.save()
                alerts_resolved += 1

            if alerts_resolved > 0:
                logger.info(
                    f"✅ {alerts_resolved} alerta(s) resolvido(s) automaticamente após conclusão da OS {work_order.number}"
                )

        except Exception as e:
            logger.error(
                f"❌ Erro ao resolver alertas automaticamente para OS {work_order.number}: {str(e)}",
                exc_info=True,
            )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Inicia a execução de uma OS."""
        work_order = self.get_object()

        if work_order.status != WorkOrder.Status.OPEN:
            return Response(
                {"error": "Apenas OS abertas podem ser iniciadas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assigned_to_id = request.data.get("assigned_to")
        assigned_to = None
        if assigned_to_id:
            User = get_user_model()
            try:
                assigned_to = User.objects.get(pk=assigned_to_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "Tecnico nao encontrado"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        work_order.start(assigned_to=assigned_to)
        serializer = self.get_serializer(work_order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Conclui uma OS e processa custos automaticamente."""
        work_order = self.get_object()

        if work_order.status not in [
            WorkOrder.Status.OPEN,
            WorkOrder.Status.IN_PROGRESS,
        ]:
            return Response(
                {"error": "Apenas OS abertas ou em andamento podem ser concluídas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        execution_description = request.data.get("execution_description", "")
        actual_hours = request.data.get("actual_hours")

        if actual_hours:
            actual_hours = float(actual_hours)

        work_order.complete(execution_description, actual_hours)

        # Atualizar respostas do checklist se fornecidas
        checklist_responses = request.data.get("checklist_responses")
        if checklist_responses:
            work_order.checklist_responses = checklist_responses
            work_order.save(update_fields=["checklist_responses"])

        # Processar custos automaticamente
        try:
            from django.db import connection

            from apps.cmms.models import PartUsage, TimeEntry
            from apps.trakledger.cost_engine import CostEngineService

            logger.info(
                f"🤖 Processamento automático de custos para OS {work_order.number}..."
            )

            # Auto-criar TimeEntry se não existir
            time_entries_count = work_order.time_entries.count()
            if time_entries_count == 0:
                # Usar actual_hours ou criar entrada padrão de 1h
                hours = actual_hours if actual_hours else 1.0
                TimeEntry.objects.create(
                    work_order=work_order,
                    role="Técnico",
                    hours=hours,
                    hourly_rate=Decimal("75.00"),
                    work_date=timezone.now().date(),
                )
                logger.info(f"✅ TimeEntry auto-criado: {hours}h de Técnico")

            # Auto-criar PartUsage de WorkOrderItem se não existir
            part_usages_count = work_order.part_usages.count()
            if part_usages_count == 0:
                items_converted = 0
                for wo_item in work_order.items.all():
                    if wo_item.inventory_item:
                        PartUsage.objects.create(
                            work_order=work_order,
                            inventory_item=wo_item.inventory_item,
                            part_number=wo_item.inventory_item.code,
                            part_name=wo_item.inventory_item.name,
                            quantity=wo_item.quantity,
                            unit=wo_item.inventory_item.unit,
                            unit_cost=wo_item.inventory_item.unit_cost,
                            source=PartUsage.Source.WORK_ORDER_ITEM,
                        )
                        items_converted += 1
                if items_converted > 0:
                    logger.info(
                        f"✅ {items_converted} PartUsage auto-criados de WorkOrderItem"
                    )

            from .services import WorkOrderService

            # Refresh para evitar cache de prefetch antes de montar payload
            work_order.refresh_from_db()
            event_data = WorkOrderService._build_work_order_closed_payload(work_order)

            # Processar custos
            result = CostEngineService.process_work_order_closed(
                event_data=event_data,
                tenant_id=connection.schema_name,
            )

            logger.info(
                f"✅ Processamento automático concluído: {result.get('transactions_created', 0)} transação(ões) criada(s)"
            )

        except Exception as e:
            logger.error(
                f"❌ Erro ao processar custos automaticamente para OS {work_order.number}: {str(e)}",
                exc_info=True,
            )

        # === Resolver alertas vinculados automaticamente ===
        self._resolve_linked_alerts(work_order, request.user)

        serializer = self.get_serializer(work_order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancela uma OS."""
        work_order = self.get_object()

        if work_order.status in [
            WorkOrder.Status.COMPLETED,
            WorkOrder.Status.CANCELLED,
        ]:
            return Response(
                {"error": "OS já concluída ou cancelada"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get("reason", "")
        if not reason:
            return Response(
                {"error": "Motivo do cancelamento é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        work_order.cancel(reason)
        serializer = self.get_serializer(work_order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def photos(self, request, pk=None):
        """Upload de foto para a OS."""
        work_order = self.get_object()

        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "Arquivo não fornecido"}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = WorkOrderPhotoSerializer(
            data={"file": file, "caption": request.data.get("caption", "")}
        )
        serializer.is_valid(raise_exception=True)

        photo = WorkOrderPhoto.objects.create(
            work_order=work_order,
            file=serializer.validated_data["file"],
            caption=serializer.validated_data.get("caption", ""),
            uploaded_by=request.user,
        )

        serializer = WorkOrderPhotoSerializer(photo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="photos/(?P<photo_id>[^/.]+)")
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
                {"error": "Foto não encontrada"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):
        """Adiciona item de estoque a OS e registra saida do estoque."""
        work_order = self.get_object()

        serializer = WorkOrderItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                work_order_item = serializer.save(work_order=work_order)

                movement = InventoryMovement.objects.create(
                    item=work_order_item.inventory_item,
                    type=InventoryMovement.MovementType.OUT,
                    reason=InventoryMovement.Reason.WORK_ORDER,
                    quantity=work_order_item.quantity,
                    work_order=work_order,
                    reference=f"OS {work_order.number}",
                    performed_by=request.user,
                )

                part_usage, _ = PartUsage.objects.get_or_create(
                    work_order=work_order,
                    inventory_item=work_order_item.inventory_item,
                    defaults={
                        "quantity": work_order_item.quantity,
                        "unit": work_order_item.inventory_item.unit,
                        "unit_cost": work_order_item.inventory_item.unit_cost,
                        "description": "Item da OS",
                        "created_by": request.user,
                        "source": PartUsage.Source.WORK_ORDER_ITEM,
                    },
                )

                part_usage.quantity = work_order_item.quantity
                part_usage.unit = work_order_item.inventory_item.unit
                if part_usage.unit_cost is None:
                    part_usage.unit_cost = work_order_item.inventory_item.unit_cost
                part_usage.inventory_deducted = True
                part_usage.inventory_movement_id = movement.id
                part_usage.source = PartUsage.Source.WORK_ORDER_ITEM
                part_usage.save()
        except DjangoValidationError as exc:
            detail = exc.message_dict or {"error": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="items/(?P<item_id>[^/.]+)")
    def delete_item(self, request, pk=None, item_id=None):
        """Remove item de estoque da OS e devolve ao estoque."""
        work_order = self.get_object()

        try:
            with transaction.atomic():
                work_order_item = WorkOrderItem.objects.get(
                    id=item_id, work_order=work_order
                )

                InventoryMovement.objects.create(
                    item=work_order_item.inventory_item,
                    type=InventoryMovement.MovementType.RETURN,
                    reason=InventoryMovement.Reason.RETURN_STOCK,
                    quantity=work_order_item.quantity,
                    work_order=work_order,
                    reference=f"Devolucao OS {work_order.number}",
                    performed_by=request.user,
                )

                PartUsage.objects.filter(
                    work_order=work_order,
                    inventory_item=work_order_item.inventory_item,
                    source=PartUsage.Source.WORK_ORDER_ITEM,
                ).delete()

                work_order_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WorkOrderItem.DoesNotExist:
            return Response(
                {"error": "Item nao encontrado"}, status=status.HTTP_404_NOT_FOUND
            )
        except DjangoValidationError as exc:
            detail = exc.message_dict or {"error": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="close")
    def close_with_event(self, request, pk=None):
        """
        Fecha a OS e publica evento work_order.closed na outbox.

        Este endpoint deve ser usado quando se deseja integrar com o
        módulo Finance (Cost Engine) para lançamentos automáticos.

        Body (opcional):
        {
            "execution_description": "Descrição da execução",
            "actual_hours": 4.5,
            "checklist_responses": {...}
        }

        O evento work_order.closed será publicado com payload contendo:
        - work_order_id, asset_id, cost_center_id, category
        - labor: lista de apontamentos de tempo
        - parts: lista de peças utilizadas
        - third_party: lista de custos externos

        Referência: docs/events/02-eventos-mvp.md
        """
        from django_tenants.utils import get_tenant

        from .services import WorkOrderService

        work_order = self.get_object()

        # Validar status
        if work_order.status not in [
            WorkOrder.Status.OPEN,
            WorkOrder.Status.IN_PROGRESS,
        ]:
            return Response(
                {"error": "Apenas OS abertas ou em andamento podem ser fechadas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obter tenant_id (django-tenants)
        try:
            tenant = get_tenant(request)
            tenant_id = tenant.id if tenant else None
        except Exception:
            tenant_id = None

        if not tenant_id:
            return Response(
                {
                    "error": "Não foi possível identificar o tenant. Evento não será publicado."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Dados da requisição
        execution_description = request.data.get("execution_description", "")
        actual_hours = request.data.get("actual_hours")

        if actual_hours:
            actual_hours = float(actual_hours)

        # Fechar OS e publicar evento
        try:
            result = WorkOrderService.close_work_order(
                work_order=work_order,
                execution_description=execution_description,
                actual_hours=actual_hours,
                tenant_id=tenant_id,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Atualizar respostas do checklist se fornecidas
        checklist_responses = request.data.get("checklist_responses")
        if checklist_responses:
            work_order.checklist_responses = checklist_responses
            work_order.save(update_fields=["checklist_responses"])

        # Recarregar work_order
        work_order.refresh_from_db()
        serializer = self.get_serializer(work_order)

        return Response(
            {
                "work_order": serializer.data,
                "event_published": result.get("event_published", False),
                "event_id": (
                    str(result.get("event_id")) if result.get("event_id") else None
                ),
            }
        )

    @action(detail=True, methods=["get"], url_path="cost-summary")
    def cost_summary(self, request, pk=None):
        """
        Retorna resumo de custos da OS.

        Calcula totais de mão de obra, peças e terceiros.
        """
        from .services import WorkOrderService

        work_order = self.get_object()
        summary = WorkOrderService.get_work_order_cost_summary(work_order)

        return Response(
            {
                "work_order_id": work_order.id,
                "work_order_number": work_order.number,
                **summary,
            }
        )

    @action(detail=True, methods=["post"], url_path="post-costs")
    def post_costs(self, request, pk=None):
        """
        Processa e posta custos da OS manualmente no Finance.

        Dispara o Cost Engine para processar os custos desta OS.
        Se a OS não tiver TimeEntry/PartUsage, cria automaticamente
        a partir dos dados disponíveis (técnico alocado + WorkOrderItem).
        """
        import logging
        import traceback
        from decimal import Decimal

        from django.db import connection

        from apps.trakledger.cost_engine import CostEngineService

        from .models import PartUsage, TimeEntry
        from .services import WorkOrderService

        logger = logging.getLogger(__name__)

        try:
            work_order = self.get_object()
        except Exception as e:
            logger.error(f"Erro ao obter WorkOrder: {e}")
            return Response(
                {"error": f"Erro ao obter OS: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Verificar se OS está concluída
        if work_order.status != WorkOrder.Status.COMPLETED:
            return Response(
                {
                    "error": "Somente Ordens de Serviço concluídas podem ter custos processados"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_entries = []

        # 1) Criar TimeEntry se houver técnico mas não houver apontamento
        if work_order.assigned_to and not work_order.time_entries.exists():
            try:
                # Calcular horas trabalhadas (se houver started_at e completed_at)
                hours = Decimal("0.00")
                if work_order.started_at and work_order.completed_at:
                    duration = work_order.completed_at - work_order.started_at
                    hours = Decimal(str(round(duration.total_seconds() / 3600, 2)))

                # Usar 1 hora como fallback se não tiver duração
                if hours == 0:
                    hours = Decimal("1.00")

                # Obter função do técnico (position field)
                role = getattr(work_order.assigned_to, "position", None) or "Técnico"

                TimeEntry.objects.create(
                    work_order=work_order,
                    technician=work_order.assigned_to,
                    role=role,
                    hours=hours,
                    work_date=(
                        work_order.completed_at.date()
                        if work_order.completed_at
                        else timezone.now().date()
                    ),
                    description=f"Mão de obra registrada automaticamente (OS {work_order.number})",
                    created_by=request.user,
                )
                created_entries.append(f"TimeEntry: {hours}h de {role}")
                logger.info(
                    f"TimeEntry criado: {hours}h de {role} para OS {work_order.number}"
                )
            except Exception as e:
                logger.error(f"Erro ao criar TimeEntry: {e}")
                logger.error(traceback.format_exc())

        # 2) Converter WorkOrderItem → PartUsage se não houver part_usages
        if not work_order.part_usages.exists():
            try:
                for item in work_order.items.select_related("inventory_item").all():
                    # Obter unit_cost do InventoryItem se disponível
                    unit_cost = None
                    if item.inventory_item and hasattr(
                        item.inventory_item, "unit_cost"
                    ):
                        unit_cost = item.inventory_item.unit_cost

                    part_usage = PartUsage.objects.create(
                        work_order=work_order,
                        inventory_item=item.inventory_item,
                        part_name=(
                            item.inventory_item.name
                            if item.inventory_item
                            else "Item desconhecido"
                        ),
                        part_number=(
                            item.inventory_item.code if item.inventory_item else ""
                        ),
                        quantity=item.quantity,
                        unit=item.inventory_item.unit if item.inventory_item else "UN",
                        unit_cost=unit_cost,
                        description=f"Material registrado automaticamente (OS {work_order.number})",
                        created_by=request.user,
                        source=PartUsage.Source.WORK_ORDER_ITEM,
                    )
                    created_entries.append(
                        f"PartUsage: {item.quantity} {part_usage.unit} de {part_usage.part_name}"
                        + (f" @ R$ {unit_cost}" if unit_cost else " (sem custo)")
                    )
                    logger.info(
                        f"PartUsage criado: {item.quantity}x {part_usage.part_name} para OS {work_order.number}"
                    )
            except Exception as e:
                logger.error(f"Erro ao criar PartUsage: {e}")
                logger.error(traceback.format_exc())

        # Montar dados do evento work_order.closed
        try:
            event_data = WorkOrderService._build_work_order_closed_payload(work_order)
        except Exception as e:
            logger.error(f"Erro ao construir event payload: {e}")
            logger.error(traceback.format_exc())
            return Response(
                {"error": f"Erro ao construir dados do evento: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            # Processar custos via Cost Engine
            result = CostEngineService.process_work_order_closed(
                event_data=event_data, tenant_id=connection.schema_name
            )

            logger.info(
                f'Custos processados para OS {work_order.number}: {result["transactions_created"]} transação(ões) criada(s)'
            )

            return Response(
                {
                    "success": True,
                    "work_order_id": work_order.id,
                    "work_order_number": work_order.number,
                    "auto_created_entries": created_entries,
                    **result,
                }
            )
        except Exception as e:
            logger.error(
                f"Erro ao processar custos da OS {work_order.number}: {str(e)}"
            )
            logger.error(traceback.format_exc())

            return Response(
                {
                    "error": f"Erro ao processar custos: {str(e)}",
                    "detail": traceback.format_exc() if settings.DEBUG else None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Retorna estatísticas das OS."""
        queryset = self.get_queryset()
        today = timezone.now().date()

        # Contagens por status
        status_counts = queryset.values("status").annotate(count=Count("id"))
        status_dict = {item["status"]: item["count"] for item in status_counts}

        # Contagens por tipo
        type_counts = queryset.values("type").annotate(count=Count("id"))
        type_dict = {item["type"].lower(): item["count"] for item in type_counts}

        # Contagens por prioridade
        priority_counts = queryset.values("priority").annotate(count=Count("id"))
        priority_dict = {
            item["priority"].lower(): item["count"] for item in priority_counts
        }

        # Atrasadas
        overdue_count = queryset.filter(
            status__in=[WorkOrder.Status.OPEN, WorkOrder.Status.IN_PROGRESS],
            scheduled_date__lt=today,
        ).count()

        stats = {
            "total": queryset.count(),
            "open": status_dict.get("OPEN", 0),
            "in_progress": status_dict.get("IN_PROGRESS", 0),
            "completed": status_dict.get("COMPLETED", 0),
            "overdue": overdue_count,
            "by_type": type_dict,
            "by_priority": priority_dict,
        }

        serializer = WorkOrderStatsSerializer(stats)
        return Response(serializer.data)


class RequestViewSet(ActionRolePermissionMixin, viewsets.ModelViewSet):
    """ViewSet para Solicitações."""

    queryset = Request.objects.select_related(
        "sector", "subsection", "asset", "requester"
    ).prefetch_related("items__inventory_item")
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "status": ["exact", "in"],
        "sector": ["exact"],
        "subsection": ["exact"],
        "asset": ["exact"],
        "requester": ["exact"],
    }
    search_fields = ["number", "note", "asset__tag"]
    ordering_fields = ["number", "status", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        location = self.request.query_params.get("location")
        created_from = self.request.query_params.get("created_from")
        created_to = self.request.query_params.get("created_to")

        if location:
            queryset = queryset.filter(
                Q(sector_id=location) | Q(subsection_id=location)
            )

        if created_from:
            parsed_date = parse_date(created_from)
            if parsed_date:
                queryset = queryset.filter(created_at__date__gte=parsed_date)

        if created_to:
            parsed_date = parse_date(created_to)
            if parsed_date:
                queryset = queryset.filter(created_at__date__lte=parsed_date)

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return RequestListSerializer
        return RequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = request.data.get("items") or []
        if items_data and not isinstance(items_data, list):
            return Response(
                {"items": "Formato invalido. Deve ser uma lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            req = serializer.save(requester=request.user)
            for item in items_data:
                item_serializer = RequestItemSerializer(data=item)
                item_serializer.is_valid(raise_exception=True)
                item_serializer.save(request=req)

        output_serializer = self.get_serializer(req)
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        """Override update para registrar histÓrico de status."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        old_status = instance.status

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        new_status = serializer.instance.status
        if new_status != old_status:
            status_history = list(serializer.instance.status_history or [])
            status_history.append(
                {
                    "from_status": old_status,
                    "to_status": new_status,
                    "changed_at": timezone.now().isoformat(),
                    "changed_by": request.user.id if request.user else None,
                    "changed_by_name": (
                        request.user.get_full_name() if request.user else None
                    ),
                }
            )
            serializer.instance.status_history = status_history
            serializer.instance.save(update_fields=["status_history", "updated_at"])

        return Response(self.get_serializer(serializer.instance).data)

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        """Converte solicitação em ordem de serviço."""
        req = self.get_object()

        if req.status == Request.Status.CONVERTED:
            return Response(
                {"error": "Solicitação já foi convertida"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if req.status == Request.Status.REJECTED:
            return Response(
                {"error": "Solicitação rejeitada não pode ser convertida"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ConvertToWorkOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verificar se a solicitação tem um ativo associado
        if not req.asset:
            return Response(
                {
                    "error": "Solicitação não possui ativo associado. Não é possível converter."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Criar OS com tipo REQUEST (fixo para solicitações convertidas)
        wo_data = serializer.validated_data
        work_order = WorkOrder.objects.create(
            asset=req.asset,
            type=WorkOrder.Type.REQUEST,
            priority=wo_data["priority"],
            scheduled_date=wo_data.get("scheduled_date"),
            assigned_to=wo_data.get("assigned_to"),
            description=wo_data.get("description") or req.note,
            request=req,
            created_by=request.user,
        )

        # Atualizar status da solicitação
        req.update_status(Request.Status.CONVERTED, request.user)

        return Response(
            {
                "request": RequestSerializer(req).data,
                "work_order_id": work_order.id,
                "work_order_number": work_order.number,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):
        """Adiciona item à solicitação."""
        req = self.get_object()

        serializer = RequestItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(request=req)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="items/(?P<item_id>[^/.]+)")
    def delete_item(self, request, pk=None, item_id=None):
        """Remove item de uma solicitação."""
        req = self.get_object()

        try:
            item = RequestItem.objects.get(id=item_id, request=req)
        except RequestItem.DoesNotExist:
            return Response(
                {"error": "Item nao encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def counts(self, request):
        """Retorna contagens por status."""
        queryset = self.get_queryset()

        counts = queryset.values("status").annotate(count=Count("id"))
        result = {item["status"].lower(): item["count"] for item in counts}

        # Garantir que todas as chaves existem
        for status_choice in Request.Status.choices:
            key = status_choice[0].lower()
            if key not in result:
                result[key] = 0

        return Response(result)


class MaintenancePlanViewSet(viewsets.ModelViewSet):
    """ViewSet para Planos de Manutenção."""

    queryset = MaintenancePlan.objects.prefetch_related("assets", "checklist_template")
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "is_active": ["exact"],
        "frequency": ["exact", "in"],
    }
    search_fields = ["name", "description"]
    ordering_fields = ["name", "next_execution", "created_at"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.action == "list":
            return MaintenancePlanListSerializer
        return MaintenancePlanSerializer

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        """Gera ordens de serviço para o plano."""
        plan = self.get_object()

        if not plan.is_active:
            return Response(
                {"error": "Plano inativo não pode gerar OS"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not plan.assets.exists():
            return Response(
                {"error": "Plano não possui ativos"}, status=status.HTTP_400_BAD_REQUEST
            )

        work_order_ids = plan.generate_work_orders(request.user)

        return Response(
            {
                "work_orders_created": len(work_order_ids),
                "work_order_ids": work_order_ids,
                "next_execution": (
                    plan.next_execution.isoformat() if plan.next_execution else None
                ),
            }
        )

    @action(detail=True, methods=["post"], url_path="assets")
    def add_asset(self, request, pk=None):
        """Adiciona ativo ao plano."""
        plan = self.get_object()
        asset_id = request.data.get("asset")

        if not asset_id:
            return Response(
                {"error": "ID do ativo é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan.assets.add(asset_id)
        return Response({"status": "ok"})

    @action(detail=True, methods=["delete"], url_path="assets/(?P<asset_id>[^/.]+)")
    def remove_asset(self, request, pk=None, asset_id=None):
        """Remove ativo do plano."""
        plan = self.get_object()
        plan.assets.remove(asset_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Retorna estatísticas dos planos."""
        queryset = self.get_queryset()

        # Contagens
        total = queryset.count()
        active = queryset.filter(is_active=True).count()
        inactive = total - active

        # Por frequência
        freq_counts = queryset.values("frequency").annotate(count=Count("id"))
        by_frequency = {
            item["frequency"].lower(): item["count"] for item in freq_counts
        }

        # Próximas execuções (top 5)
        next_executions = (
            queryset.filter(is_active=True, next_execution__isnull=False)
            .order_by("next_execution")[:5]
            .values("id", "name", "next_execution")
        )

        return Response(
            {
                "total": total,
                "active": active,
                "inactive": inactive,
                "by_frequency": by_frequency,
                "next_executions": [
                    {
                        "plan_id": item["id"],
                        "plan_name": item["name"],
                        "next_date": (
                            item["next_execution"].isoformat()
                            if item["next_execution"]
                            else None
                        ),
                    }
                    for item in next_executions
                ],
            }
        )


# ========================
# ViewSets de Procedimentos
# ========================


class ProcedureCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorias de procedimentos."""

    queryset = ProcedureCategory.objects.all()
    serializer_class = ProcedureCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Adiciona contagem de procedures
        queryset = queryset.annotate(procedures_count=Count("procedures"))
        return queryset


class ProcedureViewSet(viewsets.ModelViewSet):
    """ViewSet para procedimentos."""

    queryset = Procedure.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["category", "status", "file_type"]
    search_fields = ["title", "code", "description"]
    ordering_fields = ["title", "code", "created_at", "updated_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related("category", "created_by").annotate(
            versions_count=Count("versions")
        )
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return ProcedureListSerializer
        elif self.action == "retrieve":
            return ProcedureDetailSerializer
        elif self.action == "create":
            return ProcedureCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return ProcedureUpdateSerializer
        return ProcedureDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Aprova um procedimento (muda para ACTIVE)."""
        procedure = self.get_object()
        serializer = ProcedureApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["approved"]:
            procedure.status = "ACTIVE"
            procedure.is_active = True
            procedure.save()
            return Response(
                {"status": "approved", "message": "Procedimento aprovado com sucesso."}
            )
        else:
            procedure.status = "INACTIVE"
            procedure.is_active = False
            procedure.save()
            return Response(
                {
                    "status": "rejected",
                    "message": "Procedimento desativado.",
                    "reason": serializer.validated_data.get("rejection_reason", ""),
                }
            )

    @action(detail=True, methods=["post"])
    def submit_for_review(self, request, pk=None):
        """Envia procedimento para revisão."""
        procedure = self.get_object()

        if procedure.status not in ["DRAFT", "ARCHIVED"]:
            return Response(
                {
                    "error": "Apenas procedimentos em rascunho ou arquivados podem ser enviados para revisão."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        procedure.status = "REVIEW"
        procedure.save()

        return Response(
            {"status": "submitted", "message": "Procedimento enviado para revisão."}
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Arquiva um procedimento."""
        procedure = self.get_object()
        procedure.status = "ARCHIVED"
        procedure.save()

        return Response(
            {"status": "archived", "message": "Procedimento arquivado com sucesso."}
        )

    @action(detail=True, methods=["post"])
    def create_version(self, request, pk=None):
        """Cria uma nova versão do procedimento."""
        procedure = self.get_object()

        # Dados da nova versão
        changelog = request.data.get("changelog", "Nova versão")
        file = request.FILES.get("file")

        # Salva versão anterior
        ProcedureVersion.objects.create(
            procedure=procedure,
            version_number=procedure.version,
            file=procedure.file,
            file_type=procedure.file_type,
            changelog=changelog,
            created_by=request.user,
        )

        # Atualiza procedimento com novo arquivo se fornecido
        if file:
            procedure.file = file
            # Detecta tipo de arquivo
            if file.name.lower().endswith(".pdf"):
                procedure.file_type = "PDF"
            elif file.name.lower().endswith(".md"):
                procedure.file_type = "MARKDOWN"
            elif file.name.lower().endswith(".docx"):
                procedure.file_type = "DOCX"

        # Incrementa versão
        procedure.version += 1
        procedure.save()

        return Response(
            {
                "status": "created",
                "version": procedure.version,
                "message": f"Versão {procedure.version} criada com sucesso.",
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """Lista todas as versões do procedimento."""
        procedure = self.get_object()
        versions = procedure.versions.all().order_by("-version_number")
        serializer = ProcedureVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="versions/(?P<version_id>[^/.]+)/restore",
    )
    def restore_version(self, request, pk=None, version_id=None):
        """Restaura uma versão anterior do procedimento."""
        procedure = self.get_object()

        try:
            version = procedure.versions.get(id=version_id)
        except ProcedureVersion.DoesNotExist:
            return Response(
                {"error": "Versão não encontrada."}, status=status.HTTP_404_NOT_FOUND
            )

        # Atualiza procedimento com dados da versão
        procedure.file = version.file
        procedure.file_type = version.file_type
        procedure.save()

        return Response(
            {
                "status": "restored",
                "message": f"Procedimento restaurado para versão {version.version_number}.",
            }
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Retorna estatísticas dos procedimentos."""
        queryset = self.get_queryset()

        total = queryset.count()
        by_status = {
            "active": queryset.filter(status="ACTIVE").count(),
            "inactive": queryset.filter(status="INACTIVE").count(),
            "draft": queryset.filter(status="DRAFT").count(),
            "archived": queryset.filter(status="ARCHIVED").count(),
        }
        by_type = {
            "pdf": queryset.filter(file_type="PDF").count(),
            "markdown": queryset.filter(file_type="MARKDOWN").count(),
            "docx": queryset.filter(file_type="DOCX").count(),
        }

        # Por categoria
        category_counts = queryset.values("category__name").annotate(count=Count("id"))
        by_category = {
            item["category__name"]: item["count"]
            for item in category_counts
            if item["category__name"]
        }

        return Response(
            {
                "total": total,
                "by_status": by_status,
                "by_type": by_type,
                "by_category": by_category,
            }
        )


# ============================================
# COST COMPONENT VIEWSETS (CMMS-001)
# ============================================


class TimeEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para TimeEntry - Apontamento de Mão de Obra.

    Permite registrar horas trabalhadas por técnicos em uma OS.
    Suporta filtros por OS, técnico, data e função.
    """

    queryset = TimeEntry.objects.select_related(
        "work_order", "technician", "created_by"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "work_order": ["exact"],
        "work_order__number": ["exact", "icontains"],
        "technician": ["exact"],
        "role": ["exact", "icontains"],
        "role_code": ["exact"],
        "work_date": ["exact", "gte", "lte", "range"],
    }
    search_fields = ["role", "description", "work_order__number"]
    ordering_fields = ["work_date", "hours", "created_at"]
    ordering = ["-work_date", "-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return TimeEntryListSerializer
        return TimeEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por período
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)

        return queryset

    @action(detail=False, methods=["get"])
    def by_work_order(self, request):
        """Lista apontamentos agrupados por OS."""
        work_order_id = request.query_params.get("work_order_id")

        if not work_order_id:
            return Response(
                {"error": "work_order_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entries = self.get_queryset().filter(work_order_id=work_order_id)
        serializer = TimeEntrySerializer(entries, many=True)

        # Calcular totais
        total_hours = sum(e.hours for e in entries)
        total_cost = sum(e.total_cost or 0 for e in entries)

        return Response(
            {
                "entries": serializer.data,
                "summary": {
                    "count": entries.count(),
                    "total_hours": total_hours,
                    "total_cost": total_cost,
                },
            }
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Estatísticas de apontamentos de tempo."""
        queryset = self.get_queryset()

        from django.db.models import Sum

        totals = queryset.aggregate(total_hours=Sum("hours"), entries_count=Count("id"))

        # Por função
        by_role = (
            queryset.values("role")
            .annotate(hours=Sum("hours"), count=Count("id"))
            .order_by("-hours")[:10]
        )

        return Response(
            {
                "total_hours": totals["total_hours"] or 0,
                "entries_count": totals["entries_count"] or 0,
                "by_role": list(by_role),
            }
        )


class PartUsageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para PartUsage - Uso de Peças/Materiais.

    Permite registrar peças utilizadas em uma OS.
    Suporta link com inventário ou registro manual.
    """

    queryset = PartUsage.objects.select_related(
        "work_order", "inventory_item", "created_by"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "work_order": ["exact"],
        "work_order__number": ["exact", "icontains"],
        "inventory_item": ["exact"],
        "part_number": ["exact", "icontains"],
        "inventory_deducted": ["exact"],
    }
    search_fields = ["part_name", "part_number", "description", "work_order__number"]
    ordering_fields = ["quantity", "unit_cost", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PartUsageListSerializer
        return PartUsageSerializer

    @action(detail=False, methods=["get"])
    def by_work_order(self, request):
        """Lista peças usadas agrupadas por OS."""
        work_order_id = request.query_params.get("work_order_id")

        if not work_order_id:
            return Response(
                {"error": "work_order_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usages = self.get_queryset().filter(work_order_id=work_order_id)
        serializer = PartUsageSerializer(usages, many=True)

        # Calcular totais
        total_quantity = sum(u.quantity for u in usages)
        total_cost = sum(u.total_cost or 0 for u in usages)

        return Response(
            {
                "parts": serializer.data,
                "summary": {
                    "count": usages.count(),
                    "total_quantity": total_quantity,
                    "total_cost": total_cost,
                },
            }
        )

    @action(detail=True, methods=["post"])
    def deduct_inventory(self, request, pk=None):
        """
        Realiza baixa no inventario para este uso de peca.

        Apenas para pecas linkadas a item de inventario e
        que ainda nao tiveram baixa realizada.
        """
        part_usage = self.get_object()

        if not part_usage.inventory_item:
            return Response(
                {"error": "Esta peca nao esta linkada ao inventario."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if part_usage.inventory_deducted:
            return Response(
                {"error": "Baixa ja foi realizada para esta peca."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if part_usage.unit_cost is None:
            part_usage.unit_cost = part_usage.inventory_item.unit_cost

        try:
            with transaction.atomic():
                movement = InventoryMovement.objects.create(
                    item=part_usage.inventory_item,
                    type=InventoryMovement.MovementType.OUT,
                    reason=InventoryMovement.Reason.WORK_ORDER,
                    quantity=part_usage.quantity,
                    unit_cost=part_usage.unit_cost,
                    work_order=part_usage.work_order,
                    reference=f"OS {part_usage.work_order.number}",
                    performed_by=request.user,
                )

                part_usage.inventory_deducted = True
                part_usage.inventory_movement_id = movement.id
                part_usage.save(
                    update_fields=[
                        "inventory_deducted",
                        "inventory_movement_id",
                        "unit_cost",
                        "updated_at",
                    ]
                )
        except DjangoValidationError as exc:
            detail = exc.message_dict or {"error": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "status": "success",
                "message": "Baixa no inventario registrada com sucesso.",
            }
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Estatísticas de uso de peças."""
        queryset = self.get_queryset()

        from django.db.models import Sum

        totals = queryset.aggregate(
            total_quantity=Sum("quantity"), usages_count=Count("id")
        )

        # Top peças mais utilizadas
        top_parts = (
            queryset.values("part_name")
            .annotate(qty=Sum("quantity"), count=Count("id"))
            .order_by("-qty")[:10]
        )

        return Response(
            {
                "total_quantity": totals["total_quantity"] or 0,
                "usages_count": totals["usages_count"] or 0,
                "top_parts": list(top_parts),
            }
        )


class ExternalCostViewSet(viewsets.ModelViewSet):
    """
    ViewSet para ExternalCost - Custos Externos/Terceiros.

    Permite registrar custos de terceiros em uma OS.
    Suporta anexos de NF, relatórios e outros documentos.
    """

    queryset = ExternalCost.objects.select_related(
        "work_order", "created_by"
    ).prefetch_related("attachment_files")
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "work_order": ["exact"],
        "work_order__number": ["exact", "icontains"],
        "cost_type": ["exact", "in"],
        "supplier_name": ["exact", "icontains"],
        "invoice_date": ["exact", "gte", "lte", "range"],
    }
    search_fields = [
        "supplier_name",
        "description",
        "invoice_number",
        "work_order__number",
    ]
    ordering_fields = ["amount", "invoice_date", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ExternalCostListSerializer
        return ExternalCostSerializer

    @action(detail=False, methods=["get"])
    def by_work_order(self, request):
        """Lista custos externos agrupados por OS."""
        work_order_id = request.query_params.get("work_order_id")

        if not work_order_id:
            return Response(
                {"error": "work_order_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        costs = self.get_queryset().filter(work_order_id=work_order_id)
        serializer = ExternalCostSerializer(costs, many=True)

        # Calcular totais
        total_amount = sum(c.amount for c in costs)

        return Response(
            {
                "costs": serializer.data,
                "summary": {"count": costs.count(), "total_amount": total_amount},
            }
        )

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        """Upload de anexo para um custo externo."""
        external_cost = self.get_object()

        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "Arquivo é obrigatório."}, status=status.HTTP_400_BAD_REQUEST
            )

        file_type = request.data.get("file_type", "OTHER")
        file_name = request.data.get("file_name", file.name)
        description = request.data.get("description", "")

        attachment = ExternalCostAttachment.objects.create(
            external_cost=external_cost,
            file=file,
            file_type=file_type,
            file_name=file_name,
            description=description,
            uploaded_by=request.user,
        )

        serializer = ExternalCostAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def attachments(self, request, pk=None):
        """Lista anexos de um custo externo."""
        external_cost = self.get_object()
        attachments = external_cost.attachment_files.all()
        serializer = ExternalCostAttachmentSerializer(attachments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Estatísticas de custos externos."""
        queryset = self.get_queryset()

        from django.db.models import Sum

        totals = queryset.aggregate(total_amount=Sum("amount"), costs_count=Count("id"))

        # Por tipo de custo
        by_type = (
            queryset.values("cost_type")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        # Top fornecedores
        top_suppliers = (
            queryset.values("supplier_name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")[:10]
        )

        return Response(
            {
                "total_amount": totals["total_amount"] or 0,
                "costs_count": totals["costs_count"] or 0,
                "by_type": list(by_type),
                "top_suppliers": list(top_suppliers),
            }
        )


class ExternalCostAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet para ExternalCostAttachment."""

    queryset = ExternalCostAttachment.objects.select_related(
        "external_cost", "uploaded_by"
    )
    serializer_class = ExternalCostAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        "external_cost": ["exact"],
        "file_type": ["exact", "in"],
    }
    ordering = ["-uploaded_at"]


class WorkOrderCostSummaryViewSet(viewsets.ViewSet):
    """
    ViewSet para resumo de custos de uma OS.

    Endpoint somente-leitura que agrega todos os custos
    (mão de obra, peças, externos) de uma OS.
    """

    permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        """Retorna resumo de custos de uma OS específica."""
        from django.db.models import Sum

        try:
            work_order = WorkOrder.objects.get(pk=pk)
        except WorkOrder.DoesNotExist:
            return Response(
                {"error": "Ordem de Serviço não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Agregações de TimeEntry
        labor = work_order.time_entries.aggregate(
            count=Count("id"), total_hours=Sum("hours")
        )
        labor_entries = work_order.time_entries.all()
        labor_cost = sum(
            (e.hours * e.hourly_rate) if e.hourly_rate else 0 for e in labor_entries
        )

        # Agregações de PartUsage
        parts = work_order.part_usages.aggregate(
            count=Count("id"), total_quantity=Sum("quantity")
        )
        part_usages = work_order.part_usages.all()
        parts_cost = sum(
            (p.quantity * p.unit_cost) if p.unit_cost else 0 for p in part_usages
        )

        # Agregações de ExternalCost
        external = work_order.external_costs.aggregate(
            count=Count("id"), total_amount=Sum("amount")
        )

        # Grand total
        grand_total = labor_cost + parts_cost + (external["total_amount"] or 0)

        return Response(
            {
                "work_order_id": work_order.id,
                "work_order_number": work_order.number,
                "labor": {
                    "entries_count": labor["count"] or 0,
                    "total_hours": labor["total_hours"] or 0,
                    "total_cost": labor_cost,
                },
                "parts": {
                    "count": parts["count"] or 0,
                    "total_quantity": parts["total_quantity"] or 0,
                    "total_cost": parts_cost,
                },
                "external": {
                    "count": external["count"] or 0,
                    "total_cost": external["total_amount"] or 0,
                },
                "grand_total": grand_total,
            }
        )


class ReportsViewSet(viewsets.ViewSet):
    """
    ViewSet para geração de relatórios PMOC e outros relatórios do CMMS.

    Endpoints:
    - GET /cmms/reports/pmoc-monthly/ - Relatório PMOC mensal
    - GET /cmms/reports/pmoc-annual/ - Relatório PMOC anual
    - GET /cmms/reports/history/ - Histórico de relatórios gerados
    - GET /cmms/reports/history/{id}/ - Detalhes de um relatório gerado
    - DELETE /cmms/reports/history/{id}/ - Remove um relatório gerado
    """

    permission_classes = [IsAuthenticated, RoleBasedPermission]
    required_roles = ["owner", "admin", "operator", "technician"]

    def _save_generated_report(
        self,
        request,
        report_type: str,
        report_data: dict,
        month: int | None = None,
        year: int = None,
        filters: dict = None,
    ):
        """Salva um relatório gerado no banco de dados."""
        from .models import GeneratedReport

        # Monta nome do relatório
        month_names = [
            "",
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
        ]

        if report_type == "PMOC_MENSAL":
            name = f"Relatório PMOC - {month_names[month]} {year}"
        elif report_type == "PMOC_ANUAL":
            name = f"Relatório PMOC Anual - {year}"
        else:
            name = f"Relatório {report_type} - {year}"

        generated_report = GeneratedReport.objects.create(
            name=name,
            report_type=report_type,
            status=GeneratedReport.Status.COMPLETED,
            period_month=month,
            period_year=year,
            filters=filters or {},
            content=report_data,
            generated_by=request.user,
            completed_at=timezone.now(),
        )

        return generated_report

    @action(detail=False, methods=["get"], url_path="pmoc-monthly")
    def pmoc_monthly(self, request):
        """
        Gera relatório PMOC mensal.

        Query params:
        - month: Mês (1-12), default: mês atual
        - year: Ano, default: ano atual
        - site_id: ID do site (opcional)
        - company: Nome da empresa (opcional)
        """
        from .services import PMOCReportService

        # Parâmetros
        now = timezone.now()
        month = int(request.query_params.get("month", now.month))
        year = int(request.query_params.get("year", now.year))
        site_id = request.query_params.get("site_id")
        company = request.query_params.get("company")

        # Validação
        if not 1 <= month <= 12:
            return Response(
                {"error": "Mês deve estar entre 1 e 12"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if year < 2000 or year > 2100:
            return Response(
                {"error": "Ano inválido"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report = PMOCReportService.generate_monthly_report(
                month=month,
                year=year,
                site_id=site_id,
                company=company,
            )

            # Salva o relatório gerado
            self._save_generated_report(
                request=request,
                report_type="PMOC_MENSAL",
                report_data=report,
                month=month,
                year=year,
                filters={"site_id": site_id, "company": company},
            )

            return Response(report)
        except Exception as e:
            logger.exception("Erro ao gerar relatório PMOC mensal")
            return Response(
                {"error": f"Erro ao gerar relatório: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="pmoc-annual")
    def pmoc_annual(self, request):
        """
        Gera relatório PMOC anual.

        Query params:
        - year: Ano, default: ano atual
        - site_id: ID do site (opcional)
        - company: Nome da empresa (opcional)
        """
        from .services import PMOCReportService

        # Parâmetros
        now = timezone.now()
        year = int(request.query_params.get("year", now.year))
        site_id = request.query_params.get("site_id")
        company = request.query_params.get("company")

        # Validação
        if year < 2000 or year > 2100:
            return Response(
                {"error": "Ano inválido"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report = PMOCReportService.generate_annual_report(
                year=year,
                site_id=site_id,
                company=company,
            )

            # Salva o relatório gerado
            self._save_generated_report(
                request=request,
                report_type="PMOC_ANUAL",
                report_data=report,
                month=None,
                year=year,
                filters={"site_id": site_id, "company": company},
            )

            return Response(report)
        except Exception as e:
            logger.exception("Erro ao gerar relatório PMOC anual")
            return Response(
                {"error": f"Erro ao gerar relatório: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        """
        Lista histórico de relatórios gerados.

        Query params:
        - report_type: Filtrar por tipo (PMOC_MENSAL, PMOC_ANUAL, etc)
        - status: Filtrar por status (processing, completed, failed)
        - year: Filtrar por ano
        - page: Página (default: 1)
        - page_size: Tamanho da página (default: 20, max: 100)
        """
        from .models import GeneratedReport
        from .serializers import GeneratedReportListSerializer

        queryset = GeneratedReport.objects.all()

        # Filtros
        report_type = request.query_params.get("report_type")
        if report_type:
            queryset = queryset.filter(report_type=report_type)

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        year = request.query_params.get("year")
        if year:
            queryset = queryset.filter(period_year=int(year))

        # Paginação simples
        page = int(request.query_params.get("page", 1))
        page_size = min(int(request.query_params.get("page_size", 20)), 100)
        offset = (page - 1) * page_size

        total_count = queryset.count()
        reports = queryset[offset : offset + page_size]

        serializer = GeneratedReportListSerializer(reports, many=True)

        return Response(
            {
                "results": serializer.data,
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size,
            }
        )

    @action(detail=False, methods=["get"], url_path=r"history/(?P<report_id>[^/.]+)")
    def history_detail(self, request, report_id=None):
        """
        Retorna detalhes de um relatório gerado (inclui conteúdo completo).
        """
        from .models import GeneratedReport
        from .serializers import GeneratedReportDetailSerializer

        try:
            report = GeneratedReport.objects.get(id=report_id)
        except GeneratedReport.DoesNotExist:
            return Response(
                {"error": "Relatório não encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GeneratedReportDetailSerializer(report)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["delete"],
        url_path=r"history/(?P<report_id>[^/.]+)/delete",
    )
    def history_delete(self, request, report_id=None):
        """
        Remove um relatório gerado.
        """
        from .models import GeneratedReport

        try:
            report = GeneratedReport.objects.get(id=report_id)
        except GeneratedReport.DoesNotExist:
            return Response(
                {"error": "Relatório não encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
