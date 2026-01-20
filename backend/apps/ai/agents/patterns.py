"""
Patterns Agent — Identificação de padrões recorrentes de manutenção.

Responsável por:
1. Identificar falhas repetidas (OS corretivas com mesma causa/descrição)
2. Analisar itens mais consumidos (peças/materiais via PartUsage)
3. Calcular custos de manutenção (peças + mão de obra)
4. Detectar recorrência por ativo/site

Output esperado:
{
    "agent_key": "patterns",
    "as_of": "2026-01-19",
    "window_days": 30,
    "scope": { "type": "asset", "id": 123 },
    "kpis": {
        "work_orders_total": 12,
        "corrective": 7,
        "preventive": 5
    },
    "top_parts": [...],
    "patterns": [...],
    "llm_summary": null
}
"""

import json
import logging
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
from typing import Any, Optional

from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from apps.assets.models import Asset
from apps.cmms.models import WorkOrder, PartUsage

from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent

logger = logging.getLogger(__name__)


def _safe_import_time_entry():
    """Import TimeEntry model safely."""
    try:
        from apps.cmms.models import TimeEntry
        return TimeEntry
    except ImportError:
        return None


def _safe_import_labor_cost():
    """Import LaborCost model safely."""
    try:
        from apps.cmms.models import LaborCost
        return LaborCost
    except ImportError:
        return None


