"""
AI Providers - Base LLM Client

Define interface abstrata para provedores de LLM.
Implementações específicas herdam desta classe.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class LLMMessage:
    """Mensagem no formato chat."""

    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class LLMResponse:
    """Resposta do LLM."""

    content: str
    tokens_prompt: int = 0
    tokens_completion: int = 0
    tokens_total: int = 0
    model: str = ""
    finish_reason: str = ""
    raw_response: Dict[str, Any] = field(default_factory=dict)

    @property
    def tokens_used(self) -> int:
        """Total de tokens utilizados."""
        return self.tokens_total or (self.tokens_prompt + self.tokens_completion)


@dataclass
class LLMConfig:
    """Configuração do cliente LLM."""

    base_url: str
    model: str
    api_key: str = ""
    temperature: float = 0.2
    max_tokens: int = 4096
    timeout_seconds: int = 120
    retry_attempts: int = 3
    retry_delay: float = 1.0


class BaseLLMProvider(ABC):
    """
    Interface abstrata para provedores de LLM.

    Todas as implementações (OpenAI, Z.ai, vLLM) devem herdar desta classe.
    """

    def __init__(self, config: LLMConfig):
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @abstractmethod
    async def chat_async(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Envia mensagens para o LLM de forma assíncrona.

        Args:
            messages: Lista de mensagens no formato chat
            temperature: Temperatura para sampling (override)
            max_tokens: Máximo de tokens na resposta (override)
            **kwargs: Parâmetros adicionais específicos do provider

        Returns:
            LLMResponse com conteúdo e métricas
        """
        pass

    @abstractmethod
    def chat_sync(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Envia mensagens para o LLM de forma síncrona.

        Args:
            messages: Lista de mensagens no formato chat
            temperature: Temperatura para sampling (override)
            max_tokens: Máximo de tokens na resposta (override)
            **kwargs: Parâmetros adicionais específicos do provider

        Returns:
            LLMResponse com conteúdo e métricas
        """
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """
        Verifica se o provider está disponível.

        Returns:
            True se o provider está healthy
        """
        pass

    def _build_messages_payload(
        self, messages: List[LLMMessage]
    ) -> List[Dict[str, str]]:
        """Converte mensagens para formato de payload."""
        return [{"role": msg.role, "content": msg.content} for msg in messages]
