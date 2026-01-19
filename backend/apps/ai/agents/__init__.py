# AI Agents - Agent implementations
from .registry import get_agent, get_registered_agents, register_agent

# Auto-import agents to trigger registration via @register_agent decorator
from .dummy import DummyAgent  # noqa: F401
from .root_cause import RootCauseAgent  # noqa: F401
from .inventory import InventoryAgent  # noqa: F401
from .preventive import PreventiveAgent  # noqa: F401
from .predictive import PredictiveAgent  # noqa: F401
from .patterns import PatternsAgent  # noqa: F401
from .quick_repair import QuickRepairAgent  # noqa: F401

__all__ = ["register_agent", "get_agent", "get_registered_agents"]
