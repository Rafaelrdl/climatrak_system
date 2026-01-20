"""
AI Providers - Factory e configuração.

Centraliza criação de providers LLM a partir de settings.
Default: Z.ai com GLM-4.7-Flash (Free tier, OpenAI-compatible API).
"""

import logging
from functools import lru_cache
from typing import Optional

from django.conf import settings

from .base import BaseLLMProvider, LLMConfig
from .openai_compat import OpenAICompatProvider

logger = logging.getLogger(__name__)


def get_llm_config() -> LLMConfig:
    """
    Retorna configuração LLM a partir de settings.

    Settings esperados (com defaults para Z.ai GLM-4.7-Flash):
    - LLM_BASE_URL: URL base da API (default: https://api.z.ai/api/paas/v4)
    - LLM_MODEL: Modelo a usar (default: glm-4.7-flash)
    - LLM_API_KEY: API key (obrigatório para Z.ai)
    - LLM_TEMPERATURE: Temperatura (default: 0.2)
    - LLM_MAX_TOKENS: Max tokens (default: 4096)
    - LLM_TIMEOUT_SECONDS: Timeout (default: 120)
    """
    return LLMConfig(
        base_url=getattr(settings, "LLM_BASE_URL", "https://api.z.ai/api/paas/v4"),
        model=getattr(settings, "LLM_MODEL", "glm-4.7-flash"),
        api_key=getattr(settings, "LLM_API_KEY", ""),
        temperature=float(getattr(settings, "LLM_TEMPERATURE", 0.2)),
        max_tokens=int(getattr(settings, "LLM_MAX_TOKENS", 4096)),
        timeout_seconds=int(getattr(settings, "LLM_TIMEOUT_SECONDS", 120)),
        retry_attempts=int(getattr(settings, "LLM_RETRY_ATTEMPTS", 3)),
        retry_delay=float(getattr(settings, "LLM_RETRY_DELAY", 1.0)),
    )


@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    Retorna instância singleton do provider LLM.

    Usa cache para evitar múltiplas instâncias.
    Para limpar cache: get_llm_provider.cache_clear()
    
    Providers disponíveis (LLM_PROVIDER setting):
    - "openai_compat": API OpenAI-compatible (Z.ai, vLLM, LocalAI, etc.) - default
    - "openai": Alias para openai_compat
    """
    config = get_llm_config()
    provider_type = getattr(settings, "LLM_PROVIDER", "openai_compat").lower()
    
    logger.info(
        f"Initializing LLM provider: type={provider_type}, "
        f"url={config.base_url}, model={config.model}"
    )
    
    if provider_type in ("openai", "openai_compat"):
        return OpenAICompatProvider(config)
    else:
        # Fallback para OpenAI compat
        logger.warning(
            f"Unknown LLM provider type '{provider_type}', falling back to openai_compat"
        )
        return OpenAICompatProvider(config)


def get_fresh_llm_provider() -> BaseLLMProvider:
    """
    Retorna nova instância do provider (sem cache).

    Útil para testes ou quando config muda.
    """
    config = get_llm_config()
    provider_type = getattr(settings, "LLM_PROVIDER", "openai_compat").lower()
    
    if provider_type in ("openai", "openai_compat"):
        return OpenAICompatProvider(config)
    else:
        return OpenAICompatProvider(config)


def check_llm_health() -> dict:
    """
    Verifica saúde do serviço LLM.

    Returns:
        Dict com status e detalhes
    """
    try:
        provider = get_fresh_llm_provider()
        is_healthy = provider.health_check()
        config = get_llm_config()
        provider_type = getattr(settings, "LLM_PROVIDER", "openai_compat").lower()

        return {
            "healthy": is_healthy,
            "provider": provider_type,
            "base_url": config.base_url,
            "model": config.model,
        }
    except Exception as e:
        logger.exception("LLM health check error")
        return {
            "healthy": False,
            "error": str(e),
        }
