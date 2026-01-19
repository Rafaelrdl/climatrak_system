"""
Preventive Agent — Análise de manutenção preventiva e recomendações.

Responsável por:
1. Analisar planos de manutenção preventiva (próximos vencimentos, vencidos)
2. Verificar backlog de ordens de serviço por ativo
3. Identificar padrões de OS corretivas que sugerem ajuste de frequência preventiva
4. Gerar recomendações:
   - Ajustar frequência de planos
   - Priorizar execução de planos vencidos
   - Sugerir novos planos baseado em recorrência corretiva

Output esperado:
{
    "agent_key": "preventive",
    "as_of": "2026-01-19",
    "asset": { "id": 123, "tag": "AHU-001" },
    "summary": {
        "open_work_orders": 2,
        "overdue_plans": 1,
        "due_next_days": 7
    },
    "recommendations": [...],
    "llm_summary": null
}
"""

import json
import logging
import re
from datetime import timedelta
from typing import Any, Optional

from django.db.models import Count, Q
from django.utils import timezone

from apps.assets.models import Asset
from apps.cmms.models import WorkOrder, MaintenancePlan

from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent

logger = logging.getLogger(__name__)


@register_agent
class PreventiveAgent(BaseAgent):
    """
    Agente de Manutenção Preventiva: Análise de planos e recomendações.

    Attributes:
        agent_key: "preventive"
        description: Análise de manutenção preventiva e recomendações
        version: "1.0.0"
        require_llm: False (heurísticas por padrão, LLM opcional para resumo)
    """

    agent_key = "preventive"
    description = "Análise de manutenção preventiva e recomendações de ajuste"
    version = "1.0.0"
    require_llm = False

    # Defaults
    DEFAULT_DUE_WINDOW_DAYS = 7
    DEFAULT_OVERDUE_WINDOW_DAYS = 30
    DEFAULT_CORRECTIVE_LOOKBACK_DAYS = 90

    def validate_input(self, input_data: dict[str, Any]) -> tuple[bool, str | None]:
        """
        Valida entrada: scope obrigatório, asset_id obrigatório para scope=asset.

        Args:
            input_data: Dados de entrada

        Returns:
            Tupla (is_valid, error_msg)
        """
        if not input_data:
            return False, "input_data não pode ser vazio"

        scope = input_data.get("scope", "asset")
        if scope not in ("asset", "site", "all"):
            return False, f"scope deve ser 'asset', 'site' ou 'all', recebido: {scope}"

        if scope == "asset":
            asset_id = input_data.get("asset_id")
            if not asset_id:
                return False, "asset_id obrigatório quando scope='asset'"
            try:
                int(asset_id)
            except (ValueError, TypeError):
                return False, f"asset_id deve ser numérico, recebido: {asset_id}"

        if scope == "site":
            site_id = input_data.get("site_id")
            if not site_id:
                return False, "site_id obrigatório quando scope='site'"

        return True, None

    def gather_context(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> dict[str, Any]:
        """
        Coleta dados de planos de manutenção, OS e ativos.

        Args:
            input_data: Parâmetros (scope, asset_id, etc.)
            context: Contexto do agente

        Returns:
            Dicionário com dados coletados
        """
        scope = input_data.get("scope", "asset")
        due_window_days = int(input_data.get("due_window_days", self.DEFAULT_DUE_WINDOW_DAYS))
        overdue_window_days = int(
            input_data.get("overdue_window_days", self.DEFAULT_OVERDUE_WINDOW_DAYS)
        )
        corrective_lookback = int(
            input_data.get("corrective_lookback_days", self.DEFAULT_CORRECTIVE_LOOKBACK_DAYS)
        )

        now = timezone.now()
        today = now.date()
        due_cutoff = today + timedelta(days=due_window_days)
        overdue_cutoff = today - timedelta(days=overdue_window_days)
        corrective_cutoff = now - timedelta(days=corrective_lookback)

        result = {
            "scope": scope,
            "due_window_days": due_window_days,
            "overdue_window_days": overdue_window_days,
            "corrective_lookback_days": corrective_lookback,
            "generated_at": now.isoformat(),
            "assets": [],
        }

        # Determinar ativos a analisar
        assets_qs = Asset.objects.all()
        if scope == "asset":
            asset_id = int(input_data.get("asset_id"))
            assets_qs = assets_qs.filter(id=asset_id)
        elif scope == "site":
            site_id = input_data.get("site_id")
            assets_qs = assets_qs.filter(site_id=site_id)

        # Coletar dados por ativo
        assets_data = []
        for asset in assets_qs.select_related("site")[:100]:  # Limitar para performance
            # Planos de manutenção do ativo
            plans = MaintenancePlan.objects.filter(
                assets=asset,
                is_active=True,
            ).values(
                "id", "name", "frequency", "next_execution", "last_execution"
            )

            plans_data = []
            overdue_count = 0
            due_soon_count = 0

            for plan in plans:
                next_exec = plan.get("next_execution")
                is_overdue = False
                is_due_soon = False

                if next_exec:
                    if next_exec < today:
                        is_overdue = True
                        overdue_count += 1
                    elif next_exec <= due_cutoff:
                        is_due_soon = True
                        due_soon_count += 1

                plans_data.append({
                    "id": plan["id"],
                    "name": plan["name"],
                    "frequency": plan["frequency"],
                    "next_execution": str(next_exec) if next_exec else None,
                    "last_execution": str(plan["last_execution"]) if plan["last_execution"] else None,
                    "is_overdue": is_overdue,
                    "is_due_soon": is_due_soon,
                })

            # OS abertas do ativo
            open_work_orders = WorkOrder.objects.filter(
                asset=asset,
                status__in=[WorkOrder.Status.OPEN, WorkOrder.Status.IN_PROGRESS],
            ).values("id", "number", "type", "priority", "scheduled_date", "description")

            open_wo_list = list(open_work_orders)

            # OS corretivas recentes (para detectar recorrência)
            recent_correctives = WorkOrder.objects.filter(
                asset=asset,
                type=WorkOrder.Type.CORRECTIVE,
                created_at__gte=corrective_cutoff,
            ).count()

            assets_data.append({
                "id": asset.id,
                "tag": asset.tag,
                "name": asset.name or "",
                "asset_type": asset.asset_type,
                "site_id": asset.site_id,
                "site_name": asset.site.name if asset.site else None,
                "maintenance_plans": plans_data,
                "open_work_orders": [
                    {
                        "id": wo["id"],
                        "number": wo["number"],
                        "type": wo["type"],
                        "priority": wo["priority"],
                        "scheduled_date": str(wo["scheduled_date"]) if wo["scheduled_date"] else None,
                        "description": wo["description"][:200] if wo["description"] else "",
                    }
                    for wo in open_wo_list
                ],
                "stats": {
                    "open_wo_count": len(open_wo_list),
                    "overdue_plans": overdue_count,
                    "due_soon_plans": due_soon_count,
                    "recent_correctives": recent_correctives,
                },
            })

        result["assets"] = assets_data
        return result

    def execute(self, input_data: dict[str, Any], context: AgentContext) -> AgentResult:
        """
        Executa análise preventiva.

        Args:
            input_data: Dados de entrada
            context: Contexto do agente

        Returns:
            AgentResult com recomendações preventivas
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

        # Gerar recomendações por ativo
        all_recommendations = []
        assets_summary = []

        for asset_data in context_data["assets"]:
            recommendations = self._generate_recommendations(asset_data)
            all_recommendations.extend(recommendations)

            assets_summary.append({
                "id": asset_data["id"],
                "tag": asset_data["tag"],
                "summary": asset_data["stats"],
            })

        # Preparar output
        scope = input_data.get("scope", "asset")
        output = {
            "agent_key": self.agent_key,
            "as_of": timezone.now().date().isoformat(),
            "scope": scope,
            "summary": {
                "assets_analyzed": len(context_data["assets"]),
                "total_open_work_orders": sum(
                    a["stats"]["open_wo_count"] for a in context_data["assets"]
                ),
                "total_overdue_plans": sum(
                    a["stats"]["overdue_plans"] for a in context_data["assets"]
                ),
                "total_due_soon_plans": sum(
                    a["stats"]["due_soon_plans"] for a in context_data["assets"]
                ),
            },
            "recommendations": all_recommendations[:20],  # Limitar
            "assets": assets_summary,
            "llm_summary": None,
        }

        # Se scope=asset e há apenas 1 ativo, adicionar info do ativo no output
        if scope == "asset" and len(context_data["assets"]) == 1:
            asset = context_data["assets"][0]
            output["asset"] = {
                "id": asset["id"],
                "tag": asset["tag"],
            }

        # Tentar gerar resumo LLM se disponível
        if all_recommendations:
            output["llm_summary"] = self._try_llm_summary(context_data, all_recommendations)

        execution_time_ms = int((time.time() - start_time) * 1000)

        return AgentResult(
            success=True,
            data=output,
            execution_time_ms=execution_time_ms,
        )

    def _generate_recommendations(self, asset_data: dict) -> list[dict]:
        """
        Gera recomendações para um ativo específico.

        Args:
            asset_data: Dados do ativo

        Returns:
            Lista de recomendações
        """
        recommendations = []
        stats = asset_data["stats"]

        # 1. Planos vencidos
        for plan in asset_data["maintenance_plans"]:
            if plan["is_overdue"]:
                recommendations.append({
                    "type": "execute_overdue_plan",
                    "priority": "high",
                    "asset_id": asset_data["id"],
                    "asset_tag": asset_data["tag"],
                    "title": f"Executar plano vencido: {plan['name']}",
                    "rationale": [
                        f"Plano '{plan['name']}' está vencido",
                        f"Próxima execução era: {plan['next_execution']}",
                        "Atraso aumenta risco de falha",
                    ],
                    "plan_id": plan["id"],
                    "plan_name": plan["name"],
                    "confidence": 0.9,
                })

        # 2. Planos próximos do vencimento
        for plan in asset_data["maintenance_plans"]:
            if plan["is_due_soon"] and not plan["is_overdue"]:
                recommendations.append({
                    "type": "schedule_due_plan",
                    "priority": "medium",
                    "asset_id": asset_data["id"],
                    "asset_tag": asset_data["tag"],
                    "title": f"Agendar execução: {plan['name']}",
                    "rationale": [
                        f"Plano '{plan['name']}' vence em breve",
                        f"Data prevista: {plan['next_execution']}",
                    ],
                    "plan_id": plan["id"],
                    "plan_name": plan["name"],
                    "confidence": 0.8,
                })

        # 3. Muitas OS corretivas recentes → sugerir ajuste de frequência
        if stats["recent_correctives"] >= 3:
            # Verificar se há plano preventivo ativo
            has_active_plan = len(asset_data["maintenance_plans"]) > 0
            
            if has_active_plan:
                recommendations.append({
                    "type": "plan_adjustment",
                    "priority": "medium",
                    "asset_id": asset_data["id"],
                    "asset_tag": asset_data["tag"],
                    "title": f"Revisar frequência preventiva de {asset_data['tag']}",
                    "rationale": [
                        f"{stats['recent_correctives']} OS corretivas nos últimos 90 dias",
                        "Alta recorrência sugere que frequência preventiva é insuficiente",
                        "Considerar aumentar frequência ou revisar escopo das preventivas",
                    ],
                    "corrective_count": stats["recent_correctives"],
                    "confidence": 0.65,
                })
            else:
                recommendations.append({
                    "type": "create_plan",
                    "priority": "high",
                    "asset_id": asset_data["id"],
                    "asset_tag": asset_data["tag"],
                    "title": f"Criar plano preventivo para {asset_data['tag']}",
                    "rationale": [
                        f"{stats['recent_correctives']} OS corretivas nos últimos 90 dias",
                        "Ativo não possui plano preventivo ativo",
                        "Plano preventivo reduziria intervenções corretivas",
                    ],
                    "corrective_count": stats["recent_correctives"],
                    "confidence": 0.75,
                })

        # 4. Backlog alto de OS abertas
        if stats["open_wo_count"] >= 3:
            recommendations.append({
                "type": "reduce_backlog",
                "priority": "medium",
                "asset_id": asset_data["id"],
                "asset_tag": asset_data["tag"],
                "title": f"Reduzir backlog de {asset_data['tag']}",
                "rationale": [
                    f"{stats['open_wo_count']} ordens de serviço abertas",
                    "Backlog elevado pode indicar problemas sistêmicos",
                ],
                "open_wo_count": stats["open_wo_count"],
                "confidence": 0.6,
            })

        return recommendations

    def _try_llm_summary(
        self, context_data: dict, recommendations: list[dict]
    ) -> str | None:
        """
        Tenta gerar resumo executivo via LLM.

        Args:
            context_data: Dados do contexto coletado
            recommendations: Lista de recomendações geradas

        Returns:
            String com resumo ou None se LLM indisponível
        """
        try:
            from ..providers.factory import check_llm_health

            health = check_llm_health()
            if not health.get("healthy"):
                return None

            # Construir prompt
            prompt = f"""Analise os dados de manutenção preventiva e gere um resumo executivo em português.

Ativos analisados: {len(context_data['assets'])}
Recomendações geradas: {len(recommendations)}

Principais recomendações:
{json.dumps(recommendations[:5], ensure_ascii=False, indent=2)}

Gere um resumo conciso (máx 150 palavras) destacando:
1. Situação geral da manutenção preventiva
2. Prioridades imediatas
3. Ações recomendadas

Responda apenas com o texto do resumo, sem JSON."""

            response = self.call_llm(
                user_prompt=prompt,
                temperature=0.3,
                max_tokens=300,
            )

            if response.success:
                return response.content.strip()

        except Exception as e:
            logger.warning(f"[PreventiveAgent] LLM summary failed: {e}")

        return None
