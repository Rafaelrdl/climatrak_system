"""
Root Cause Analysis (RCA) Agent — Análise inteligente de alertas com IA.

Responsável por:
1. Coletar contexto do alerta (equipamento, telemetria, histórico CMMS)
2. Montar prompt para LLM
3. Retornar hipóteses estruturadas e ações recomendadas em JSON
"""

import json
import logging
import re
import uuid
from datetime import timedelta
from typing import Any, Optional

from django.db import connection
from django.utils import timezone

from apps.alerts.models import Alert, Rule
from apps.assets.models import Asset, Device, Sensor
from apps.cmms.models import WorkOrder
from apps.ingest.models import Reading

from ..providers.base import LLMMessage
from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent

logger = logging.getLogger(__name__)


@register_agent
class RootCauseAgent(BaseAgent):
    """
    Agente RCA: Análise inteligente de causa raiz para alertas.

    Attributes:
        agent_key: "root_cause"
        description: Análise de causa raiz usando LLM
        version: "1.0.0"
        require_llm: True (necessita LLM para análise)
    """

    agent_key = "root_cause"
    description = "Análise de causa raiz de alertas com IA"
    version = "1.0.0"
    require_llm = True

    def validate_input(self, input_data: dict[str, Any]) -> tuple[bool, str | None]:
        """
        Valida entrada obrigatória: alert_id.

        Args:
            input_data: Dados de entrada

        Returns:
            Tupla (is_valid, error_msg) - error_msg é None se válido
        """
        if not input_data:
            return False, "input_data não pode ser vazio"

        alert_id = input_data.get("alert_id")
        if not alert_id:
            return False, "alert_id obrigatório em input"

        # alert_id pode ser int ou string numérica
        try:
            int(alert_id)
        except (ValueError, TypeError):
            return False, f"alert_id deve ser numérico, recebido: {alert_id}"

        return True, None

    def gather_context(self, input_data: dict[str, Any], context: AgentContext) -> dict[str, Any]:
        """
        Coleta contexto para análise: alerta, telemetria, CMMS, sensores.

        Args:
            input_data: Contém alert_id + parâmetros (window_minutes, max_readings, etc)
            context: Contexto do agente

        Returns:
            Dicionário com contexto estruturado
        """
        alert_id = int(input_data.get("alert_id"))
        window_minutes = int(input_data.get("window_minutes", 120))
        max_readings = int(input_data.get("max_readings", 200))
        max_work_orders = int(input_data.get("max_work_orders", 10))

        # Buscar alerta com select_related para evitar N+1
        try:
            alert = Alert.objects.select_related("rule", "rule__equipment").get(pk=alert_id)
        except Alert.DoesNotExist:
            raise ValueError(f"Alert {alert_id} não encontrado")

        # Derivar Asset
        asset = None
        if alert.rule and hasattr(alert.rule, "equipment") and alert.rule.equipment:
            asset = alert.rule.equipment
        elif alert.asset_tag:
            asset = Asset.objects.filter(tag=alert.asset_tag).first()

        logger.debug(f"[RCA] gather_context: alert={alert.id}, asset_tag={alert.asset_tag}, asset={asset}")

        # Sensor primário
        primary_sensor = None
        if alert.parameter_key and asset:
            primary_sensor = Sensor.objects.filter(
                tag=alert.parameter_key, device__asset=asset
            ).first()
            logger.debug(f"[RCA] primary_sensor={primary_sensor}")

        # Telemetria recente
        logger.debug(f"[RCA] Chamando _gather_telemetry: window={window_minutes}min, max_readings={max_readings}")
        telemetry_context = self._gather_telemetry(
            alert, primary_sensor, window_minutes, max_readings
        )
        logger.debug(f"[RCA] telemetry_context keys: {list(telemetry_context.keys())}")

        # Sensores relacionados
        related_sensors = []
        if asset:
            related_sensors = self._gather_related_sensors(asset, alert.parameter_key)

        # CMMS
        logger.debug(f"[RCA] Chamando _gather_cmms_context: asset={asset}, max_wo={max_work_orders}")
        cmms_context = self._gather_cmms_context(asset, max_work_orders)
        logger.debug(f"[RCA] cmms_context: {len(cmms_context.get('recent_work_orders', []))} work orders")

        # Alertas correlatos
        correlated_alerts = self._gather_correlated_alerts(alert)

        # Mapear campos reais do Alert para payload do agente (fallback resiliente)
        # Model real: parameter_value, threshold, message
        # Payload esperado: current_value, threshold_value, description
        current_value = getattr(alert, "parameter_value", getattr(alert, "current_value", None))
        threshold_value = getattr(alert, "threshold", getattr(alert, "threshold_value", None))
        description = getattr(alert, "message", getattr(alert, "description", "")) or ""

        # Unit: buscar em ordem de preferência
        # 1. Sensor primário (mais específico)
        # 2. Rule (se existir)
        # 3. RuleParameter (primeiro parâmetro da regra)
        unit = None
        if primary_sensor and hasattr(primary_sensor, "unit"):
            unit = primary_sensor.unit
        elif alert.rule:
            unit = getattr(alert.rule, "unit", None)
            if not unit and hasattr(alert.rule, "parameters"):
                first_param = alert.rule.parameters.first()
                if first_param:
                    unit = getattr(first_param, "unit", None)

        return {
            "alert": {
                "id": alert.id,
                "severity": alert.severity,
                "asset_tag": alert.asset_tag,
                "parameter_key": alert.parameter_key,
                "current_value": current_value,
                "threshold_value": threshold_value,
                "unit": unit,
                "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
                "description": description,
            },
            "telemetry_summary": telemetry_context,
            "related_sensors": related_sensors,
            "cmms_context": cmms_context,
            "correlated_alerts": correlated_alerts,
            "asset": {"id": asset.id, "tag": asset.tag} if asset else None,
        }

    def build_user_prompt(self, input_data: dict[str, Any], context_data: dict[str, Any]) -> str:
        """
        Monta prompt para LLM com contexto e instrução de saída JSON.

        Args:
            input_data: Dados de entrada do usuário
            context_data: Contexto colhido

        Returns:
            Prompt formatado
        """
        alert = context_data["alert"]
        telemetry = context_data["telemetry_summary"]
        related_sensors = context_data["related_sensors"]
        cmms = context_data.get("cmms_context", {})
        correlated = context_data.get("correlated_alerts", {})
        
        # Limitar sensores relacionados para reduzir tamanho do prompt
        related_sensors_summary = []
        if related_sensors:
            for sensor in related_sensors[:3]:  # Máximo 3 sensores
                related_sensors_summary.append({
                    "tag": sensor.get("tag"),
                    "last_value": sensor.get("last_value"),
                    "unit": sensor.get("unit"),
                })
        
        # Limitar histórico CMMS
        cmms_summary = []
        recent_wos = cmms.get("recent_work_orders", [])
        if recent_wos:
            for wo in recent_wos[:2]:  # Máximo 2 OSs
                cmms_summary.append({
                    "id": wo.get("id"),
                    "title": wo.get("title", "")[:50],
                    "status": wo.get("status"),
                })

        prompt = f"""Análise de Causa Raiz - Alerta IoT/HVAC

ALERTA:
- Equipamento: {alert['asset_tag']}
- Parâmetro: {alert['parameter_key']} = {alert['current_value']} (limite: {alert['threshold_value']})
- Severidade: {alert['severity']}
- Acionado: {alert['triggered_at']}

TELEMETRIA ({telemetry.get('window_minutes', 60)} min):
- Mín/Máx/Média: {telemetry.get('primary_sensor', {}).get('min')}/{telemetry.get('primary_sensor', {}).get('max')}/{telemetry.get('primary_sensor', {}).get('avg')}
- Tendência: {telemetry.get('primary_sensor', {}).get('trend')}

SENSORES RELACIONADOS: {json.dumps(related_sensors_summary) if related_sensors_summary else "Nenhum"}

HISTÓRICO CMMS: {json.dumps(cmms_summary) if cmms_summary else "Nenhuma OS anterior"}

TAREFA: Analise e retorne JSON com:
- hypotheses: lista de 2-3 hipóteses (title, confidence 0-1, evidence[], recommended_actions[])
- immediate_actions: lista de ações imediatas
- recommended_work_order: sugestão de OS (priority, title, description)

Retorne APENAS JSON válido sem markdown fences."""
        return prompt

    def execute(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> AgentResult:
        """
        Executa análise via LLM e parseia resultado.

        Args:
            input_data: Dados de entrada
            context: Contexto de execução (tenant, user, etc.)

        Returns:
            AgentResult com dados/erro
        """
        try:
            logger.debug(f"[RCA] execute: input_data={input_data}")
            
            # Coletar contexto (telemetria, CMMS, etc.)
            logger.debug("[RCA] Chamando gather_context...")
            context_data = self.gather_context(input_data, context)
            logger.debug(f"[RCA] gather_context retornou: keys={list(context_data.keys())}")

            # Montar prompt
            logger.debug("[RCA] Chamando build_user_prompt...")
            user_prompt = self.build_user_prompt(input_data, context_data)
            logger.debug(f"[RCA] user_prompt length={len(user_prompt)} chars")

            # Chamar LLM via self.provider (lazy loading)
            logger.debug("[RCA] Chamando LLM provider.chat_sync...")
            response = self.provider.chat_sync(
                messages=[LLMMessage(role="user", content=user_prompt)],
                temperature=0.5,
            )
            logger.debug(f"[RCA] LLM response received, model={response.model}")

            # Extrair conteúdo
            content = response.content or ""

            # Remover fence de markdown se existir
            content = re.sub(r"```json\s*", "", content)
            content = re.sub(r"```\s*", "", content)
            content = content.strip()

            # Parser JSON
            try:
                output_data = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao parser JSON do LLM: {e}\nConteúdo: {content[:200]}")
                raise ValueError(f"LLM retornou JSON inválido: {str(e)}") from e

            # Validação mínima
            required_keys = {"schema_version", "hypotheses", "immediate_actions"}
            if not all(k in output_data for k in required_keys):
                missing = required_keys - set(output_data.keys())
                logger.warning(f"Output JSON faltando chaves: {missing}")

            # Sucesso
            return AgentResult(
                success=True,
                data=output_data,
                tokens_used=response.tokens_total if response.tokens_total else None,
                execution_time_ms=getattr(response, "execution_time_ms", None),
            )

        except Exception as e:
            logger.exception(f"Erro ao executar RootCauseAgent: {e}")
            return AgentResult(success=False, data={}, error=str(e))

    def _gather_telemetry(
        self, alert: Alert, primary_sensor: Optional[Sensor], window_minutes: int, max_readings: int
    ) -> dict[str, Any]:
        """
        Coleta telemetria (readings) do sensor primário.

        Args:
            alert: Objeto Alert
            primary_sensor: Sensor principal
            window_minutes: Janela de tempo em minutos
            max_readings: Máximo de leituras

        Returns:
            Dicionário com telemetria resumida
        """
        result = {
            "window_minutes": window_minutes,
            "primary_sensor": {},
        }

        if not alert.triggered_at or not alert.parameter_key:
            return result

        # Janela de tempo
        start_time = alert.triggered_at - timedelta(minutes=window_minutes)
        end_time = alert.triggered_at

        # Buscar readings (campo ts = timestamp)
        readings_qs = (
            Reading.objects.filter(
                asset_tag=alert.asset_tag,
                sensor_id=alert.parameter_key,
                ts__gte=start_time,
                ts__lte=end_time,
            )
            .order_by("ts")[: max_readings + 1]
        )
        # Converter para lista para evitar problemas com slice + .last()
        readings_list = list(readings_qs)

        if readings_list:
            values = [float(r.value) for r in readings_list if r.value is not None]
            if values:
                last_reading = readings_list[-1]
                result["primary_sensor"] = {
                    "sensor_id": alert.parameter_key,
                    "min": min(values),
                    "max": max(values),
                    "avg": sum(values) / len(values),
                    "trend": self._calculate_trend(readings_list),
                    "last_value": float(last_reading.value) if last_reading.value else None,
                    "readings_count": len(values),
                }

        return result

    def _calculate_trend(self, readings) -> str:
        """
        Calcula tendência simples (rising/falling/stable) comparando start vs end.

        Args:
            readings: QuerySet de readings ordenado por ts (timestamp)

        Returns:
            String: "rising", "falling", "stable", "unknown"
        """
        if len(readings) < 2:
            return "unknown"

        first_val = float(readings[0].value) if readings[0].value else None
        last_val = float(readings[-1].value) if readings[-1].value else None

        if first_val is None or last_val is None:
            return "unknown"

        diff = last_val - first_val
        threshold = abs(first_val) * 0.05  # 5% como threshold

        if abs(diff) < threshold:
            return "stable"
        elif diff > 0:
            return "rising"
        else:
            return "falling"

    def _gather_related_sensors(self, asset: Asset, exclude_key: str, limit: int = 5) -> list[dict]:
        """
        Busca sensores relacionados ao equipamento (últimas leituras).

        Args:
            asset: Asset para buscar sensores
            exclude_key: Tag de sensor para excluir
            limit: Limite de sensores

        Returns:
            Lista de dicionários com tag e último valor
        """
        result = []
        sensors = (
            Sensor.objects.filter(device__asset=asset)
            .exclude(tag=exclude_key)
            .values_list("tag", flat=True)[:limit]
        )

        for sensor_tag in sensors:
            reading = (
                Reading.objects.filter(asset_tag=asset.tag, sensor_id=sensor_tag)
                .order_by("-ts")
                .first()
            )
            if reading:
                result.append(
                    {
                        "sensor_id": sensor_tag,
                        "last_value": float(reading.value) if reading.value else None,
                        "ts": reading.ts.isoformat() if reading.ts else None,
                    }
                )

        return result

    def _gather_cmms_context(self, asset: Optional[Asset], max_work_orders: int) -> dict[str, Any]:
        """
        Coleta histórico CMMS (ordens de serviço recentes).

        Args:
            asset: Asset para buscar OS
            max_work_orders: Limite de OS

        Returns:
            Dicionário com contexto CMMS
        """
        result = {"recent_work_orders": []}

        if not asset:
            return result

        logger.debug(f"[RCA] _gather_cmms_context: buscando WOs para asset={asset.id if asset else None}")
        work_orders = (
            WorkOrder.objects.filter(asset=asset)
            .order_by("-created_at")[:max_work_orders]
            .values("id", "status", "type", "created_at", "description")
        )

        for wo in work_orders:
            result["recent_work_orders"].append(
                {
                    "id": wo["id"],
                    "status": wo["status"],
                    "type": wo["type"],
                    "created_at": wo["created_at"].isoformat() if wo["created_at"] else None,
                    "description": wo["description"],
                }
            )
        logger.debug(f"[RCA] _gather_cmms_context: encontrados {len(result['recent_work_orders'])} WOs")

        return result

    def _gather_correlated_alerts(self, alert: Alert) -> dict[str, Any]:
        """
        Busca alertas correlatos (mesmo equipamento, últimas severidades).

        Args:
            alert: Alerta para buscar correlatos

        Returns:
            Dicionário com contagem e severidades
        """
        result = {
            "same_asset_active_count": 0,
            "recent_severities": [],
        }

        if not alert.asset_tag:
            return result

        # Alertas do mesmo equipamento (recentes) - para lista de severidades
        correlated_qs = (
            Alert.objects.filter(asset_tag=alert.asset_tag)
            .exclude(pk=alert.pk)
            .order_by("-triggered_at")[:10]
            .values("severity", "triggered_at")
        )

        result["recent_severities"] = [
            {"severity": c["severity"], "triggered_at": c["triggered_at"].isoformat()}
            for c in correlated_qs
        ]
        
        # Contagem de alertas ativos (última hora) - query separada sem slice
        result["same_asset_active_count"] = (
            Alert.objects.filter(asset_tag=alert.asset_tag)
            .exclude(pk=alert.pk)
            .filter(triggered_at__gte=timezone.now() - timedelta(hours=1))
            .count()
        )

        return result
