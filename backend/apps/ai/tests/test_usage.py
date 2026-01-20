"""
Tests for AI Usage Tracking

Testa registro de uso de tokens LLM e endpoint de métricas.
"""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User
from apps.ai.models import AIJob, AIJobStatus, AIUsageLog
from apps.ai.agents.base import AgentContext, AgentResult, BaseAgent
from apps.ai.agents.registry import register_agent, _agent_registry
from apps.ai.providers.base import LLMResponse
from apps.ai.usage import AIUsageService
from apps.ai.views import AIUsageViewSet


class TestUsageAgent(BaseAgent):
    """Test agent for usage tracking tests."""

    agent_key = "test_usage"
    description = "Test agent for usage tracking"
    version = "1.0.0"
    require_llm = True

    def execute(self, input_data, context: AgentContext) -> AgentResult:
        """Execute test agent."""
        return AgentResult(success=True, data={"test": True})


class AIUsageServiceTests(TenantTestCase):
    """Tests for AIUsageService."""

    def test_record_llm_call_creates_log(self):
        """Test that record_llm_call creates an AIUsageLog entry."""
        context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
            user_id=None,
            job_id=None,
        )

        response = LLMResponse(
            content="Test response",
            tokens_prompt=10,
            tokens_completion=5,
            tokens_total=15,
            model="test-model",
            raw_response={"test": True},
        )

        # Should not raise
        AIUsageService.record_llm_call(
            context=context,
            agent_key="test_agent",
            response=response,
        )

        # Verify log was created
        self.assertEqual(AIUsageLog.objects.count(), 1)

        log = AIUsageLog.objects.first()
        self.assertEqual(log.agent_key, "test_agent")
        self.assertEqual(log.model, "test-model")
        self.assertEqual(log.input_tokens, 10)
        self.assertEqual(log.output_tokens, 5)
        self.assertEqual(log.total_tokens, 15)
        self.assertEqual(log.tenant_schema, "test_tenant")

    def test_record_llm_call_without_context(self):
        """Test recording without context uses current schema."""
        response = LLMResponse(
            content="Test",
            tokens_prompt=20,
            tokens_completion=10,
            tokens_total=30,
            model="another-model",
        )

        AIUsageService.record_llm_call(
            context=None,
            agent_key="contextless_agent",
            response=response,
        )

        self.assertEqual(AIUsageLog.objects.count(), 1)
        log = AIUsageLog.objects.first()
        self.assertEqual(log.agent_key, "contextless_agent")
        self.assertEqual(log.total_tokens, 30)

    def test_record_llm_call_preserves_extended_fields(self):
        """Test that extended performance fields are preserved in raw_usage."""
        context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="compat_test",
        )

        response = LLMResponse(
            content="Test response",
            tokens_prompt=11,
            tokens_completion=18,
            tokens_total=29,
            model="test-model",
            raw_response={
                "prompt_eval_count": 11,
                "eval_count": 18,
                "total_duration": 5000000000,
                "load_duration": 100000000,
                "prompt_eval_duration": 200000000,
                "eval_duration": 4700000000,
            },
        )

        AIUsageService.record_llm_call(
            context=context,
            agent_key="compat_agent",
            response=response,
        )

        log = AIUsageLog.objects.first()
        self.assertIn("prompt_eval_count", log.raw_usage)
        self.assertIn("eval_count", log.raw_usage)
        self.assertIn("total_duration", log.raw_usage)
        self.assertEqual(log.raw_usage["total_duration"], 5000000000)

    def test_record_llm_call_best_effort_no_exception(self):
        """Test that errors in record_llm_call don't propagate."""
        # Create a mock response with invalid data
        response = MagicMock()
        response.tokens_prompt = "invalid"  # Should cause error
        response.tokens_completion = 5
        response.tokens_total = 10
        response.model = "test"
        response.raw_response = {}

        # Should not raise even with bad data
        AIUsageService.record_llm_call(
            context=None,
            agent_key="error_test",
            response=response,
        )
        # No assertion needed - just verify no exception


