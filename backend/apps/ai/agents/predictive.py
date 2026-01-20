"""
Predictive Agent — Análise de risco preditivo por ativo.

Responsável por:
1. Coletar dados de telemetria (Reading) do ativo
2. Analisar alertas recentes (últimas 24h, 7d)
3. Verificar histórico de falhas (OS corretivas)
4. Calcular score de risco (0-100) via heurística
5. Sugerir criação de OS PREDITIVA quando score >= limiar

Output esperado:
{
    "agent_key": "predictive",
    "as_of": "2026-01-19T10:00:00-03:00",
    "asset": { "id": 123, "tag": "AHU-001" },
    "risk": {
        "score": 0-100,
        "level": "low|medium|high|critical",
        "drivers": ["..."]
    },
    "signals": {
        "alerts_last_24h": N,
        "alerts_last_7d": N,
        "telemetry": [...]
    },
    "recommended_work_order": { ... } | null,
    "llm_summary": null
}
"""

import json
import logging
from datetime import timedelta
from decimal import Decimal
from typing import Any, Optional

from django.db.models import Avg, Max, Min, Count, Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.assets.models import Asset
from apps.cmms.models import WorkOrder
from apps.alerts.models import Alert

from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent

logger = logging.getLogger(__name__)


def _safe_import_reading():
    """Import Reading model safely (may not exist in all tenants)."""
    try:
        from apps.ingest.models import Reading
        return Reading
    except ImportError:
        return None


