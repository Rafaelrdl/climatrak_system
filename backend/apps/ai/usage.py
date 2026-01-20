"""
AI Usage Service - Token usage tracking for LLM calls.

Service layer para registro de métricas de uso de tokens.
Implementa gravação best-effort (não deve quebrar execução do agente).
"""

import logging
import uuid
from typing import TYPE_CHECKING, Any, Optional

from django.db import connection

from .providers.base import LLMResponse

# Import apenas para type hints (evita import circular)
if TYPE_CHECKING:
    from .agents.base import AgentContext

logger = logging.getLogger(__name__)


class AIUsageService:
    """
    Service para registro de uso de tokens LLM.

    Responsabilidades:
    - Gravar log de uso após cada chamada LLM
    - Mapear métricas OpenAI compat e fallback
    - Garantir best-effort (não propaga exceções)
    """

    @staticmethod
    def get_tenant_uuid() -> uuid.UUID:
        """Retorna UUID determinístico do tenant atual."""
        schema_name = connection.schema_name
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"tenant:{schema_name}")

    @staticmethod
    def record_llm_call(
        *,
        context: Optional["AgentContext"],
        agent_key: str,
        response: LLMResponse,
        provider: str = "openai_compat",
    ) -> None:
        """
        Registra uso de tokens de uma chamada LLM.

        Best-effort: erros são logados mas não propagados.

        Args:
            context: Contexto do agente (tenant_id, user_id, job_id)
            agent_key: Identificador do agente
            response: Resposta do LLM com métricas
            provider: Provider usado (default: openai_compat)
        """
        try:
            # Import lazy para evitar import circular
            from .models import AIUsageLog, AIJob

            # Extrair dados do contexto
            if context:
                tenant_id = uuid.UUID(context.tenant_id) if isinstance(context.tenant_id, str) else context.tenant_id
                tenant_schema = context.tenant_schema
                job_id = context.job_id
                user_id = context.user_id
            else:
                tenant_id = AIUsageService.get_tenant_uuid()
                tenant_schema = connection.schema_name
                job_id = None
                user_id = None

            # Resolver job FK se tiver job_id
            job = None
            if job_id:
                try:
                    job = AIJob.objects.filter(id=job_id).first()
                except Exception:
                    pass  # Ignora se job não existir

            # Resolver created_by se tiver user_id numérico
            created_by_id = None
            if user_id:
                try:
                    created_by_id = int(user_id)
                except (ValueError, TypeError):
                    # Se user_id for UUID ou não numérico, ignorar FK
                    pass

            # Calcular tokens
            input_tokens = response.tokens_prompt
            output_tokens = response.tokens_completion
            total_tokens = response.tokens_total or (input_tokens + output_tokens)

            # Construir raw_usage com dados relevantes do provider
            raw_usage = {}
            raw_response = response.raw_response or {}
            
            # Preservar métricas de performance (formato fallback)
            extended_fields = [
                "prompt_eval_count",
                "eval_count",
                "total_duration",
                "load_duration",
                "prompt_eval_duration",
                "eval_duration",
            ]
            for field in extended_fields:
                if field in raw_response:
                    raw_usage[field] = raw_response[field]
            
            # Preservar usage OpenAI se existir
            if "usage" in raw_response:
                raw_usage["usage"] = raw_response["usage"]

            # Criar log
            log = AIUsageLog(
                tenant_id=tenant_id,
                tenant_schema=tenant_schema,
                agent_key=agent_key,
                model=response.model,
                provider=provider,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                job=job,
                raw_usage=raw_usage,
            )

            # Setar created_by via ID se disponível
            if created_by_id:
                log.created_by_id = created_by_id

            log.save()

            logger.debug(
                f"[AIUsageService] Logged usage: agent={agent_key}, "
                f"model={response.model}, tokens={total_tokens}"
            )

        except Exception as e:
            # Best-effort: log warning mas não propaga exceção
            logger.warning(
                f"[AIUsageService] Failed to record LLM usage: {e}",
                exc_info=True,
            )
