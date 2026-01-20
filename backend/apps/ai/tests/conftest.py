"""
Pytest configuration for AI tests.

This file ensures that all agents are imported and registered
before any tests run, fixing the "agent not found" issues.
"""

import pytest

# Import agents module to trigger registration via @register_agent decorators
# This must happen before any test that uses get_agent or get_registered_agents
import apps.ai.agents  # noqa: F401


@pytest.fixture(autouse=True)
def ensure_agents_registered():
    """
    Fixture that runs before each test to ensure agents are registered.
    
    The import above should handle registration, but this fixture
    provides a hook for any additional setup needed.
    """
    # Import is already done at module level
    # This fixture just documents the requirement
    pass