class AIUsageLogModelTests(TenantTestCase):
    """Tests for AIUsageLog model."""

    def test_create_usage_log(self):
        """Test creating an AIUsageLog directly."""
        log = AIUsageLog.objects.create(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_schema",
            agent_key="preventive",
            model="mistral-nemo",
            provider="openai_compat",
            input_tokens=100,
            output_tokens=50,
            total_tokens=150,
            raw_usage={"test_key": "test_value"},
        )

        self.assertIsNotNone(log.id)
        self.assertEqual(log.agent_key, "preventive")
        self.assertEqual(log.total_tokens, 150)

    def test_usage_log_with_job_fk(self):
        """Test AIUsageLog with job foreign key."""
        job = AIJob.objects.create(
            tenant_id=uuid.uuid4(),
            agent_key="test_agent",
            input_data={},
        )

        log = AIUsageLog.objects.create(
            tenant_id=job.tenant_id,
            tenant_schema="test_schema",
            agent_key="test_agent",
            model="test-model",
            input_tokens=10,
            output_tokens=5,
            total_tokens=15,
            job=job,
        )

        self.assertEqual(log.job_id, job.id)
        self.assertEqual(job.usage_logs.count(), 1)


class BaseAgentCallLLMUsageTests(TenantTestCase):
    """Tests for BaseAgent.call_llm usage tracking integration."""

    @classmethod
    def setUpClass(cls):
        """Register test agent."""
        super().setUpClass()
        if "test_usage" not in _agent_registry:
            register_agent(TestUsageAgent)

    def setUp(self):
        """Set up test user."""
        super().setUp()
        # Create a real user so user_id FK works
        self.user = User.objects.create_user(
            username="llmtestuser",
            email="llmtest@example.com",
            password="testpass123",
        )

    @patch("apps.ai.agents.base.get_llm_provider")
    def test_call_llm_records_usage(self, mock_get_provider):
        """Test that call_llm automatically records usage."""
        # Setup mock provider
        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = LLMResponse(
            content="Test LLM response",
            tokens_prompt=25,
            tokens_completion=15,
            tokens_total=40,
            model="mocked-model",
            raw_response={"mocked": True},
        )
        mock_get_provider.return_value = mock_provider

        # Create agent and context with real user_id
        agent = TestUsageAgent()
        context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_schema",
            user_id=str(self.user.id),  # Use real user ID
            job_id=None,
        )

        # Call LLM with context
        response = agent.call_llm(
            user_prompt="Test prompt",
            context=context,
        )

        # Verify response
        self.assertEqual(response.content, "Test LLM response")

        # Verify usage was logged
        self.assertEqual(AIUsageLog.objects.count(), 1)

        log = AIUsageLog.objects.first()
        self.assertEqual(log.agent_key, "test_usage")
        self.assertEqual(log.model, "mocked-model")
        self.assertEqual(log.input_tokens, 25)
        self.assertEqual(log.output_tokens, 15)
        self.assertEqual(log.total_tokens, 40)

    @patch("apps.ai.agents.base.get_llm_provider")
    def test_call_llm_without_context_still_records(self, mock_get_provider):
        """Test that call_llm records usage even without explicit context."""
        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = LLMResponse(
            content="Response",
            tokens_prompt=10,
            tokens_completion=5,
            tokens_total=15,
            model="test-model",
        )
        mock_get_provider.return_value = mock_provider

        agent = TestUsageAgent()

        # Call without context
        agent.call_llm(user_prompt="Test")

        # Should still record usage
        self.assertEqual(AIUsageLog.objects.count(), 1)