@register_agent
class PredictiveAgent(BaseAgent):
    """
    Agente Preditivo: Análise de risco e sugestão de OS preditiva.

    Attributes:
        agent_key: "predictive"
        description: Análise de risco preditivo por ativo
        version: "1.0.0"
        require_llm: False (heurísticas por padrão)
    """

    agent_key = "predictive"
    description = "Análise de risco preditivo e sugestão de OS preditiva"
    version = "1.0.0"
    require_llm = False

    # Defaults
    DEFAULT_TELEMETRY_WINDOW_DAYS = 7
    DEFAULT_ALERT_WINDOW_24H = 1
    DEFAULT_ALERT_WINDOW_7D = 7
    DEFAULT_CORRECTIVE_LOOKBACK_DAYS = 90

    # Thresholds para score de risco
    RISK_THRESHOLD_LOW = 30
    RISK_THRESHOLD_MEDIUM = 50
    RISK_THRESHOLD_HIGH = 70
    RISK_THRESHOLD_CREATE_WO = 60  # Score mínimo para sugerir OS

    # Pesos para cálculo do score
    WEIGHT_ALERTS_24H = 15  # Por alerta nas últimas 24h
    WEIGHT_ALERTS_7D = 5    # Por alerta nos últimos 7d
    WEIGHT_CRITICAL_ALERT = 20  # Extra por alerta crítico
    WEIGHT_CORRECTIVE_RECENT = 8  # Por OS corretiva recente
    WEIGHT_TELEMETRY_ANOMALY = 10  # Por anomalia de telemetria

    def validate_input(self, input_data: dict[str, Any]) -> tuple[bool, str | None]:
        """
        Valida entrada: asset_id obrigatório.

        Args:
            input_data: Dados de entrada

        Returns:
            Tupla (is_valid, error_msg)
        """
        if not input_data:
            return False, "input_data não pode ser vazio"

        asset_id = input_data.get("asset_id")
        if not asset_id:
            return False, "asset_id é obrigatório"

        try:
            int(asset_id)
        except (ValueError, TypeError):
            return False, f"asset_id deve ser numérico, recebido: {asset_id}"

        return True, None

    def gather_context(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> dict[str, Any]:
        """
        Coleta dados de telemetria, alertas e histórico do ativo.

        Args:
            input_data: Parâmetros
            context: Contexto do agente

        Returns:
            Dicionário com dados coletados
        """
        asset_id = int(input_data.get("asset_id"))
        telemetry_window = int(
            input_data.get("telemetry_window_days", self.DEFAULT_TELEMETRY_WINDOW_DAYS)
        )
        corrective_lookback = int(
            input_data.get("corrective_lookback_days", self.DEFAULT_CORRECTIVE_LOOKBACK_DAYS)
        )

        now = timezone.now()
        telemetry_start = now - timedelta(days=telemetry_window)
        alert_24h_start = now - timedelta(hours=24)
        alert_7d_start = now - timedelta(days=7)
        corrective_start = now - timedelta(days=corrective_lookback)

        # Buscar ativo
        try:
            asset = Asset.objects.select_related("site").get(id=asset_id)
        except Asset.DoesNotExist:
            return {
                "error": f"Asset {asset_id} not found",
                "asset": None,
            }

        result = {
            "asset": {
                "id": asset.id,
                "tag": asset.tag,
                "name": asset.name or "",
                "asset_type": asset.asset_type,
                "site_id": asset.site_id,
                "site_name": asset.site.name if asset.site else None,
            },
            "telemetry_window_days": telemetry_window,
            "generated_at": now.isoformat(),
            "alerts": {},
            "telemetry": [],
            "work_orders": {},
        }

        # 1. Coletar alertas
        alerts_24h = Alert.objects.filter(
            asset_tag=asset.tag,
            triggered_at__gte=alert_24h_start,
        )
        alerts_7d = Alert.objects.filter(
            asset_tag=asset.tag,
            triggered_at__gte=alert_7d_start,
        )

        result["alerts"] = {
            "last_24h": {
                "total": alerts_24h.count(),
                "by_severity": dict(
                    alerts_24h.values("severity").annotate(count=Count("id")).values_list(
                        "severity", "count"
                    )
                ),
                "unresolved": alerts_24h.filter(resolved=False).count(),
            },
            "last_7d": {
                "total": alerts_7d.count(),
                "by_severity": dict(
                    alerts_7d.values("severity").annotate(count=Count("id")).values_list(
                        "severity", "count"
                    )
                ),
                "unresolved": alerts_7d.filter(resolved=False).count(),
            },
        }

        # 2. Coletar telemetria (se disponível)
        Reading = _safe_import_reading()
        if Reading:
            try:
                telemetry_data = (
                    Reading.objects.filter(
                        asset_tag=asset.tag,
                        ts__gte=telemetry_start,
                    )
                    .values("sensor_id")
                    .annotate(
                        avg_value=Avg("value"),
                        min_value=Min("value"),
                        max_value=Max("value"),
                        reading_count=Count("id"),
                    )
                )

                # Pegar último valor por sensor
                for sensor_data in telemetry_data:
                    sensor_id = sensor_data["sensor_id"]
                    last_reading = (
                        Reading.objects.filter(
                            asset_tag=asset.tag,
                            sensor_id=sensor_id,
                        )
                        .order_by("-ts")
                        .values("value", "ts")
                        .first()
                    )

                    result["telemetry"].append({
                        "sensor_id": sensor_id,
                        "avg": round(sensor_data["avg_value"], 2) if sensor_data["avg_value"] else None,
                        "min": round(sensor_data["min_value"], 2) if sensor_data["min_value"] else None,
                        "max": round(sensor_data["max_value"], 2) if sensor_data["max_value"] else None,
                        "last": round(last_reading["value"], 2) if last_reading else None,
                        "last_at": last_reading["ts"].isoformat() if last_reading else None,
                        "reading_count": sensor_data["reading_count"],
                    })
            except Exception as e:
                logger.warning(f"[PredictiveAgent] Error fetching telemetry: {e}")

        # 3. Coletar histórico de OS
        work_orders = WorkOrder.objects.filter(
            asset=asset,
            created_at__gte=corrective_start,
        )

        correctives = work_orders.filter(type=WorkOrder.Type.CORRECTIVE)
        open_wo = work_orders.filter(
            status__in=[WorkOrder.Status.OPEN, WorkOrder.Status.IN_PROGRESS]
        )

        result["work_orders"] = {
            "total_period": work_orders.count(),
            "corrective_count": correctives.count(),
            "open_count": open_wo.count(),
            "recent_correctives": list(
                correctives.order_by("-created_at").values(
                    "id", "number", "description", "priority", "created_at"
                )[:5]
            ),
        }

        return result

    def execute(self, input_data: dict[str, Any], context: AgentContext) -> AgentResult:
        """
        Executa análise preditiva.

        Args:
            input_data: Dados de entrada
            context: Contexto do agente

        Returns:
            AgentResult com score de risco e recomendação
        """
        import time

        start_time = time.time()

        # Validar input
        is_valid, error_msg = self.validate_input(input_data)
        if not is_valid:
            return AgentResult(
                success=False,
                data={},
                error=error_msg,
            )

        # Coletar contexto
        context_data = self.gather_context(input_data, context)

        # Verificar se ativo existe
        if context_data.get("error") or not context_data.get("asset"):
            return AgentResult(
                success=False,
                data={},
                error=context_data.get("error", "Asset not found"),
            )

        # Calcular score de risco
        risk_score, risk_drivers = self._calculate_risk_score(context_data)
        risk_level = self._get_risk_level(risk_score)

        # Preparar output
        output = {
            "agent_key": self.agent_key,
            "as_of": timezone.now().isoformat(),
            "asset": context_data["asset"],
            "risk": {
                "score": risk_score,
                "level": risk_level,
                "drivers": risk_drivers,
            },
            "signals": {
                "alerts_last_24h": context_data["alerts"]["last_24h"]["total"],
                "alerts_last_7d": context_data["alerts"]["last_7d"]["total"],
                "telemetry_window_days": context_data["telemetry_window_days"],
                "telemetry": context_data["telemetry"],
            },
            "recommended_work_order": None,
            "llm_summary": None,
        }

        # Sugerir OS preditiva se score >= limiar
        if risk_score >= self.RISK_THRESHOLD_CREATE_WO:
            output["recommended_work_order"] = self._build_wo_suggestion(
                context_data, risk_score, risk_level, risk_drivers
            )

        # Tentar resumo LLM
        output["llm_summary"] = self._try_llm_summary(context_data, risk_score, risk_drivers, context)

        execution_time_ms = int((time.time() - start_time) * 1000)

        return AgentResult(
            success=True,
            data=output,
            execution_time_ms=execution_time_ms,
        )

    def _calculate_risk_score(self, context_data: dict) -> tuple[int, list[str]]:
        """
        Calcula score de risco (0-100) baseado em heurísticas.

        Args:
            context_data: Dados coletados

        Returns:
            Tupla (score, list_of_drivers)
        """
        score = 0
        drivers = []

        alerts_24h = context_data["alerts"]["last_24h"]
        alerts_7d = context_data["alerts"]["last_7d"]
        work_orders = context_data["work_orders"]

        # 1. Alertas nas últimas 24h
        alerts_24h_count = alerts_24h["total"]
        if alerts_24h_count > 0:
            points = min(alerts_24h_count * self.WEIGHT_ALERTS_24H, 40)
            score += points
            drivers.append(f"{alerts_24h_count} alerta(s) nas últimas 24h (+{points})")

        # 2. Alertas críticos nas últimas 24h
        critical_24h = alerts_24h["by_severity"].get("CRITICAL", 0)
        if critical_24h > 0:
            points = min(critical_24h * self.WEIGHT_CRITICAL_ALERT, 30)
            score += points
            drivers.append(f"{critical_24h} alerta(s) crítico(s) 24h (+{points})")

        # 3. Alertas nos últimos 7d (peso menor)
        alerts_7d_count = alerts_7d["total"]
        if alerts_7d_count > alerts_24h_count:
            extra_7d = alerts_7d_count - alerts_24h_count
            points = min(extra_7d * self.WEIGHT_ALERTS_7D, 20)
            score += points
            drivers.append(f"+{extra_7d} alertas adicionais nos últimos 7d (+{points})")

        # 4. Alertas não resolvidos
        unresolved = alerts_24h["unresolved"]
        if unresolved > 0:
            points = min(unresolved * 5, 15)
            score += points
            drivers.append(f"{unresolved} alerta(s) não resolvido(s) (+{points})")

        # 5. OS corretivas recentes
        corrective_count = work_orders["corrective_count"]
        if corrective_count > 0:
            points = min(corrective_count * self.WEIGHT_CORRECTIVE_RECENT, 25)
            score += points
            drivers.append(f"{corrective_count} OS corretiva(s) recente(s) (+{points})")

        # 6. Anomalias de telemetria (delta alto entre last e avg)
        for sensor in context_data.get("telemetry", []):
            if sensor.get("avg") and sensor.get("last"):
                delta_pct = abs(sensor["last"] - sensor["avg"]) / max(abs(sensor["avg"]), 0.001) * 100
                if delta_pct > 30:  # Desvio > 30%
                    points = min(self.WEIGHT_TELEMETRY_ANOMALY, 10)
                    score += points
                    drivers.append(
                        f"Sensor {sensor['sensor_id']}: desvio {delta_pct:.1f}% (+{points})"
                    )
                    break  # Só conta uma vez

        # Limitar score a 100
        score = min(score, 100)

        return score, drivers

    def _get_risk_level(self, score: int) -> str:
        """Converte score em nível de risco."""
        if score >= self.RISK_THRESHOLD_HIGH:
            return "high"
        elif score >= self.RISK_THRESHOLD_MEDIUM:
            return "medium"
        elif score >= self.RISK_THRESHOLD_LOW:
            return "low"
        return "minimal"

    def _build_wo_suggestion(
        self, context_data: dict, score: int, level: str, drivers: list[str]
    ) -> dict:
        """
        Constrói sugestão de OS preditiva.

        Args:
            context_data: Dados do contexto
            score: Score de risco
            level: Nível de risco
            drivers: Lista de drivers

        Returns:
            Dicionário com sugestão de OS
        """
        asset = context_data["asset"]

        # Determinar prioridade baseada no nível
        priority_map = {
            "high": "HIGH",
            "medium": "MEDIUM",
            "low": "LOW",
            "minimal": "LOW",
        }
        priority = priority_map.get(level, "MEDIUM")

        # Construir descrição
        description_lines = [
            f"Inspeção preditiva baseada em análise de risco.",
            f"",
            f"Score de risco: {score}/100 ({level.upper()})",
            f"",
            f"Drivers identificados:",
        ]
        for driver in drivers[:5]:
            description_lines.append(f"- {driver}")

        if context_data["work_orders"]["recent_correctives"]:
            description_lines.append("")
            description_lines.append("OS corretivas recentes:")
            for wo in context_data["work_orders"]["recent_correctives"][:3]:
                wo_desc = wo.get("description", "")[:50]
                description_lines.append(f"- {wo['number']}: {wo_desc}")

        return {
            "should_create": True,
            "type": "PREDICTIVE",
            "priority": priority,
            "title": f"Inspeção preditiva - {asset['tag']} (Score: {score})",
            "description": "\n".join(description_lines),
            "asset_id": asset["id"],
            "asset_tag": asset["tag"],
        }

    def _try_llm_summary(
        self, context_data: dict, risk_score: int, drivers: list[str], context: AgentContext
    ) -> str | None:
        """Tenta gerar resumo via LLM."""
        try:
            from ..providers.factory import check_llm_health

            health = check_llm_health()
            if not health.get("healthy"):
                return None

            asset = context_data["asset"]
            prompt = f"""Analise o risco preditivo do ativo e gere um resumo executivo em português.

Ativo: {asset['tag']} ({asset['asset_type']})
Score de Risco: {risk_score}/100
Drivers: {', '.join(drivers[:3])}
Alertas 24h: {context_data['alerts']['last_24h']['total']}
OS Corretivas: {context_data['work_orders']['corrective_count']}

Gere um resumo conciso (máx 100 palavras) indicando:
1. Situação do ativo
2. Ação recomendada

Responda apenas com o texto do resumo."""

            response = self.call_llm(
                user_prompt=prompt,
                temperature=0.3,
                max_tokens=200,
                context=context,
            )

            if response.content:
                return response.content.strip()

        except Exception as e:
            logger.warning(f"[PredictiveAgent] LLM summary failed: {e}")

        return None
