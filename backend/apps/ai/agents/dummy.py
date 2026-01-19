"""
AI Agents - Dummy Agent (para testes)

Agente simples para validar infraestrutura.
Não faz chamada real ao LLM.
"""

import time
from typing import Any, Dict

from .base import AgentContext, AgentResult, BaseAgent
from .registry import register_agent


@register_agent
class DummyAgent(BaseAgent):
    """
    Agente dummy para testes de infraestrutura.

    Não faz chamada real ao LLM.
    Retorna dados de teste para validar pipeline.
    """

    agent_key = "dummy"
    description = "Agente de teste para validar infraestrutura de IA"
    version = "1.0.0"
    require_llm = False

    def validate_input(self, input_data: Dict[str, Any]) -> tuple[bool, str | None]:
        """Valida entrada (aceita qualquer coisa)."""
        # Simula falha se input contiver "fail"
        if input_data.get("simulate_failure"):
            return False, "Simulated validation failure"
        return True, None

    def execute(self, input_data: Dict[str, Any], context: AgentContext) -> AgentResult:
        """
        Executa agente dummy.

        Comportamentos especiais baseados em input:
        - simulate_delay: Aguarda N segundos
        - simulate_error: Levanta exceção
        - echo: Retorna o próprio input
        """
        start_time = time.time()

        # Simular delay se solicitado
        delay = input_data.get("simulate_delay", 0)
        if delay > 0:
            time.sleep(min(delay, 5))  # Max 5 segundos

        # Simular erro se solicitado
        if input_data.get("simulate_error"):
            raise RuntimeError("Simulated agent error")

        # Construir resposta
        response_data = {
            "message": "Dummy agent executed successfully",
            "agent_key": self.agent_key,
            "agent_version": self.version,
            "tenant_id": context.tenant_id,
            "tenant_schema": context.tenant_schema,
            "job_id": context.job_id,
            "input_received": input_data,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        }

        # Modo echo
        if input_data.get("echo"):
            response_data["echo"] = input_data.get("echo")

        execution_time_ms = int((time.time() - start_time) * 1000)

        return AgentResult(
            success=True,
            data=response_data,
            tokens_used=0,  # Não usa LLM
            execution_time_ms=execution_time_ms,
        )