class AIUsageMonthlyEndpointTests(TenantTestCase):
    """Tests for /api/ai/usage/monthly/ endpoint using APIRequestFactory."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.factory = APIRequestFactory()

        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        # Get tenant UUID
        self.tenant_id = AIUsageService.get_tenant_uuid()

    def _create_usage_logs(self):
        """Create test usage logs for different months."""
        now = timezone.now()

        # Current month logs
        AIUsageLog.objects.create(
            tenant_id=self.tenant_id,
            tenant_schema=self.tenant.schema_name,
            agent_key="preventive",
            model="glm-4.7-flash",
            input_tokens=100,
            output_tokens=50,
            total_tokens=150,
        )
        AIUsageLog.objects.create(
            tenant_id=self.tenant_id,
            tenant_schema=self.tenant.schema_name,
            agent_key="predictive",
            model="glm-4.7-flash",
            input_tokens=200,
            output_tokens=100,
            total_tokens=300,
        )

        # Last month logs
        last_month = now - timedelta(days=35)
        log = AIUsageLog.objects.create(
            tenant_id=self.tenant_id,
            tenant_schema=self.tenant.schema_name,
            agent_key="patterns",
            model="llama3",
            input_tokens=300,
            output_tokens=150,
            total_tokens=450,
        )
        # Manually set created_at to last month
        AIUsageLog.objects.filter(id=log.id).update(created_at=last_month)

    def test_monthly_endpoint_requires_auth(self):
        """Test that endpoint requires authentication."""
        view = AIUsageViewSet.as_view({"get": "monthly"})
        request = self.factory.get("/api/ai/usage/monthly/")
        # No authentication
        response = view(request)
        self.assertEqual(response.status_code, 401)

    def test_monthly_endpoint_returns_buckets(self):
        """Test that endpoint returns monthly buckets."""
        self._create_usage_logs()

        view = AIUsageViewSet.as_view({"get": "monthly"})
        request = self.factory.get("/api/ai/usage/monthly/")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data

        self.assertIn("buckets", data)
        self.assertIn("totals", data)
        self.assertIn("tenant_schema", data)

        # Should have at least one bucket
        self.assertGreaterEqual(len(data["buckets"]), 1)

        # Check bucket structure
        bucket = data["buckets"][0]
        self.assertIn("month", bucket)
        self.assertIn("input_tokens", bucket)
        self.assertIn("output_tokens", bucket)
        self.assertIn("total_tokens", bucket)
        self.assertIn("calls", bucket)

    def test_monthly_endpoint_filter_by_agent(self):
        """Test filtering by agent_key."""
        self._create_usage_logs()

        view = AIUsageViewSet.as_view({"get": "monthly"})
        request = self.factory.get("/api/ai/usage/monthly/", {"agent": "preventive"})
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data

        self.assertEqual(data["filters"]["agent"], "preventive")
        # Should only have preventive agent data
        if data["buckets"]:
            total_tokens = sum(b["total_tokens"] for b in data["buckets"])
            self.assertEqual(total_tokens, 150)

    def test_monthly_endpoint_filter_by_model(self):
        """Test filtering by model."""
        self._create_usage_logs()

        view = AIUsageViewSet.as_view({"get": "monthly"})
        request = self.factory.get("/api/ai/usage/monthly/", {"model": "glm-4.7-flash"})
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data

        self.assertEqual(data["filters"]["model"], "glm-4.7-flash")

    def test_monthly_endpoint_respects_months_param(self):
        """Test months parameter limits date range."""
        self._create_usage_logs()

        view = AIUsageViewSet.as_view({"get": "monthly"})
        request = self.factory.get("/api/ai/usage/monthly/", {"months": "1"})
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data

        self.assertEqual(data["months_requested"], 1)

    def test_monthly_endpoint_calculates_totals(self):
        """Test that totals are correctly calculated."""
        self._create_usage_logs()

        view = AIUsageViewSet.as_view({"get": "monthly"})
        request = self.factory.get("/api/ai/usage/monthly/")
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data

        # Verify totals match sum of buckets
        bucket_input_sum = sum(b["input_tokens"] for b in data["buckets"])
        bucket_output_sum = sum(b["output_tokens"] for b in data["buckets"])
        bucket_total_sum = sum(b["total_tokens"] for b in data["buckets"])
        bucket_calls_sum = sum(b["calls"] for b in data["buckets"])

        self.assertEqual(data["totals"]["input_tokens"], bucket_input_sum)
        self.assertEqual(data["totals"]["output_tokens"], bucket_output_sum)
        self.assertEqual(data["totals"]["total_tokens"], bucket_total_sum)
        self.assertEqual(data["totals"]["calls"], bucket_calls_sum)
