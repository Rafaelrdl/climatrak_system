"""
Energy Cost Engine - Cálculo de Custos de Energia

Serviço responsável por:
1. Calcular custo diário de energia por ativo
2. Aplicar tarifas (ponta/fora ponta) + bandeiras
3. Criar CostTransactions no ledger (idempotente)

Regras de negócio:
- Leitura por ativo por dia
- Tarifa vigente na data da leitura
- idempotency_key: energy:{asset_id}:{date}

Referências:
- [ENG-001] Energia (tarifa + custo diário)
"""

import logging
from datetime import date, datetime, time
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, Optional

from django.db import transaction
from django.utils import timezone

from apps.core_events.services import EventPublisher

from .models import CostCenter, CostTransaction, EnergyReading, EnergyTariff

logger = logging.getLogger(__name__)


class EnergyCostEngineError(Exception):
    """Erro base do Energy Cost Engine."""

    pass


class EnergyCostEngine:
    """
    Serviço para cálculo de custos de energia.

    Processa leituras de energia e cria transações no ledger.
    """

    @classmethod
    def calculate_reading_cost(
        cls,
        reading: EnergyReading,
        tariff: Optional[EnergyTariff] = None,
    ) -> Decimal:
        """
        Calcula o custo de uma leitura de energia.

        Args:
            reading: Leitura de energia
            tariff: Tarifa a aplicar (se None, busca vigente)

        Returns:
            Custo calculado em reais

        Raises:
            EnergyCostEngineError: Se não encontrar tarifa vigente
        """
        # Buscar tarifa vigente se não fornecida
        if tariff is None:
            tariff = reading.tariff

        if tariff is None:
            raise EnergyCostEngineError(
                f"Tarifa não encontrada para leitura {reading.id}"
            )

        # Se temos consumo ponta e fora ponta separados
        if reading.kwh_peak > 0 or reading.kwh_off_peak > 0:
            # Custo ponta
            peak_rate = tariff.rate_peak + cls._get_flag_surcharge(
                tariff, reading.bandeira
            )
            peak_cost = reading.kwh_peak * peak_rate

            # Custo fora ponta
            off_peak_rate = tariff.rate_off_peak + cls._get_flag_surcharge(
                tariff, reading.bandeira
            )
            off_peak_cost = reading.kwh_off_peak * off_peak_rate

            total_cost = peak_cost + off_peak_cost
        else:
            # Usa consumo total com média ponderada (assume 70% fora ponta, 30% ponta)
            # Esta é uma estimativa quando não temos medição separada
            avg_rate = (
                Decimal("0.7") * tariff.rate_off_peak
                + Decimal("0.3") * tariff.rate_peak
            )
            surcharge = cls._get_flag_surcharge(tariff, reading.bandeira)
            total_rate = avg_rate + surcharge
            total_cost = reading.kwh_total * total_rate

        # Arredonda para 2 casas decimais
        return total_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @classmethod
    def _get_flag_surcharge(cls, tariff: EnergyTariff, bandeira: str) -> Decimal:
        """Retorna o acréscimo de bandeira tarifária."""
        surcharge_map = {
            "verde": tariff.flag_verde,
            "amarela": tariff.flag_amarela,
            "vermelha_1": tariff.flag_vermelha_1,
            "vermelha_2": tariff.flag_vermelha_2,
        }
        return surcharge_map.get(bandeira, Decimal("0"))

    @classmethod
    @transaction.atomic
    def process_reading(
        cls,
        reading: EnergyReading,
        tenant_id: str,
        user=None,
    ) -> Dict[str, Any]:
        """
        Processa uma leitura de energia e cria transação no ledger.

        Args:
            reading: Leitura de energia a processar
            tenant_id: ID do tenant
            user: Usuário que está processando (para auditoria)

        Returns:
            Dict com resultado:
            - success: bool
            - cost: Decimal (custo calculado)
            - transaction_id: UUID (ID da transação criada)
            - skipped: bool (se já existia)
        """
        result = {
            "success": False,
            "cost": Decimal("0.00"),
            "transaction_id": None,
            "skipped": False,
            "error": None,
        }

        # Idempotency key
        idempotency_key = (
            f"energy:{reading.asset_id}:{reading.reading_date.isoformat()}"
        )

        # Verifica se já existe
        existing = CostTransaction.objects.filter(
            idempotency_key=idempotency_key
        ).first()

        if existing:
            result["success"] = True
            result["skipped"] = True
            result["transaction_id"] = existing.id
            result["cost"] = existing.amount
            return result

        try:
            # Calcular custo
            calculated_cost = cls.calculate_reading_cost(reading)

            # Criar transação no ledger
            tx = CostTransaction.objects.create(
                idempotency_key=idempotency_key,
                transaction_type=CostTransaction.TransactionType.ENERGY,
                category=CostTransaction.Category.ENERGY,
                amount=calculated_cost,
                currency="BRL",
                occurred_at=timezone.make_aware(
                    datetime.combine(reading.reading_date, time.min)
                ),
                description=f"Energia - {reading.kwh_total} kWh - {reading.asset}",
                meta={
                    "kwh_total": float(reading.kwh_total),
                    "kwh_peak": float(reading.kwh_peak),
                    "kwh_off_peak": float(reading.kwh_off_peak),
                    "tariff_id": str(reading.tariff_id) if reading.tariff_id else None,
                    "bandeira": reading.bandeira,
                    "source": reading.source,
                    "energy_reading_id": str(reading.id),
                },
                cost_center=reading.cost_center,
                asset_id=reading.asset_id,
                created_by=user,
            )

            # Atualiza a leitura com o custo e transação
            reading.calculated_cost = calculated_cost
            reading.cost_transaction = tx
            reading.save(
                update_fields=["calculated_cost", "cost_transaction", "updated_at"]
            )

            # Publicar evento
            cls._publish_cost_event(tx, tenant_id)

            result["success"] = True
            result["cost"] = calculated_cost
            result["transaction_id"] = tx.id

        except Exception as e:
            logger.exception(f"Erro ao processar leitura de energia {reading.id}")
            result["error"] = str(e)
            raise

        return result

    @classmethod
    def _publish_cost_event(cls, tx: CostTransaction, tenant_id: str):
        """Publica evento cost.entry_posted na outbox."""
        EventPublisher.publish(
            tenant_id=tenant_id,
            event_name="cost.entry_posted",
            aggregate_type="cost_transaction",
            aggregate_id=tx.id,
            data={
                "transaction_id": str(tx.id),
                "transaction_type": tx.transaction_type,
                "category": tx.category,
                "amount": float(tx.amount),
                "occurred_at": tx.occurred_at.isoformat(),
                "cost_center_id": str(tx.cost_center_id),
                "asset_id": str(tx.asset_id) if tx.asset_id else None,
                "idempotency_key": tx.idempotency_key,
            },
            idempotency_key=f"cost:{tx.id}:posted",
        )

    @classmethod
    def process_daily_readings(
        cls,
        reading_date: date,
        cost_center: Optional[CostCenter] = None,
        tenant_id: str = None,
        user=None,
    ) -> Dict[str, Any]:
        """
        Processa todas as leituras de um dia.

        Args:
            reading_date: Data das leituras
            cost_center: Filtrar por centro de custo (opcional)
            tenant_id: ID do tenant
            user: Usuário que está processando

        Returns:
            Dict com resultado agregado:
            - processed: int
            - created: int
            - skipped: int
            - total_cost: Decimal
            - errors: list
        """
        result = {
            "processed": 0,
            "created": 0,
            "skipped": 0,
            "total_cost": Decimal("0.00"),
            "errors": [],
        }

        # Buscar leituras pendentes (sem cost_transaction)
        readings = EnergyReading.objects.filter(
            reading_date=reading_date,
            cost_transaction__isnull=True,
        )

        if cost_center:
            readings = readings.filter(cost_center=cost_center)

        for reading in readings:
            result["processed"] += 1
            try:
                res = cls.process_reading(reading, tenant_id, user)
                if res["skipped"]:
                    result["skipped"] += 1
                else:
                    result["created"] += 1
                result["total_cost"] += res["cost"]
            except Exception as e:
                result["errors"].append(
                    {
                        "reading_id": str(reading.id),
                        "error": str(e),
                    }
                )

        return result
