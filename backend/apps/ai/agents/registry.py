"""
AI Agents - Registry

Gerencia registro e descoberta de agentes disponíveis.
"""

import logging
from typing import Dict, List, Optional, Type

from .base import BaseAgent

logger = logging.getLogger(__name__)

# Registry global de agentes
_agent_registry: Dict[str, Type[BaseAgent]] = {}


def register_agent(agent_class: Type[BaseAgent]) -> Type[BaseAgent]:
    """
    Decorator para registrar um agente.

    Uso:
        @register_agent
        class MyAgent(BaseAgent):
            agent_key = "my_agent"
            ...

    Args:
        agent_class: Classe do agente a registrar

    Returns:
        A mesma classe (para uso como decorator)
    """
    if not agent_class.agent_key:
        raise ValueError(f"Agent {agent_class.__name__} must define agent_key")

    if agent_class.agent_key in _agent_registry:
        logger.warning(
            f"Agent {agent_class.agent_key} already registered, overwriting"
        )

    _agent_registry[agent_class.agent_key] = agent_class
    logger.info(f"Registered agent: {agent_class.agent_key} ({agent_class.__name__})")

    return agent_class


def get_agent(agent_key: str) -> Optional[BaseAgent]:
    """
    Retorna instância do agente pelo key.

    Args:
        agent_key: Identificador único do agente

    Returns:
        Instância do agente ou None se não encontrado
    """
    agent_class = _agent_registry.get(agent_key)
    if agent_class is None:
        return None
    return agent_class()


def get_agent_class(agent_key: str) -> Optional[Type[BaseAgent]]:
    """
    Retorna classe do agente pelo key.

    Args:
        agent_key: Identificador único do agente

    Returns:
        Classe do agente ou None se não encontrado
    """
    return _agent_registry.get(agent_key)


def get_registered_agents() -> List[dict]:
    """
    Retorna lista de agentes registrados.

    Returns:
        Lista de dicts com info de cada agente
    """
    agents = []
    for key, agent_class in _agent_registry.items():
        agents.append({
            "key": key,
            "name": agent_class.__name__,
            "description": agent_class.description,
            "version": agent_class.version,
            "require_llm": agent_class.require_llm,
        })
    return agents


def is_agent_registered(agent_key: str) -> bool:
    """Verifica se agente está registrado."""
    return agent_key in _agent_registry


def clear_registry():
    """Limpa registry (para testes)."""
    _agent_registry.clear()
