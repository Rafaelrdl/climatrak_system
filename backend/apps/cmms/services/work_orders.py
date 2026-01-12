"""
Services para CMMS - Work Order

Service layer para operações de negócio em WorkOrder.
Inclui publicação de eventos conforme padrão Transactional Outbox.

Referências:
- docs/events/02-eventos-mvp.md
- docs/finance/02-regras-negocio.md
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.core_events.services import EventPublisher


class WorkOrderService:
    """
    Service layer para operações de WorkOrder.

    Encapsula regras de negócio e publicação de eventos.
    """

    @classmethod
    def close_work_order(
        cls,
        work_order,
        execution_description: str = "",
        actual_hours: Optional[float] = None,
        tenant_id=None,
    ) -> Dict[str, Any]:
        """
        Fecha uma Ordem de Serviço e publica evento work_order.closed.

        Esta operação:
        1. Atualiza status para COMPLETED
        2. Registra timestamp de conclusão
        3. Publica evento work_order.closed na outbox (se tenant_id fornecido)

        O evento será consumido pelo Cost Engine para criar CostTransactions.

        Args:
            work_order: Instância de WorkOrder a ser fechada
            execution_description: Descrição da execução (opcional)
            actual_hours: Horas reais trabalhadas (opcional)
            tenant_id: ID do tenant (obrigatório para publicar evento)

        Returns:
            Dict com informações da operação:
            - success: bool
            - work_order_id: UUID
            - work_order_number: str
            - event_published: bool
            - event_id: UUID (se publicado)

        Raises:
            ValueError: Se OS não está em status válido para fechamento
        """
        from ..models import WorkOrder

        # Validar status
        if work_order.status == WorkOrder.Status.COMPLETED:
            raise ValueError("OS já está concluída.")
        if work_order.status == WorkOrder.Status.CANCELLED:
            raise ValueError("OS cancelada não pode ser concluída.")

        result = {
            "success": False,
            "work_order_id": work_order.id,
            "work_order_number": work_order.number,
            "event_published": False,
            "event_id": None,
        }

        with transaction.atomic():
            # Atualizar WorkOrder
            work_order.status = WorkOrder.Status.COMPLETED
            work_order.completed_at = timezone.now()

            if execution_description:
                work_order.execution_description = execution_description
            if actual_hours is not None:
                work_order.actual_hours = actual_hours

            work_order.save(
                update_fields=[
                    "status",
                    "completed_at",
                    "execution_description",
                    "actual_hours",
                    "updated_at",
                ]
            )

            # Publicar evento na outbox (se tenant_id fornecido)
            if tenant_id:
                event_data = cls._build_work_order_closed_payload(work_order)

                # Gerar idempotency_key determinística
                idempotency_key = f"wo:{work_order.id}:closed"

                event = EventPublisher.publish(
                    tenant_id=tenant_id,
                    event_name="work_order.closed",
                    aggregate_type="work_order",
                    aggregate_id=work_order.id,
                    data=event_data,
                    idempotency_key=idempotency_key,
                    occurred_at=work_order.completed_at,
                )

                result["event_published"] = True
                result["event_id"] = event.id

            result["success"] = True

        return result

    @classmethod
    def _build_work_order_closed_payload(cls, work_order) -> Dict[str, Any]:
        """
        Constrói o payload do evento work_order.closed.

        Formato conforme docs/events/02-eventos-mvp.md:
        {
            "work_order_id": "uuid",
            "asset_id": "uuid",
            "cost_center_id": "uuid",
            "category": "corrective",
            "labor": [
                { "role": "TecRefrigeracao", "hours": 2.5 }
            ],
            "parts": [
                { "part_id": "uuid", "qty": 1, "unit_cost": 320.00 }
            ],
            "third_party": [
                { "description": "Limpeza química", "amount": 600.00 }
            ]
        }
        """
        # Mapear tipo da OS para category
        type_to_category = {
            "PREVENTIVE": "preventive",
            "CORRECTIVE": "corrective",
            "EMERGENCY": "emergency",
            "REQUEST": "request",
        }
        category = type_to_category.get(work_order.type, "other")

        payload = {
            "work_order_id": str(work_order.id),
            "work_order_number": work_order.number,
            "asset_id": str(work_order.asset_id),
            "cost_center_id": (
                str(work_order.cost_center_id) if work_order.cost_center_id else None
            ),
            "category": category,
            "completed_at": (
                work_order.completed_at.isoformat() if work_order.completed_at else None
            ),
            "labor": cls._get_labor_entries(work_order),
            "parts": cls._get_parts_entries(work_order),
            "third_party": cls._get_third_party_entries(work_order),
        }

        return payload

    @classmethod
    def _get_labor_entries(cls, work_order) -> List[Dict[str, Any]]:
        """
        Obtém apontamentos de mão de obra da OS para o payload.

        Retorna lista de dicts com role, hours e hourly_rate.
        """
        entries = []

        for time_entry in work_order.time_entries.all():
            entry = {
                "time_entry_id": str(time_entry.id),
                "role": time_entry.role,
                "role_code": time_entry.role_code or None,
                "hours": float(time_entry.hours),
                "hourly_rate": (
                    float(time_entry.hourly_rate) if time_entry.hourly_rate else None
                ),
                "work_date": str(time_entry.work_date),
            }

            # Calcular custo se tiver rate
            if time_entry.hourly_rate:
                entry["total_cost"] = float(time_entry.hours * time_entry.hourly_rate)

            entries.append(entry)

        return entries

    @classmethod
    def _get_parts_entries(cls, work_order) -> List[Dict[str, Any]]:
        """
        Obtém uso de peças da OS para o payload.

        Retorna lista de dicts com part_id/part_name, qty e unit_cost.
        """
        entries = []

        for part_usage in work_order.part_usages.all():
            entry = {
                "part_usage_id": str(part_usage.id),
                "part_id": (
                    str(part_usage.inventory_item_id)
                    if part_usage.inventory_item_id
                    else None
                ),
                "part_number": part_usage.part_number or None,
                "part_name": part_usage.part_name or None,
                "qty": float(part_usage.quantity),
                "unit": part_usage.unit,
                "unit_cost": (
                    float(part_usage.unit_cost) if part_usage.unit_cost else None
                ),
            }

            # Calcular custo se tiver unit_cost
            if part_usage.unit_cost:
                entry["total_cost"] = float(part_usage.quantity * part_usage.unit_cost)

            entries.append(entry)

        return entries

    @classmethod
    def _get_third_party_entries(cls, work_order) -> List[Dict[str, Any]]:
        """
        Obtém custos externos/terceiros da OS para o payload.

        Retorna lista de dicts com description, amount e metadata.
        """
        entries = []

        for external_cost in work_order.external_costs.all():
            entry = {
                "external_cost_id": str(external_cost.id),
                "cost_type": external_cost.cost_type,
                "supplier_name": external_cost.supplier_name,
                "description": external_cost.description,
                "amount": float(external_cost.amount),
                "invoice_number": external_cost.invoice_number or None,
                "invoice_date": (
                    str(external_cost.invoice_date)
                    if external_cost.invoice_date
                    else None
                ),
            }
            entries.append(entry)

        return entries

    @classmethod
    def get_work_order_cost_summary(cls, work_order) -> Dict[str, Any]:
        """
        Calcula resumo de custos totais de uma OS.

        Returns:
            Dict com:
            - labor_hours: total de horas
            - labor_cost: custo total de mão de obra
            - parts_cost: custo total de peças
            - third_party_cost: custo total de terceiros
            - total_cost: soma de todos os custos
        """
        # Labor
        labor_data = work_order.time_entries.aggregate(total_hours=Sum("hours"))
        labor_hours = labor_data["total_hours"] or Decimal("0")

        labor_cost = Decimal("0")
        for entry in work_order.time_entries.all():
            if entry.hourly_rate:
                labor_cost += entry.hours * entry.hourly_rate

        # Parts
        parts_cost = Decimal("0")
        for usage in work_order.part_usages.all():
            if usage.unit_cost:
                parts_cost += usage.quantity * usage.unit_cost

        # Third party
        third_party_data = work_order.external_costs.aggregate(total=Sum("amount"))
        third_party_cost = third_party_data["total"] or Decimal("0")

        return {
            "labor_hours": float(labor_hours),
            "labor_cost": float(labor_cost),
            "parts_cost": float(parts_cost),
            "third_party_cost": float(third_party_cost),
            "total_cost": float(labor_cost + parts_cost + third_party_cost),
        }
