"""
Tests for AI Agents
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.ai.agents.base import AgentContext, AgentResult, BaseAgent
from apps.ai.agents.dummy import DummyAgent
from apps.ai.agents.registry import (
    clear_registry,
    get_agent,
    get_registered_agents,
    is_agent_registered,
    register_agent,
)


class AgentContextTests(TestCase):
    """Tests for AgentContext dataclass."""

    def test_create_context(self):
        """Test creating agent context."""
        ctx = AgentContext(
            tenant_id="test-tenant-id",
            tenant_schema="test_schema",
            user_id="user-123",
            job_id="job-456",
        )

        self.assertEqual(ctx.tenant_id, "test-tenant-id")
        self.assertEqual(ctx.tenant_schema, "test_schema")
        self.assertEqual(ctx.user_id, "user-123")
        self.assertEqual(ctx.job_id, "job-456")

    def test_context_optional_fields(self):
        """Test context with minimal required fields."""
        ctx = AgentContext(
            tenant_id="test-tenant-id",
            tenant_schema="test_schema",
        )

        self.assertIsNone(ctx.user_id)
        self.assertIsNone(ctx.job_id)
        self.assertEqual(ctx.extra, {})


class AgentResultTests(TestCase):
    """Tests for AgentResult dataclass."""

    def test_create_success_result(self):
        """Test creating successful result."""
        result = AgentResult(
            success=True,
            data={"message": "OK"},
            tokens_used=100,
            execution_time_ms=500,
        )

        self.assertTrue(result.success)
        self.assertEqual(result.data, {"message": "OK"})
        self.assertEqual(result.tokens_used, 100)
        self.assertIsNone(result.error)

    def test_create_failure_result(self):
        """Test creating failure result."""
        result = AgentResult(
            success=False,
            data={},
            error="Something went wrong",
            error_details={"type": "ValueError"},
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error, "Something went wrong")
        self.assertEqual(result.error_details, {"type": "ValueError"})


class AgentRegistryTests(TestCase):
    """Tests for agent registry."""

    def setUp(self):
        """Clear registry before each test."""
        clear_registry()

    def tearDown(self):
        """Clear registry after each test."""
        clear_registry()

    def test_register_agent(self):
        """Test registering an agent."""

        @register_agent
        class TestAgent(BaseAgent):
            agent_key = "test_agent"
            description = "Test agent"

            def execute(self, input_data, context):
                return AgentResult(success=True, data={})

        self.assertTrue(is_agent_registered("test_agent"))

    def test_get_agent(self):
        """Test getting registered agent."""

        @register_agent
        class TestAgent(BaseAgent):
            agent_key = "get_test"
            description = "Test"

            def execute(self, input_data, context):
                return AgentResult(success=True, data={})

        agent = get_agent("get_test")
        self.assertIsNotNone(agent)
        self.assertEqual(agent.agent_key, "get_test")

    def test_get_unregistered_agent(self):
        """Test getting unregistered agent returns None."""
        agent = get_agent("nonexistent")
        self.assertIsNone(agent)

    def test_get_registered_agents(self):
        """Test listing registered agents."""

        @register_agent
        class Agent1(BaseAgent):
            agent_key = "agent_1"
            description = "First agent"

            def execute(self, input_data, context):
                return AgentResult(success=True, data={})

        @register_agent
        class Agent2(BaseAgent):
            agent_key = "agent_2"
            description = "Second agent"

            def execute(self, input_data, context):
                return AgentResult(success=True, data={})

        agents = get_registered_agents()
        self.assertEqual(len(agents), 2)
        keys = [a["key"] for a in agents]
        self.assertIn("agent_1", keys)
        self.assertIn("agent_2", keys)


class DummyAgentTests(TestCase):
    """Tests for DummyAgent."""

    def setUp(self):
        """Set up test agent and context."""
        self.agent = DummyAgent()
        self.context = AgentContext(
            tenant_id="test-tenant",
            tenant_schema="test_schema",
            job_id="job-123",
        )

    def test_agent_metadata(self):
        """Test agent has correct metadata."""
        self.assertEqual(self.agent.agent_key, "dummy")
        self.assertFalse(self.agent.require_llm)

    def test_execute_success(self):
        """Test successful execution."""
        result = self.agent.execute({"test": True}, self.context)

        self.assertTrue(result.success)
        self.assertEqual(result.data["agent_key"], "dummy")
        self.assertEqual(result.data["tenant_id"], "test-tenant")
        self.assertEqual(result.tokens_used, 0)

    def test_execute_with_echo(self):
        """Test echo functionality."""
        result = self.agent.execute({"echo": "Hello!"}, self.context)

        self.assertTrue(result.success)
        self.assertEqual(result.data["echo"], "Hello!")

    def test_execute_with_delay(self):
        """Test delay simulation."""
        import time

        start = time.time()
        result = self.agent.execute({"simulate_delay": 0.1}, self.context)
        elapsed = time.time() - start

        self.assertTrue(result.success)
        self.assertGreaterEqual(elapsed, 0.1)

    def test_validate_input_failure(self):
        """Test input validation failure."""
        is_valid, error = self.agent.validate_input({"simulate_failure": True})

        self.assertFalse(is_valid)
        self.assertIn("failure", error.lower())

    def test_execute_with_error(self):
        """Test error simulation."""
        result = self.agent.run({"simulate_error": True}, self.context)

        self.assertFalse(result.success)
        self.assertIn("error", result.error.lower())

    def test_run_wraps_execute(self):
        """Test run() wraps execute() with error handling."""
        result = self.agent.run({"test": True}, self.context)

        self.assertTrue(result.success)
        # execution_time_ms may be 0 for very fast executions
        self.assertGreaterEqual(result.execution_time_ms, 0)
