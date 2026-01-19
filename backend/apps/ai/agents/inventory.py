"""
Inventory Agent — Análise de estoque e recomendações de reposição.

Responsável por:
1. Analisar consumo real (saídas InventoryMovement.OUT) por janela de tempo
2. Calcular recomendações determinísticas (heurísticas):
   - reorder_point (ponto de reposição)
   - min_quantity (estoque mínimo/safety)
   - max_quantity (estoque máximo sugerido)
   - suggested_order_qty (quanto comprar)
3. Identificar oportunidades:
   - Risco de ruptura (estoque acaba antes do lead time)
   - Excesso (estoque muito acima do necessário)
   - Estoque parado (sem consumo por X dias)
4. Opcionalmente gerar resumo executivo via LLM
"""

import json
import logging
import re
from datetime import timedelta
from decimal import Decimal
from typing import Any, Optional

from django.db.models import Sum, Count
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryMovement

from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent

logger = logging.getLogger(__name__)


@register_agent
class InventoryAgent(BaseAgent):
    """
    Agente de Inventário: Análise de estoque e recomendações de reposição.

    Attributes:
        agent_key: "inventory"
        description: Otimização de estoque e recomendações de reposição
        version: "1.0.0"
        require_llm: False (heurísticas por padrão, LLM opcional)
    """

    agent_key = "inventory"
    description = "Otimização de estoque e recomendações de reposição"
    version = "1.0.0"
    require_llm = False  # Funciona sem LLM, usa heurísticas

    # Defaults para parâmetros
    DEFAULT_WINDOW_DAYS = 90
    DEFAULT_LEAD_TIME_DAYS = 7
    DEFAULT_SAFETY_DAYS = 3
    DEFAULT_DEAD_STOCK_DAYS = 180
    DEFAULT_OVERSTOCK_DAYS = 180
    DEFAULT_TOP_N = 30
    DEFAULT_COVERAGE_TARGET_DAYS = 30

    def validate_input(self, input_data: dict[str, Any]) -> tuple[bool, str | None]:
        """
        Valida entrada: mode obrigatório, item_id obrigatório para mode=item.

        Args:
            input_data: Dados de entrada

        Returns:
            Tupla (is_valid, error_msg) - error_msg é None se válido
        """
        if not input_data:
            return False, "input_data não pode ser vazio"

        mode = input_data.get("mode", "overview")
        if mode not in ("overview", "item"):
            return False, f"mode deve ser 'overview' ou 'item', recebido: {mode}"

        if mode == "item":
            item_id = input_data.get("item_id")
            if not item_id:
                return False, "item_id obrigatório quando mode='item'"
            try:
                int(item_id)
            except (ValueError, TypeError):
                return False, f"item_id deve ser numérico, recebido: {item_id}"

        # Validar parâmetros numéricos se fornecidos
        for param in ["window_days", "default_lead_time_days", "safety_days", 
                      "dead_stock_days", "overstock_days", "top_n"]:
            value = input_data.get(param)
            if value is not None:
                try:
                    val = int(value)
                    if val < 1:
                        return False, f"{param} deve ser >= 1"
                except (ValueError, TypeError):
                    return False, f"{param} deve ser numérico"

        return True, None

    def gather_context(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> dict[str, Any]:
        """
        Coleta dados de inventário e consumo.

        Args:
            input_data: Parâmetros (mode, window_days, item_id, etc.)
            context: Contexto do agente

        Returns:
            Dicionário com dados de itens e consumo
        """
        mode = input_data.get("mode", "overview")
        window_days = int(input_data.get("window_days", self.DEFAULT_WINDOW_DAYS))
        default_lead_time = int(input_data.get(
            "default_lead_time_days", self.DEFAULT_LEAD_TIME_DAYS
        ))
        safety_days = int(input_data.get("safety_days", self.DEFAULT_SAFETY_DAYS))
        dead_stock_days = int(input_data.get(
            "dead_stock_days", self.DEFAULT_DEAD_STOCK_DAYS
        ))
        overstock_days = int(input_data.get(
            "overstock_days", self.DEFAULT_OVERSTOCK_DAYS
        ))
        top_n = int(input_data.get("top_n", self.DEFAULT_TOP_N))

        logger.debug(
            f"[InventoryAgent] gather_context: mode={mode}, "
            f"window_days={window_days}, top_n={top_n}"
        )

        now = timezone.now()
        window_start = now - timedelta(days=window_days)
        dead_stock_date = now - timedelta(days=dead_stock_days)

        result = {
            "mode": mode,
            "window_days": window_days,
            "default_lead_time_days": default_lead_time,
            "safety_days": safety_days,
            "dead_stock_days": dead_stock_days,
            "overstock_days": overstock_days,
            "top_n": top_n,
            "window_start": window_start.isoformat(),
            "generated_at": now.isoformat(),
            "items_data": [],
        }

        # Query base de itens
        items_qs = InventoryItem.objects.filter(is_active=True)

        if mode == "item":
            item_id = int(input_data.get("item_id"))
            items_qs = items_qs.filter(id=item_id)

        # Coletar dados por item
        items_data = []
        for item in items_qs.select_related("category"):
            # Calcular consumo no período (saídas)
            consumption = (
                InventoryMovement.objects.filter(
                    item=item,
                    type=InventoryMovement.MovementType.OUT,
                    created_at__gte=window_start,
                )
                .aggregate(
                    total_out=Coalesce(Sum("quantity"), Decimal("0")),
                    movement_count=Count("id"),
                )
            )

            # Última saída (para dead_stock)
            last_out = (
                InventoryMovement.objects.filter(
                    item=item,
                    type=InventoryMovement.MovementType.OUT,
                )
                .order_by("-created_at")
                .values("created_at")
                .first()
            )

            items_data.append({
                "id": item.id,
                "code": item.code,
                "name": item.name,
                "unit": item.unit,
                "category_id": item.category_id,
                "category_name": item.category.name if item.category else None,
                "current_qty": float(item.quantity),
                "min_quantity": float(item.min_quantity),
                "max_quantity": float(item.max_quantity) if item.max_quantity else None,
                "reorder_point": float(item.reorder_point) if item.reorder_point else None,
                "lead_time_days": item.lead_time_days,
                "unit_cost": float(item.unit_cost),
                "is_critical": item.is_critical,
                "total_out": float(consumption["total_out"]),
                "movement_count": consumption["movement_count"],
                "last_out_date": (
                    last_out["created_at"].isoformat() if last_out else None
                ),
            })

        result["items_data"] = items_data

        logger.debug(
            f"[InventoryAgent] gather_context: coletados {len(items_data)} itens"
        )

        return result

    def execute(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> AgentResult:
        """
        Executa análise e gera recomendações.

        Args:
            input_data: Dados de entrada
            context: Contexto de execução (tenant, user, etc.)

        Returns:
            AgentResult com recomendações estruturadas
        """
        import time
        start_time = time.time()

        try:
            logger.debug(f"[InventoryAgent] execute: input_data={input_data}")

            # Coletar contexto
            context_data = self.gather_context(input_data, context)

            # Calcular recomendações via heurísticas
            recommendations = self._calculate_recommendations(context_data)

            # Montar output
            output_data = {
                "agent_key": self.agent_key,
                "version": self.version,
                "mode": context_data["mode"],
                "window_days": context_data["window_days"],
                "generated_at": context_data["generated_at"],
                "summary": recommendations["summary"],
                "recommendations": {
                    "reorder": recommendations["reorder"],
                    "overstock": recommendations["overstock"],
                    "dead_stock": recommendations["dead_stock"],
                },
                "llm_summary": None,
                "engine": {
                    "type": "heuristic",
                    "assumptions": [
                        f"lead_time_days default={context_data['default_lead_time_days']} quando item não possui",
                        f"safety_stock = avg_daily_usage * {context_data['safety_days']} dias",
                        f"max target = reorder_point + {self.DEFAULT_COVERAGE_TARGET_DAYS} dias de cobertura",
                        f"dead_stock = sem saída por {context_data['dead_stock_days']} dias",
                    ],
                },
            }

            # Tentar sumarização via LLM (opcional)
            if recommendations["summary"]["total_items"] > 0:
                llm_summary = self._try_llm_summary(recommendations)
                if llm_summary:
                    output_data["llm_summary"] = llm_summary
                    output_data["engine"]["type"] = "llm+heuristic"

            execution_time_ms = int((time.time() - start_time) * 1000)

            return AgentResult(
                success=True,
                data=output_data,
                execution_time_ms=execution_time_ms,
            )

        except Exception as e:
            logger.error(f"Erro ao executar InventoryAgent: {e}", exc_info=True)
            return AgentResult(
                success=False,
                data={},
                error=str(e),
            )

    def _calculate_recommendations(
        self, context_data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Calcula recomendações heurísticas para cada item.

        Args:
            context_data: Dados coletados

        Returns:
            Dicionário com summary e listas de recomendações
        """
        items_data = context_data["items_data"]
        window_days = context_data["window_days"]
        default_lead_time = context_data["default_lead_time_days"]
        safety_days = context_data["safety_days"]
        dead_stock_days = context_data["dead_stock_days"]
        overstock_days = context_data["overstock_days"]
        top_n = context_data["top_n"]

        now = timezone.now()

        # Listas de recomendações
        reorder_list = []
        overstock_list = []
        dead_stock_list = []

        # Contadores para summary
        total_items = len(items_data)
        items_with_consumption = 0
        total_stock_value = Decimal("0")
        low_stock_count = 0
        out_of_stock_count = 0
        critical_low_count = 0

        for item in items_data:
            current_qty = Decimal(str(item["current_qty"]))
            min_qty = Decimal(str(item["min_quantity"]))
            max_qty = (
                Decimal(str(item["max_quantity"])) 
                if item["max_quantity"] else None
            )
            unit_cost = Decimal(str(item["unit_cost"]))
            total_out = Decimal(str(item["total_out"]))
            lead_time = item["lead_time_days"] or default_lead_time

            # Valor total em estoque
            total_stock_value += current_qty * unit_cost

            # Consumo médio diário
            avg_daily_usage = float(total_out / window_days) if window_days > 0 else 0

            # Classificar itens com consumo
            has_consumption = total_out > 0
            if has_consumption:
                items_with_consumption += 1

            # Safety stock e ponto de reposição sugerido
            safety_stock = avg_daily_usage * safety_days
            suggested_reorder_point = avg_daily_usage * lead_time + safety_stock
            suggested_min = max(safety_stock, float(min_qty))
            suggested_max = (
                suggested_reorder_point + 
                avg_daily_usage * self.DEFAULT_COVERAGE_TARGET_DAYS
            )

            # Dias de cobertura
            days_of_cover = (
                float(current_qty) / avg_daily_usage 
                if avg_daily_usage > 0 else float("inf")
            )

            # Quantidade sugerida para pedido
            suggested_order_qty = max(0, suggested_max - float(current_qty))

            # Classificações

            # 1. Risco de ruptura: dias de cobertura < lead_time
            stockout_risk = days_of_cover < lead_time if has_consumption else False

            # 2. Estoque baixo
            is_low = current_qty < min_qty
            if is_low:
                low_stock_count += 1
                if item["is_critical"]:
                    critical_low_count += 1

            # 3. Sem estoque
            is_out = current_qty <= 0
            if is_out:
                out_of_stock_count += 1

            # 4. Dead stock: sem saída por dead_stock_days e qty > 0
            is_dead_stock = False
            if item["last_out_date"]:
                from dateutil.parser import isoparse
                last_out = isoparse(item["last_out_date"])
                days_since_last_out = (now - last_out).days
                is_dead_stock = (
                    days_since_last_out >= dead_stock_days and current_qty > 0
                )
            elif current_qty > 0 and not has_consumption:
                # Nunca teve saída e tem estoque
                is_dead_stock = True

            # 5. Overstock
            is_overstock = False
            if has_consumption and avg_daily_usage > 0:
                is_overstock = float(current_qty) > avg_daily_usage * overstock_days
            elif max_qty and current_qty > max_qty:
                is_overstock = True

            # Determinar confiança
            confidence = "high" if item["movement_count"] >= 10 else (
                "medium" if item["movement_count"] >= 3 else "low"
            )

            # Notas automáticas
            notes = []
            if has_consumption:
                notes.append(
                    f"Consumo médio: {avg_daily_usage:.2f}/dia "
                    f"({item['movement_count']} movimentações)"
                )
            if item["is_critical"]:
                notes.append("Item crítico")
            if stockout_risk:
                notes.append(
                    f"Risco de ruptura: {days_of_cover:.1f} dias de cobertura "
                    f"vs {lead_time} dias lead time"
                )

            # Montar item base para recomendação
            rec_item = {
                "item_id": item["id"],
                "code": item["code"],
                "name": item["name"],
                "unit": item["unit"],
                "category_name": item["category_name"],
                "current_qty": float(current_qty),
                "avg_daily_usage": round(avg_daily_usage, 4),
                "lead_time_days": lead_time,
                "days_of_cover": (
                    round(days_of_cover, 1) 
                    if days_of_cover != float("inf") else None
                ),
                "stockout_risk": stockout_risk,
                "suggested_reorder_point": round(suggested_reorder_point, 2),
                "suggested_min_quantity": round(suggested_min, 2),
                "suggested_max_quantity": round(suggested_max, 2),
                "suggested_order_qty": round(suggested_order_qty, 2),
                "confidence": confidence,
                "notes": notes,
            }

            # Adicionar às listas apropriadas
            if stockout_risk or is_low or is_out:
                rec_item["priority"] = (
                    "critical" if is_out or (is_low and item["is_critical"]) 
                    else "high" if is_low 
                    else "medium"
                )
                reorder_list.append(rec_item)

            if is_overstock:
                rec_item["excess_qty"] = round(
                    float(current_qty) - suggested_max, 2
                )
                rec_item["excess_value"] = round(
                    float(rec_item["excess_qty"]) * float(unit_cost), 2
                )
                overstock_list.append(rec_item)

            if is_dead_stock:
                rec_item["stock_value"] = round(
                    float(current_qty) * float(unit_cost), 2
                )
                if item["last_out_date"]:
                    rec_item["days_since_last_out"] = days_since_last_out
                dead_stock_list.append(rec_item)

        # Ordenar listas
        # Reorder: prioridade (critical > high > medium), depois por days_of_cover
        priority_order = {"critical": 0, "high": 1, "medium": 2}
        reorder_list.sort(
            key=lambda x: (
                priority_order.get(x.get("priority", "medium"), 2),
                x.get("days_of_cover") or 0,
            )
        )

        # Dead stock: maior valor primeiro
        dead_stock_list.sort(
            key=lambda x: x.get("stock_value", 0), reverse=True
        )

        # Overstock: maior excesso de valor primeiro
        overstock_list.sort(
            key=lambda x: x.get("excess_value", 0), reverse=True
        )

        # Aplicar top_n
        reorder_list = reorder_list[:top_n]
        overstock_list = overstock_list[:top_n]
        dead_stock_list = dead_stock_list[:top_n]

        return {
            "summary": {
                "total_items": total_items,
                "items_with_consumption": items_with_consumption,
                "total_stock_value": round(float(total_stock_value), 2),
                "low_stock_count": low_stock_count,
                "out_of_stock_count": out_of_stock_count,
                "critical_low_count": critical_low_count,
                "reorder_count": len(reorder_list),
                "overstock_count": len(overstock_list),
                "dead_stock_count": len(dead_stock_list),
            },
            "reorder": reorder_list,
            "overstock": overstock_list,
            "dead_stock": dead_stock_list,
        }

    def _try_llm_summary(self, recommendations: dict[str, Any]) -> Optional[str]:
        """
        Tenta gerar resumo executivo via LLM.

        Args:
            recommendations: Recomendações calculadas

        Returns:
            Texto do resumo ou None se LLM não disponível
        """
        try:
            summary = recommendations["summary"]
            
            # Só tenta LLM se houver algo relevante para comentar
            if (summary["reorder_count"] == 0 and 
                summary["overstock_count"] == 0 and 
                summary["dead_stock_count"] == 0):
                return None

            prompt = f"""Analise os seguintes dados de inventário e gere um resumo executivo curto (máximo 3 parágrafos):

RESUMO:
- Total de itens analisados: {summary['total_items']}
- Itens com consumo no período: {summary['items_with_consumption']}
- Valor total em estoque: R$ {summary['total_stock_value']:,.2f}
- Itens com estoque baixo: {summary['low_stock_count']}
- Itens sem estoque: {summary['out_of_stock_count']}
- Itens críticos com estoque baixo: {summary['critical_low_count']}

RECOMENDAÇÕES:
- Itens para reposição: {summary['reorder_count']}
- Itens com excesso: {summary['overstock_count']}
- Itens parados: {summary['dead_stock_count']}

TOP 3 ITENS PARA REPOSIÇÃO URGENTE:
{self._format_top_items(recommendations['reorder'][:3])}

Gere um resumo executivo focado em:
1. Situação geral do estoque
2. Riscos mais relevantes
3. Ações prioritárias recomendadas

Responda em português brasileiro, de forma profissional e objetiva."""

            response = self.provider.chat_sync(
                messages=[{"role": "user", "content": prompt}],
                model="mistral-nemo",
                temperature=0.3,
                max_tokens=500,
            )

            if response.choices:
                return response.choices[0].message.content.strip()

        except Exception as e:
            logger.debug(f"[InventoryAgent] LLM não disponível: {e}")

        return None

    def _format_top_items(self, items: list[dict]) -> str:
        """Formata lista de itens para prompt."""
        if not items:
            return "Nenhum item identificado."

        lines = []
        for i, item in enumerate(items, 1):
            lines.append(
                f"{i}. {item['code']} - {item['name']}: "
                f"Qtd atual={item['current_qty']}, "
                f"Dias de cobertura={item.get('days_of_cover') or 'N/A'}, "
                f"Prioridade={item.get('priority', 'N/A')}"
            )
        return "\n".join(lines)
