"""
Pytest configuration for AI tests.

This file ensures that all agents are imported and registered
before any tests run, fixing the "agent not found" issues.
"""

# Force import of all agent modules to trigger registration
# This must happen at module load time
from apps.ai.agents.dummy import DummyAgent  # noqa: F401
from apps.ai.agents.root_cause import RootCauseAgent  # noqa: F401
from apps.ai.agents.inventory import InventoryAgent  # noqa: F401
from apps.ai.agents.preventive import PreventiveAgent  # noqa: F401
from apps.ai.agents.predictive import PredictiveAgent  # noqa: F401
from apps.ai.agents.patterns import PatternsAgent  # noqa: F401
from apps.ai.agents.quick_repair import QuickRepairAgent  # noqa: F401
