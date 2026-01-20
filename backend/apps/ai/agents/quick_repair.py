"""
AI Agent - Quick Repair Assistant

Agente de diagnóstico rápido para técnicos em campo.
Dado um sintoma e contexto do ativo, gera:
- Hipóteses de causa com nível de confiança
- Passos de diagnóstico (checklist)
- Passos de reparo com segurança/PPE
- Sugestão de peças com match no inventário
- Referências a procedimentos e OSs similares
"""

import hashlib
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Optional

from django.db.models import Count, Q
from django.utils import timezone

from ..providers.base import LLMMessage
from ..utils.json_parser import extract_first_json_object, validate_json_schema
from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent

logger = logging.getLogger(__name__)


@register_agent
class QuickRepairAgent(BaseAgent):
    """
    Agente de diagnóstico rápido para manutenção corretiva.

    Gera hipóteses, diagnóstico e plano de reparo baseado no sintoma
    reportado e contexto do ativo (histórico, procedimentos, inventário).

    Suporta modo fallback quando LLM não disponível.
    """

    agent_key = "quick_repair"
    description = (
        "Agente de diagnóstico rápido para técnicos em campo. "
        "Gera hipóteses de causa, passos de diagnóstico e reparo, "
        "sugestões de peças e referências a procedimentos."
    )
    version = "1.0.0"
    require_llm = True  # Usa LLM, mas tem fallback

    # Configurações
    DEFAULT_SIMILAR_WO_LIMIT = 5
    DEFAULT_PROCEDURE_LIMIT = 5
    DEFAULT_INVENTORY_MATCH_LIMIT = 10
    DEFAULT_WINDOW_DAYS = 180  # Histórico de OSs

    def validate_input(self, input_data: dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Valida entrada requerendo ao menos sintoma e asset_id.

        Args:
            input_data: Deve conter 'symptom' (str) e 'asset_id' (int/str)

        Returns:
            Tuple (is_valid, error_message)
        """
        symptom = input_data.get("symptom")
        if not symptom or not isinstance(symptom, str) or len(symptom.strip()) < 10:
            return False, "Campo 'symptom' obrigatório (mínimo 10 caracteres)"

        asset_id = input_data.get("asset_id")
        if asset_id is None:
            return False, "Campo 'asset_id' obrigatório"

        try:
            int(asset_id)
        except (TypeError, ValueError):
            return False, f"Campo 'asset_id' deve ser inteiro, recebido: {type(asset_id)}"

        return True, None

    def gather_context(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> dict[str, Any]:
        """
        Coleta contexto completo para diagnóstico.

        Inclui:
        - Informações do ativo
        - Histórico de OSs similares
        - Procedimentos relevantes
        - Itens de inventário potencialmente necessários
        """
        # Import lazy para evitar circular
        from apps.assets.models import Asset
        from apps.cmms.models import Procedure, WorkOrder
        from apps.inventory.models import InventoryItem

        asset_id = int(input_data["asset_id"])
        symptom = input_data["symptom"].strip()
        constraints = input_data.get("constraints", [])
        observations = input_data.get("observations", "")

        result = {
            "symptom": symptom,
            "constraints": constraints,
            "observations": observations,
            "generated_at": timezone.now().isoformat(),
        }

        # 1. Buscar ativo
        try:
            asset = Asset.objects.select_related("site", "sector", "subsection").get(
                id=asset_id
            )
            result["asset"] = {
                "id": asset.id,
                "tag": asset.tag,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "manufacturer": asset.manufacturer,
                "model": asset.model,
                "serial_number": asset.serial_number,
                "status": asset.status,
                "specifications": asset.specifications or {},
                "site_name": asset.site.name if asset.site else None,
                "sector_name": asset.sector.name if asset.sector else None,
                "subsection_name": (
                    asset.subsection.name if asset.subsection else None
                ),
            }
        except Asset.DoesNotExist:
            logger.warning(f"[QuickRepair] Asset {asset_id} não encontrado")
            result["asset"] = None
            return result

        # 2. Histórico de OSs do ativo (similares por tipo/descrição)
        window_days = input_data.get("window_days", self.DEFAULT_WINDOW_DAYS)
        window_start = timezone.now() - timedelta(days=window_days)

        similar_wos = (
            WorkOrder.objects.filter(
                asset_id=asset_id,
                status__in=["COMPLETED", "IN_PROGRESS"],
                created_at__gte=window_start,
            )
            .order_by("-completed_at", "-created_at")
            .values(
                "id",
                "number",
                "type",
                "priority",
                "status",
                "description",
                "execution_description",
                "completed_at",
            )[: self.DEFAULT_SIMILAR_WO_LIMIT]
        )
        result["similar_work_orders"] = list(similar_wos)

        # 3. Procedimentos relevantes (por tipo de ativo ou tags)
        procedures = (
            Procedure.objects.filter(
                status=Procedure.Status.ACTIVE,
                is_active=True,
            )
            .filter(
                Q(tags__contains=[asset.asset_type])
                | Q(title__icontains=asset.asset_type)
                | Q(description__icontains=symptom[:50])
            )
            .order_by("-view_count", "-updated_at")
            .values("id", "title", "description", "file_type", "version", "tags")[
                : self.DEFAULT_PROCEDURE_LIMIT
            ]
        )
        result["relevant_procedures"] = list(procedures)

        # 4. Itens de inventário potencialmente relevantes
        # Busca por palavras-chave do tipo de ativo e sintoma
        keywords = self._extract_keywords(
            f"{asset.asset_type} {asset.manufacturer} {symptom}"
        )

        inventory_query = Q(is_active=True, quantity__gt=0)
        if keywords:
            keyword_filter = Q()
            for kw in keywords[:5]:  # Limitar keywords
                keyword_filter |= Q(name__icontains=kw) | Q(description__icontains=kw)
            inventory_query &= keyword_filter

        inventory_items = (
            InventoryItem.objects.filter(inventory_query)
            .select_related("category")
            .values(
                "id",
                "code",
                "name",
                "manufacturer",
                "quantity",
                "unit",
                "unit_cost",
                "location",
                "category__name",
            )[: self.DEFAULT_INVENTORY_MATCH_LIMIT]
        )
        result["available_parts"] = list(inventory_items)

        logger.debug(
            f"[QuickRepair] gather_context: asset={asset.tag}, "
            f"wos={len(result['similar_work_orders'])}, "
            f"procedures={len(result['relevant_procedures'])}, "
            f"parts={len(result['available_parts'])}"
        )

        return result

    def execute(
        self, input_data: dict[str, Any], context: AgentContext
    ) -> AgentResult:
        """
        Executa diagnóstico rápido.

        Tenta usar LLM primeiro, com fallback para resposta básica
        se LLM não disponível.
        """
        start_time = time.time()

        try:
            # Coletar contexto
            context_data = self.gather_context(input_data, context)

            if not context_data.get("asset"):
                return AgentResult(
                    success=False,
                    data={},
                    error=f"Ativo {input_data.get('asset_id')} não encontrado",
                )

            # Tentar LLM
            try:
                result = self._execute_with_llm(context_data, context)
                result.execution_time_ms = int((time.time() - start_time) * 1000)
                return result
            except Exception as llm_error:
                logger.warning(
                    f"[QuickRepair] LLM falhou, usando fallback: {llm_error}"
                )
                result = self._execute_fallback(context_data, context)
                result.execution_time_ms = int((time.time() - start_time) * 1000)
                return result

        except Exception as e:
            logger.exception(f"[QuickRepair] Erro: {e}")
            return AgentResult(
                success=False,
                data={},
                error=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

    def _execute_with_llm(
        self, context_data: dict[str, Any], context: AgentContext
    ) -> AgentResult:
        """Executa diagnóstico usando LLM."""
        prompt = self._build_prompt(context_data)

        response = self.provider.chat_sync(
            messages=[LLMMessage(role="user", content=prompt)],
            temperature=0.3,
        )

        content = response.content or ""

        # Parser tolerante
        output_data, error = extract_first_json_object(content)
        if output_data is None:
            raise ValueError(f"LLM retornou JSON inválido: {error}")

        # Validar schema mínimo
        required_keys = {"summary", "hypotheses", "diagnosis_steps", "repair_steps"}
        is_valid, validation_error = validate_json_schema(output_data, required_keys)
        if not is_valid:
            logger.warning(f"[QuickRepair] Schema incompleto: {validation_error}")

        # Enriquecer com dados do contexto
        output_data = self._enrich_output(output_data, context_data)

        return AgentResult(
            success=True,
            data=output_data,
            tokens_used=response.tokens_total if response.tokens_total else 0,
        )

    def _execute_fallback(
        self, context_data: dict[str, Any], context: AgentContext
    ) -> AgentResult:
        """Gera resposta básica sem LLM."""
        asset = context_data["asset"]
        symptom = context_data["symptom"]

        output_data = {
            "mode": "fallback",
            "summary": (
                f"Diagnóstico básico para {asset['tag']} ({asset['asset_type']}). "
                f"LLM não disponível - consulte os procedimentos e histórico manualmente."
            ),
            "hypotheses": [
                {
                    "id": "H1",
                    "title": "Verificar histórico de manutenção",
                    "confidence": 0.5,
                    "evidence": [
                        f"Sintoma reportado: {symptom}",
                        "Análise automática indisponível",
                    ],
                }
            ],
            "diagnosis_steps": [
                {
                    "step": 1,
                    "action": "Verificar status visual do equipamento",
                    "expected_result": "Identificar sinais óbvios de falha",
                    "tools_required": ["Lanterna", "Multímetro"],
                },
                {
                    "step": 2,
                    "action": "Consultar histórico de OSs do equipamento",
                    "expected_result": "Identificar padrões de falha recorrentes",
                    "tools_required": [],
                },
                {
                    "step": 3,
                    "action": "Consultar procedimentos técnicos relacionados",
                    "expected_result": "Seguir passos de diagnóstico documentados",
                    "tools_required": [],
                },
            ],
            "repair_steps": [],
            "parts": [],
            "tools": ["Multímetro", "Chave de fenda", "Lanterna"],
            "safety": {
                "ppe_required": ["Óculos de proteção", "Luvas", "Calçado de segurança"],
                "warnings": [
                    "Desenergizar equipamento antes de intervenção",
                    "Seguir procedimento de bloqueio e etiquetagem (LOTO)",
                ],
            },
            "escalation": {
                "criteria": "Se o problema persistir após verificações básicas",
                "contact": "Supervisor de manutenção",
            },
        }

        # Enriquecer com dados do contexto
        output_data = self._enrich_output(output_data, context_data)

        return AgentResult(
            success=True,
            data=output_data,
            tokens_used=0,
        )

    def _enrich_output(
        self, output_data: dict[str, Any], context_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Adiciona referências e dados do contexto ao output."""
        output_data["agent_key"] = self.agent_key
        output_data["version"] = self.version
        output_data["generated_at"] = context_data["generated_at"]

        # Referências
        output_data["references"] = {
            "similar_work_orders": [
                {
                    "id": wo["id"],
                    "number": wo["number"],
                    "description": wo["description"][:100] if wo["description"] else "",
                    "status": wo["status"],
                }
                for wo in context_data.get("similar_work_orders", [])
            ],
            "procedures": [
                {
                    "id": p["id"],
                    "title": p["title"],
                    "file_type": p["file_type"],
                }
                for p in context_data.get("relevant_procedures", [])
            ],
        }

        # Match de inventário nos parts
        available_parts = {
            p["code"]: p for p in context_data.get("available_parts", [])
        }

        if "parts" in output_data:
            for part in output_data["parts"]:
                part_name = part.get("name", "").lower()
                matches = []
                for code, inv_part in available_parts.items():
                    if (
                        part_name in inv_part["name"].lower()
                        or inv_part["name"].lower() in part_name
                    ):
                        matches.append(
                            {
                                "inventory_id": inv_part["id"],
                                "code": inv_part["code"],
                                "name": inv_part["name"],
                                "available_qty": float(inv_part["quantity"]),
                                "unit": inv_part["unit"],
                                "unit_cost": float(inv_part["unit_cost"]),
                                "location": inv_part["location"],
                            }
                        )
                part["inventory_matches"] = matches

        # Asset info
        output_data["asset"] = context_data["asset"]

        # Idempotency key para rastreamento
        symptom_hash = hashlib.sha256(
            context_data["symptom"].encode()
        ).hexdigest()[:8]
        output_data["idempotency_key"] = (
            f"quick_repair:asset:{context_data['asset']['id']}:{symptom_hash}:v1"
        )

        return output_data

    def _build_prompt(self, context_data: dict[str, Any]) -> str:
        """Constrói prompt para o LLM."""
        asset = context_data["asset"]
        symptom = context_data["symptom"]
        constraints = context_data.get("constraints", [])
        observations = context_data.get("observations", "")

        # Formatar histórico de OSs
        wo_history = ""
        for wo in context_data.get("similar_work_orders", []):
            wo_history += f"- OS {wo['number']}: {wo['description'][:100]}...\n"
            if wo.get("execution_description"):
                wo_history += f"  Solução: {wo['execution_description'][:100]}...\n"

        # Formatar procedimentos
        procedures = ""
        for p in context_data.get("relevant_procedures", []):
            procedures += f"- {p['title']} (v{p['version']}, {p['file_type']})\n"

        # Formatar peças disponíveis
        parts = ""
        for p in context_data.get("available_parts", []):
            parts += f"- {p['code']}: {p['name']} (Qtd: {p['quantity']} {p['unit']})\n"

        prompt = f"""Você é um engenheiro de manutenção HVAC experiente. Analise o problema reportado e forneça um diagnóstico estruturado.

## Equipamento
- Tag: {asset['tag']}
- Nome: {asset['name']}
- Tipo: {asset['asset_type']}
- Fabricante: {asset['manufacturer']}
- Modelo: {asset['model']}
- Status atual: {asset['status']}
- Especificações: {asset['specifications']}

## Problema Reportado
{symptom}

## Observações Adicionais
{observations or 'Nenhuma'}

## Restrições
{chr(10).join(f'- {c}' for c in constraints) if constraints else 'Nenhuma'}

## Histórico de Manutenção (últimos 180 dias)
{wo_history or 'Nenhuma OS anterior'}

## Procedimentos Relacionados
{procedures or 'Nenhum procedimento encontrado'}

## Peças Disponíveis no Estoque
{parts or 'Nenhuma peça encontrada'}

## Resposta Requerida
Retorne APENAS um objeto JSON válido (sem markdown) com a seguinte estrutura:

{{
  "summary": "Resumo executivo do diagnóstico em 2-3 frases",
  "hypotheses": [
    {{
      "id": "H1",
      "title": "Título da hipótese",
      "confidence": 0.8,
      "evidence": ["evidência 1", "evidência 2"],
      "severity": "high|medium|low"
    }}
  ],
  "diagnosis_steps": [
    {{
      "step": 1,
      "action": "Ação de diagnóstico",
      "expected_result": "Resultado esperado",
      "tools_required": ["ferramenta 1"]
    }}
  ],
  "repair_steps": [
    {{
      "step": 1,
      "action": "Ação de reparo",
      "precautions": "Precauções de segurança",
      "estimated_minutes": 30
    }}
  ],
  "parts": [
    {{
      "name": "Nome da peça",
      "quantity": 1,
      "purpose": "Para que será usada"
    }}
  ],
  "tools": ["ferramenta 1", "ferramenta 2"],
  "safety": {{
    "ppe_required": ["EPI 1", "EPI 2"],
    "warnings": ["Aviso de segurança 1"]
  }},
  "escalation": {{
    "criteria": "Quando escalar",
    "contact": "Quem contatar"
  }},
  "suggested_work_order": {{
    "title": "Título sugerido para OS",
    "type": "CORRECTIVE",
    "priority": "HIGH|MEDIUM|LOW|CRITICAL",
    "estimated_hours": 2
  }}
}}

IMPORTANTE:
- Baseie-se no histórico de manutenção quando disponível
- Sugira peças que estejam no estoque quando possível
- Inclua instruções de segurança adequadas ao tipo de equipamento
- Ordene hipóteses por confiança (maior primeiro)
- Seja específico nas ações de diagnóstico e reparo
"""
        return prompt

    def _extract_keywords(self, text: str) -> list[str]:
        """Extrai palavras-chave significativas de um texto."""
        # Palavras comuns a ignorar
        stopwords = {
            "de",
            "da",
            "do",
            "para",
            "com",
            "em",
            "um",
            "uma",
            "o",
            "a",
            "os",
            "as",
            "que",
            "não",
            "está",
            "ser",
            "ter",
            "fazer",
            "the",
            "is",
            "and",
            "or",
            "of",
            "to",
            "in",
            "it",
        }

        # Tokenizar e filtrar
        words = text.lower().split()
        keywords = [
            w.strip(".,;:!?()[]{}\"'")
            for w in words
            if len(w) > 2 and w.lower() not in stopwords
        ]

        return list(set(keywords))