@register_agent
class PatternsAgent(BaseAgent):
    """
    Agente de Padrões: Identificação de recorrências e análise de consumo.

    Attributes:
        agent_key: "patterns"
        description: Identificação de padrões recorrentes de manutenção
        version: "1.0.0"
        require_llm: False (heurísticas por padrão)
    """

    agent_key = "patterns"
    description = "Identificação de padrões recorrentes e análise de consumo"
    version = "1.0.0"
    require_llm = False

    # Defaults
    DEFAULT_WINDOW_DAYS = 30
    DEFAULT_TOP_N = 10
    MIN_RECURRENCE_COUNT = 2  # Mínimo para considerar recorrência

    def validate_input(self, input_data: dict[str, Any]) -> tuple[bool, str | None]:
        """
        Valida entrada: scope obrigatório.

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
        Coleta dados de OS, peças e custos.

        Args:
            input_data: Parâmetros
            context: Contexto do agente

        Returns:
            Dicionário com dados coletados
        """
        scope = input_data.get("scope", "asset")
        window_days = int(input_data.get("window_days", self.DEFAULT_WINDOW_DAYS))
        top_n = int(input_data.get("top_n", self.DEFAULT_TOP_N))

        now = timezone.now()
        window_start = now - timedelta(days=window_days)

        result = {
            "scope": scope,
            "window_days": window_days,
            "top_n": top_n,
            "window_start": window_start.isoformat(),
            "generated_at": now.isoformat(),
            "scope_info": {},
            "work_orders": [],
            "parts_usage": [],
            "labor": [],
        }

        # Determinar filtro de scope
        wo_filter = Q(created_at__gte=window_start)

        if scope == "asset":
            asset_id = int(input_data.get("asset_id"))
            try:
                asset = Asset.objects.select_related("site").get(id=asset_id)
                result["scope_info"] = {
                    "type": "asset",
                    "id": asset.id,
                    "tag": asset.tag,
                    "name": asset.name,
                    "site_id": asset.site_id,
                    "site_name": asset.site.name if asset.site else None,
                }
                wo_filter &= Q(asset_id=asset_id)
            except Asset.DoesNotExist:
                result["error"] = f"Asset {asset_id} not found"
                return result

        elif scope == "site":
            site_id = input_data.get("site_id")
            result["scope_info"] = {
                "type": "site",
                "id": site_id,
            }
            wo_filter &= Q(asset__site_id=site_id)

        else:  # scope == "all"
            result["scope_info"] = {"type": "all"}

        # 1. Coletar OS no período
        work_orders = WorkOrder.objects.filter(wo_filter).select_related("asset")

        result["work_orders_summary"] = {
            "total": work_orders.count(),
            "by_type": dict(
                work_orders.values("type").annotate(count=Count("id")).values_list("type", "count")
            ),
            "by_status": dict(
                work_orders.values("status").annotate(count=Count("id")).values_list("status", "count")
            ),
        }

        # Detalhes das OS para análise de padrões
        wo_list = list(
            work_orders.values(
                "id", "number", "type", "status", "priority",
                "description", "asset_id", "asset__tag", "created_at"
            )[:500]  # Limitar para performance
        )
        result["work_orders"] = [
            {
                "id": wo["id"],
                "number": wo["number"],
                "type": wo["type"],
                "status": wo["status"],
                "priority": wo["priority"],
                "description": wo["description"][:200] if wo["description"] else "",
                "asset_id": wo["asset_id"],
                "asset_tag": wo["asset__tag"],
                "created_at": wo["created_at"].isoformat() if wo["created_at"] else None,
            }
            for wo in wo_list
        ]

        # 2. Coletar uso de peças
        wo_ids = [wo["id"] for wo in wo_list]
        if wo_ids:
            parts = (
                PartUsage.objects.filter(work_order_id__in=wo_ids)
                .values("inventory_item_id", "inventory_item__name", "inventory_item__code")
                .annotate(
                    total_qty=Sum("quantity"),
                    total_cost=Sum(F("quantity") * F("unit_cost")),
                    usage_count=Count("id"),
                )
                .order_by("-total_qty")[:top_n]
            )

            result["parts_usage"] = [
                {
                    "item_id": p["inventory_item_id"],
                    "name": p["inventory_item__name"] or "Manual",
                    "code": p["inventory_item__code"] or "",
                    "total_qty": float(p["total_qty"]) if p["total_qty"] else 0,
                    "estimated_cost": float(p["total_cost"]) if p["total_cost"] else 0,
                    "usage_count": p["usage_count"],
                }
                for p in parts
            ]

        # 3. Tentar coletar custos de mão de obra
        LaborCost = _safe_import_labor_cost()
        if LaborCost and wo_ids:
            try:
                labor = LaborCost.objects.filter(work_order_id__in=wo_ids).aggregate(
                    total_hours=Sum("hours"),
                    total_cost=Sum(F("hours") * F("hourly_rate")),
                )
                result["labor"] = {
                    "total_hours": float(labor["total_hours"]) if labor["total_hours"] else 0,
                    "total_cost": float(labor["total_cost"]) if labor["total_cost"] else 0,
                }
            except Exception as e:
                logger.debug(f"[PatternsAgent] LaborCost query failed: {e}")

        return result

    def execute(self, input_data: dict[str, Any], context: AgentContext) -> AgentResult:
        """
        Executa análise de padrões.

        Args:
            input_data: Dados de entrada
            context: Contexto do agente

        Returns:
            AgentResult com padrões identificados
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

        if context_data.get("error"):
            return AgentResult(
                success=False,
                data={},
                error=context_data["error"],
            )

        # Identificar padrões
        patterns = self._identify_patterns(context_data)

        # Preparar output
        output = {
            "agent_key": self.agent_key,
            "as_of": timezone.now().date().isoformat(),
            "window_days": context_data["window_days"],
            "scope": context_data["scope_info"],
            "kpis": {
                "work_orders_total": context_data["work_orders_summary"]["total"],
                "corrective": context_data["work_orders_summary"]["by_type"].get("CORRECTIVE", 0),
                "preventive": context_data["work_orders_summary"]["by_type"].get("PREVENTIVE", 0),
                "predictive": context_data["work_orders_summary"]["by_type"].get("PREDICTIVE", 0),
            },
            "top_parts": context_data["parts_usage"][:10],
            "labor_summary": context_data.get("labor", {}),
            "patterns": patterns[:15],
            "llm_summary": None,
        }

        # Tentar resumo LLM
        output["llm_summary"] = self._try_llm_summary(context_data, patterns, context)

        execution_time_ms = int((time.time() - start_time) * 1000)

        return AgentResult(
            success=True,
            data=output,
            execution_time_ms=execution_time_ms,
        )

    def _identify_patterns(self, context_data: dict) -> list[dict]:
        """
        Identifica padrões de recorrência.

        Args:
            context_data: Dados coletados

        Returns:
            Lista de padrões identificados
        """
        patterns = []
        work_orders = context_data["work_orders"]

        # 1. Recorrência de OS corretivas por ativo
        correctives_by_asset = defaultdict(list)
        for wo in work_orders:
            if wo["type"] == "CORRECTIVE":
                correctives_by_asset[wo["asset_tag"]].append(wo)

        for asset_tag, wo_list in correctives_by_asset.items():
            if len(wo_list) >= self.MIN_RECURRENCE_COUNT:
                patterns.append({
                    "type": "repeat_corrective",
                    "priority": "high" if len(wo_list) >= 4 else "medium",
                    "title": f"Recorrência de OS corretivas: {asset_tag}",
                    "evidence": {
                        "count": len(wo_list),
                        "last_seen": wo_list[0]["created_at"] if wo_list else None,
                        "asset_tag": asset_tag,
                    },
                    "recommendation": (
                        f"Ativo {asset_tag} teve {len(wo_list)} OS corretivas no período. "
                        "Investigar causa raiz ou ajustar plano preventivo."
                    ),
                })

        # 2. Ativos com alta prioridade recorrente
        high_priority_by_asset = defaultdict(int)
        for wo in work_orders:
            if wo["priority"] in ("HIGH", "CRITICAL"):
                high_priority_by_asset[wo["asset_tag"]] += 1

        for asset_tag, count in high_priority_by_asset.items():
            if count >= self.MIN_RECURRENCE_COUNT:
                patterns.append({
                    "type": "high_priority_recurrence",
                    "priority": "high",
                    "title": f"Alta prioridade recorrente: {asset_tag}",
                    "evidence": {
                        "count": count,
                        "asset_tag": asset_tag,
                    },
                    "recommendation": (
                        f"Ativo {asset_tag} teve {count} OS de alta prioridade. "
                        "Considerar intervenção preventiva urgente."
                    ),
                })

        # 3. Peças mais consumidas (padrão de consumo)
        parts = context_data["parts_usage"]
        if parts and len(parts) > 0:
            top_part = parts[0]
            if top_part["usage_count"] >= self.MIN_RECURRENCE_COUNT:
                patterns.append({
                    "type": "high_consumption_part",
                    "priority": "medium",
                    "title": f"Alto consumo: {top_part['name']}",
                    "evidence": {
                        "item_id": top_part["item_id"],
                        "name": top_part["name"],
                        "total_qty": top_part["total_qty"],
                        "usage_count": top_part["usage_count"],
                        "estimated_cost": top_part["estimated_cost"],
                    },
                    "recommendation": (
                        f"Peça '{top_part['name']}' foi usada {top_part['usage_count']} vezes "
                        f"(total: {top_part['total_qty']} unidades). Verificar estoque e lead time."
                    ),
                })

        # 4. Distribuição de tipos de OS
        summary = context_data["work_orders_summary"]
        total = summary["total"]
        corrective = summary["by_type"].get("CORRECTIVE", 0)

        if total > 0 and corrective > 0:
            corrective_pct = (corrective / total) * 100
            if corrective_pct >= 70:
                patterns.append({
                    "type": "high_corrective_ratio",
                    "priority": "high",
                    "title": "Alta proporção de OS corretivas",
                    "evidence": {
                        "corrective_count": corrective,
                        "total_count": total,
                        "percentage": round(corrective_pct, 1),
                    },
                    "recommendation": (
                        f"{corrective_pct:.1f}% das OS são corretivas. "
                        "Revisar programa de manutenção preventiva."
                    ),
                })

        # 5. Análise de descrições similares (padrão textual simples)
        # Agrupar por primeiras palavras da descrição
        desc_groups = defaultdict(list)
        for wo in work_orders:
            if wo["type"] == "CORRECTIVE" and wo["description"]:
                # Pegar primeiras 3 palavras como "assinatura"
                words = wo["description"].lower().split()[:3]
                if len(words) >= 2:
                    signature = " ".join(words)
                    desc_groups[signature].append(wo)

        for signature, wo_list in desc_groups.items():
            if len(wo_list) >= 3:  # Pelo menos 3 ocorrências
                patterns.append({
                    "type": "similar_issue",
                    "priority": "medium",
                    "title": f"Problema similar recorrente: '{signature}...'",
                    "evidence": {
                        "count": len(wo_list),
                        "signature": signature,
                        "examples": [wo["number"] for wo in wo_list[:3]],
                    },
                    "recommendation": (
                        f"Padrão '{signature}...' apareceu {len(wo_list)} vezes. "
                        "Pode indicar problema sistêmico."
                    ),
                })

        # Ordenar por prioridade
        priority_order = {"high": 0, "medium": 1, "low": 2}
        patterns.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))

        return patterns

    def _try_llm_summary(
        self, context_data: dict, patterns: list[dict], context: AgentContext
    ) -> str | None:
        """Tenta gerar resumo via LLM."""
        try:
            from ..providers.factory import check_llm_health

            health = check_llm_health()
            if not health.get("healthy"):
                return None

            summary = context_data["work_orders_summary"]
            parts = context_data["parts_usage"][:3]

            prompt = f"""Analise os padrões de manutenção e gere um resumo executivo em português.

Período: {context_data['window_days']} dias
Total de OS: {summary['total']}
Corretivas: {summary['by_type'].get('CORRECTIVE', 0)}
Preventivas: {summary['by_type'].get('PREVENTIVE', 0)}

Top peças consumidas:
{json.dumps(parts, ensure_ascii=False)}

Padrões identificados: {len(patterns)}
{json.dumps([p['title'] for p in patterns[:3]], ensure_ascii=False)}

Gere um resumo conciso (máx 120 palavras) destacando:
1. Visão geral da manutenção
2. Principais padrões de atenção
3. Recomendação prioritária

Responda apenas com o texto do resumo."""

            response = self.call_llm(
                user_prompt=prompt,
                temperature=0.3,
                max_tokens=250,
                context=context,
            )

            if response.content:
                return response.content.strip()

        except Exception as e:
            logger.warning(f"[PatternsAgent] LLM summary failed: {e}")

        return None
