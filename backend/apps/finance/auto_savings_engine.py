"""
Auto Savings Engine - Cálculo Automático de Economias

Serviço responsável por:
1. Coletar dados do período "antes" de uma intervenção
2. Coletar dados do período "depois" de uma intervenção
3. Calcular economia automaticamente
4. Criar SavingsEvent no sistema

Fluxo típico:
1. Criar Baseline com status=COLLECTING_BEFORE
2. Engine coleta dados do período "antes"
3. Após intervenção, mudar para COLLECTING_AFTER
4. Engine coleta dados do período "depois"
5. Calcular economia e criar SavingsEvent

Referências:
- [SAV-001] Savings automático via baseline
"""

import logging
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, Optional

from django.db import transaction
from django.db.models import Avg, Count, Sum
from django.utils import timezone

from .models import Baseline, EnergyReading, EnergyTariff, SavingsEvent

logger = logging.getLogger(__name__)


class AutoSavingsEngineError(Exception):
    """Erro base do Auto Savings Engine."""

    pass


class AutoSavingsEngine:
    """
    Serviço para cálculo automático de economias via baseline.

    Compara métricas antes e depois de intervenções para calcular
    economia automaticamente.
    """

    # Dias mínimos para baseline confiável
    MIN_DAYS_FOR_BASELINE = 7

    @classmethod
    def collect_before_data(
        cls,
        baseline: Baseline,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Coleta e agrega dados do período "antes" para um baseline.

        Args:
            baseline: Baseline a processar
            end_date: Data de fim do período (default: hoje - 1)

        Returns:
            Dict com resultado:
            - success: bool
            - days: int
            - avg_value: Decimal
            - total_value: Decimal
            - data_points: int
        """
        result = {
            "success": False,
            "days": 0,
            "avg_value": None,
            "total_value": None,
            "data_points": 0,
            "error": None,
        }

        if end_date is None:
            end_date = date.today() - timedelta(days=1)

        try:
            if baseline.baseline_type == Baseline.BaselineType.ENERGY:
                result = cls._collect_energy_data(
                    baseline.asset_id,
                    baseline.before_start,
                    end_date,
                )

                # Atualizar baseline
                if result["success"]:
                    baseline.before_end = end_date
                    baseline.before_avg_value = result["avg_value"]
                    baseline.before_total_value = result["total_value"]
                    baseline.before_days = result["days"]
                    baseline.before_data_points = result["data_points"]
                    baseline.save(
                        update_fields=[
                            "before_end",
                            "before_avg_value",
                            "before_total_value",
                            "before_days",
                            "before_data_points",
                            "updated_at",
                        ]
                    )
            else:
                result[
                    "error"
                ] = f"Tipo de baseline '{baseline.baseline_type}' não suportado"

        except Exception as e:
            logger.exception(
                f"Erro ao coletar dados 'antes' para baseline {baseline.id}"
            )
            result["error"] = str(e)

        return result

    @classmethod
    def collect_after_data(
        cls,
        baseline: Baseline,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Coleta e agrega dados do período "depois" para um baseline.

        Args:
            baseline: Baseline a processar
            end_date: Data de fim do período (default: hoje - 1)

        Returns:
            Dict com resultado:
            - success: bool
            - days: int
            - avg_value: Decimal
            - total_value: Decimal
            - data_points: int
        """
        result = {
            "success": False,
            "days": 0,
            "avg_value": None,
            "total_value": None,
            "data_points": 0,
            "error": None,
        }

        if end_date is None:
            end_date = date.today() - timedelta(days=1)

        if not baseline.after_start:
            result["error"] = "Período 'depois' não iniciado (after_start vazio)"
            return result

        try:
            if baseline.baseline_type == Baseline.BaselineType.ENERGY:
                result = cls._collect_energy_data(
                    baseline.asset_id,
                    baseline.after_start,
                    end_date,
                )

                # Atualizar baseline
                if result["success"]:
                    baseline.after_end = end_date
                    baseline.after_avg_value = result["avg_value"]
                    baseline.after_total_value = result["total_value"]
                    baseline.after_days = result["days"]
                    baseline.after_data_points = result["data_points"]
                    baseline.save(
                        update_fields=[
                            "after_end",
                            "after_avg_value",
                            "after_total_value",
                            "after_days",
                            "after_data_points",
                            "updated_at",
                        ]
                    )
            else:
                result[
                    "error"
                ] = f"Tipo de baseline '{baseline.baseline_type}' não suportado"

        except Exception as e:
            logger.exception(
                f"Erro ao coletar dados 'depois' para baseline {baseline.id}"
            )
            result["error"] = str(e)

        return result

    @classmethod
    def _collect_energy_data(
        cls,
        asset_id: int,
        start_date: date,
        end_date: date,
    ) -> Dict[str, Any]:
        """
        Coleta dados de energia para um período.

        Returns:
            Dict com avg_value (kWh/dia), total_value, days, data_points
        """
        readings = EnergyReading.objects.filter(
            asset_id=asset_id,
            reading_date__gte=start_date,
            reading_date__lte=end_date,
        )

        aggregation = readings.aggregate(
            avg_kwh=Avg("kwh_total"),
            total_kwh=Sum("kwh_total"),
            count=Count("id"),
        )

        days = (end_date - start_date).days + 1

        # Arredondar para 4 casas decimais para caber no campo
        avg_value = None
        if aggregation["avg_kwh"]:
            avg_value = Decimal(str(aggregation["avg_kwh"])).quantize(Decimal("0.0001"))

        return {
            "success": aggregation["count"] > 0,
            "days": days,
            "avg_value": avg_value,
            "total_value": aggregation["total_kwh"] or Decimal("0"),
            "data_points": aggregation["count"] or 0,
        }

    @classmethod
    @transaction.atomic
    def calculate_savings(
        cls,
        baseline: Baseline,
        tariff: Optional[EnergyTariff] = None,
        tenant_id: str = None,
        user=None,
    ) -> Dict[str, Any]:
        """
        Calcula a economia com base nos dados before/after e cria SavingsEvent.

        Args:
            baseline: Baseline com dados before/after preenchidos
            tariff: Tarifa para calcular valor monetário (energia)
            tenant_id: ID do tenant
            user: Usuário para auditoria

        Returns:
            Dict com resultado:
            - success: bool
            - savings_value: Decimal (economia por período, ex: kWh/dia)
            - savings_percent: Decimal
            - savings_annual: Decimal (projeção anual em R$)
            - savings_event_id: UUID
        """
        result = {
            "success": False,
            "savings_value": None,
            "savings_percent": None,
            "savings_annual": None,
            "savings_event_id": None,
            "error": None,
        }

        # Validações
        if not baseline.before_avg_value:
            result["error"] = "Dados do período 'antes' não coletados"
            return result

        if not baseline.after_avg_value:
            result["error"] = "Dados do período 'depois' não coletados"
            return result

        if baseline.before_days < cls.MIN_DAYS_FOR_BASELINE:
            result[
                "error"
            ] = f"Período 'antes' insuficiente ({baseline.before_days} dias, mínimo {cls.MIN_DAYS_FOR_BASELINE})"
            return result

        if baseline.after_days < cls.MIN_DAYS_FOR_BASELINE:
            result[
                "error"
            ] = f"Período 'depois' insuficiente ({baseline.after_days} dias, mínimo {cls.MIN_DAYS_FOR_BASELINE})"
            return result

        try:
            # Calcular economia
            savings_value = baseline.before_avg_value - baseline.after_avg_value

            # Percentual
            savings_percent = Decimal("0")
            if baseline.before_avg_value > 0:
                savings_percent = (
                    (savings_value / baseline.before_avg_value) * 100
                ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            # Economia só existe se valor for positivo (redução)
            if savings_value <= 0:
                result["error"] = "Não houve economia (valor depois >= antes)"
                return result

            # Calcular valor monetário anual (para energia)
            savings_annual = Decimal("0")
            if baseline.baseline_type == Baseline.BaselineType.ENERGY:
                # Economia diária em kWh × tarifa média × 365 dias
                if tariff:
                    avg_rate = (tariff.rate_off_peak + tariff.rate_peak) / 2
                else:
                    # Usar uma tarifa média estimada se não fornecida
                    avg_rate = Decimal("0.80")  # R$ 0,80/kWh estimativa

                savings_annual = (savings_value * avg_rate * 365).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

            # Atualizar baseline
            baseline.savings_value = savings_value
            baseline.savings_percent = savings_percent
            baseline.savings_annual_estimate = savings_annual
            baseline.status = Baseline.Status.CALCULATED

            # Determinar tipo de evento
            event_type_map = {
                Baseline.BaselineType.ENERGY: SavingsEvent.EventType.ENERGY_SAVINGS,
                Baseline.BaselineType.MAINTENANCE: SavingsEvent.EventType.AVOIDED_FAILURE,
                Baseline.BaselineType.PERFORMANCE: SavingsEvent.EventType.OPTIMIZED_MAINTENANCE,
            }
            event_type = event_type_map.get(
                baseline.baseline_type, SavingsEvent.EventType.OTHER
            )

            # Criar SavingsEvent
            # calculation_details vai para 'evidence' como JSON
            evidence_data = {
                "auto_calculated": True,
                "baseline_id": str(baseline.id),
                "baseline_type": baseline.baseline_type,
                "before_avg": float(baseline.before_avg_value),
                "after_avg": float(baseline.after_avg_value),
                "savings_per_day": float(savings_value),
                "savings_percent": float(savings_percent),
                "before_days": baseline.before_days,
                "after_days": baseline.after_days,
                "unit": baseline.unit,
            }

            savings_event = SavingsEvent.objects.create(
                cost_center=baseline.cost_center,
                asset_id=baseline.asset_id,
                work_order=baseline.work_order,
                event_type=event_type,
                savings_amount=savings_annual,  # Valor anual estimado
                occurred_at=timezone.now(),
                description=f"Economia automática - {baseline.name}",
                calculation_method="baseline_comparison",
                confidence=SavingsEvent.Confidence.MEDIUM,  # Auto-calculado = confiança média
                evidence=evidence_data,
                created_by=user,
            )

            # Vincular ao baseline
            baseline.savings_event = savings_event
            baseline.save()

            result["success"] = True
            result["savings_value"] = savings_value
            result["savings_percent"] = savings_percent
            result["savings_annual"] = savings_annual
            result["savings_event_id"] = savings_event.id

        except Exception as e:
            logger.exception(f"Erro ao calcular economia para baseline {baseline.id}")
            result["error"] = str(e)
            raise

        return result

    @classmethod
    def process_pending_baselines(
        cls,
        tenant_id: str = None,
        user=None,
    ) -> Dict[str, Any]:
        """
        Processa baselines pendentes:
        - COLLECTING_BEFORE: coleta dados antes
        - COLLECTING_AFTER: coleta dados depois e calcula (se suficiente)

        Returns:
            Dict com resultado:
            - processed: int
            - before_collected: int
            - after_collected: int
            - calculated: int
            - errors: list
        """
        result = {
            "processed": 0,
            "before_collected": 0,
            "after_collected": 0,
            "calculated": 0,
            "errors": [],
        }

        # Processar baselines coletando "antes"
        collecting_before = Baseline.objects.filter(
            status=Baseline.Status.COLLECTING_BEFORE
        )

        for baseline in collecting_before:
            result["processed"] += 1
            try:
                res = cls.collect_before_data(baseline)
                if res["success"]:
                    result["before_collected"] += 1
            except Exception as e:
                result["errors"].append(
                    {
                        "baseline_id": str(baseline.id),
                        "phase": "before",
                        "error": str(e),
                    }
                )

        # Processar baselines coletando "depois"
        collecting_after = Baseline.objects.filter(
            status=Baseline.Status.COLLECTING_AFTER
        )

        for baseline in collecting_after:
            result["processed"] += 1
            try:
                res = cls.collect_after_data(baseline)
                if res["success"]:
                    result["after_collected"] += 1

                    # Verificar se já tem dados suficientes para calcular
                    if baseline.after_days >= cls.MIN_DAYS_FOR_BASELINE:
                        calc_res = cls.calculate_savings(
                            baseline, tenant_id=tenant_id, user=user
                        )
                        if calc_res["success"]:
                            result["calculated"] += 1
            except Exception as e:
                result["errors"].append(
                    {
                        "baseline_id": str(baseline.id),
                        "phase": "after",
                        "error": str(e),
                    }
                )

        return result

    @classmethod
    def start_intervention(
        cls,
        baseline: Baseline,
        intervention_date: Optional[date] = None,
    ) -> bool:
        """
        Marca o início da intervenção e finaliza período "antes".

        Args:
            baseline: Baseline a atualizar
            intervention_date: Data da intervenção (default: hoje)

        Returns:
            True se sucesso
        """
        if intervention_date is None:
            intervention_date = date.today()

        # Coletar dados finais do período antes
        cls.collect_before_data(
            baseline, end_date=intervention_date - timedelta(days=1)
        )

        baseline.intervention_date = intervention_date
        baseline.status = Baseline.Status.INTERVENTION
        baseline.save(update_fields=["intervention_date", "status", "updated_at"])

        return True

    @classmethod
    def start_after_collection(
        cls,
        baseline: Baseline,
        start_date: Optional[date] = None,
    ) -> bool:
        """
        Inicia a coleta de dados "depois" da intervenção.

        Chamado após período de estabilização pós-intervenção.

        Args:
            baseline: Baseline a atualizar
            start_date: Data de início (default: hoje)

        Returns:
            True se sucesso
        """
        if start_date is None:
            start_date = date.today()

        baseline.after_start = start_date
        baseline.status = Baseline.Status.COLLECTING_AFTER
        baseline.save(update_fields=["after_start", "status", "updated_at"])

        return True
