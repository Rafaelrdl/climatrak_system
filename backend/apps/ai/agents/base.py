"""
AI Agents - Base Agent Class

Define interface abstrata para agentes de IA.
Todos os agentes herdam desta classe base.
"""

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Type

from ..providers.base import LLMMessage, LLMResponse
from ..providers.factory import get_llm_provider

logger = logging.getLogger(__name__)


@dataclass
class AgentContext:
    """Contexto de execução do agente."""

    tenant_id: str
    tenant_schema: str
    user_id: Optional[str] = None
    job_id: Optional[str] = None
    related_type: Optional[str] = None
    related_id: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    """Resultado da execução do agente."""

    success: bool
    data: Dict[str, Any]
    tokens_used: int = 0
    execution_time_ms: int = 0
    error: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None


class BaseAgent(ABC):
    """
    Classe base para agentes de IA.

    Cada agente deve:
    - Implementar `execute()` com a lógica específica
    - Definir `agent_key` como identificador único
    - Definir `description` para documentação

    Exemplo:
        class RootCauseAgent(BaseAgent):
            agent_key = "root_cause"
            description = "Analisa causa raiz de alertas"

            def execute(self, input_data: dict, context: AgentContext) -> AgentResult:
                # Lógica do agente
                ...
    """

    agent_key: str = ""
    description: str = ""
    version: str = "1.0.0"

    # Configurações padrão (podem ser sobrescritas por subclasse)
    default_temperature: float = 0.2
    default_max_tokens: int = 2048
    require_llm: bool = True  # Se True, usa LLM; se False, apenas heurística

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._provider = None

    @property
    def provider(self):
        """Retorna provider LLM (lazy loading)."""
        if self._provider is None:
            self._provider = get_llm_provider()
        return self._provider

    @abstractmethod
    def execute(self, input_data: Dict[str, Any], context: AgentContext) -> AgentResult:
        """
        Executa a lógica do agente.

        Args:
            input_data: Dados de entrada específicos do agente
            context: Contexto de execução (tenant, user, etc.)

        Returns:
            AgentResult com dados de saída ou erro
        """
        pass

    def validate_input(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Valida dados de entrada.

        Override para adicionar validação específica.

        Args:
            input_data: Dados a validar

        Returns:
            Tuple (is_valid, error_message)
        """
        return True, None

    def get_system_prompt(self) -> str:
        """
        Retorna prompt de sistema para o agente.

        Override para customizar comportamento do LLM.
        """
        return (
            "Você é um assistente especializado em manutenção industrial e HVAC. "
            "Responda de forma técnica, precisa e objetiva. "
            "Sempre estruture sua resposta em JSON válido."
        )

    def build_user_prompt(self, input_data: Dict[str, Any], context_data: Dict[str, Any]) -> str:
        """
        Constrói prompt do usuário com dados de entrada e contexto.

        Override para customizar formato do prompt.
        """
        return f"Input: {input_data}\n\nContexto: {context_data}"

    def call_llm(
        self,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """
        Chama o LLM com os prompts fornecidos.

        Args:
            user_prompt: Prompt do usuário
            system_prompt: Prompt de sistema (usa default se None)
            temperature: Temperatura (usa default se None)
            max_tokens: Max tokens (usa default se None)

        Returns:
            LLMResponse com resposta do LLM
        """
        messages = [
            LLMMessage(role="system", content=system_prompt or self.get_system_prompt()),
            LLMMessage(role="user", content=user_prompt),
        ]

        return self.provider.chat_sync(
            messages=messages,
            temperature=temperature or self.default_temperature,
            max_tokens=max_tokens or self.default_max_tokens,
        )

    def gather_context(self, input_data: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """
        Coleta contexto adicional para o agente.

        Override para buscar dados do banco (alertas, OS, telemetria, etc.).

        Args:
            input_data: Dados de entrada
            context: Contexto de execução

        Returns:
            Dict com dados de contexto coletados
        """
        return {}

    def run(self, input_data: Dict[str, Any], context: AgentContext) -> AgentResult:
        """
        Executa o agente com timing e tratamento de erro.

        Este método é chamado pela task Celery.
        Não deve ser sobrescrito - use `execute()` para lógica.
        """
        start_time = time.time()

        try:
            # Validar input
            is_valid, error_msg = self.validate_input(input_data)
            if not is_valid:
                return AgentResult(
                    success=False,
                    data={},
                    error=error_msg,
                )

            # Executar lógica do agente
            result = self.execute(input_data, context)

            # Adicionar tempo de execução se não definido
            if result.execution_time_ms == 0:
                result.execution_time_ms = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            self.logger.exception(f"Agent {self.agent_key} execution error")
            execution_time_ms = int((time.time() - start_time) * 1000)

            return AgentResult(
                success=False,
                data={},
                execution_time_ms=execution_time_ms,
                error=str(e),
                error_details={
                    "type": type(e).__name__,
                    "message": str(e),
                },
            )

    def __repr__(self):
        return f"<{self.__class__.__name__}(key={self.agent_key}, version={self.version})>"
