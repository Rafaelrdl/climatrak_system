# AI Agents - Agent implementations
from .registry import get_agent, get_registered_agents, register_agent

# Auto-import agents to trigger registration via @register_agent decorator
from .dummy import DummyAgent  # noqa: F401
from .root_cause import RootCauseAgent  # noqa: F401

__all__ = ["register_agent", "get_agent", "get_registered_agents"]
