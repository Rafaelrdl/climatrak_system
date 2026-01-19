"""
Tests for AI API Views
"""

import uuid
from unittest.mock import patch

from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient
from rest_framework import status

from apps.accounts.models import User
from apps.ai.models import AIJob, AIJobStatus


class AIJobViewSetTests(TenantTestCase):
    """Tests for AIJobViewSet."""

    def setUp(self):
        """Set up test data."""
        self.client = TenantClient(self.tenant)

        # Create test user
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.client.force_login(self.user)

        # Create tenant UUID
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )

    def test_list_jobs_empty(self):
        """Test listing jobs when none exist."""
        response = self.client.get("/api/ai/jobs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_jobs_with_data(self):
        """Test listing jobs with data."""
        # Create some jobs
        AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            input_data={},
        )
        AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            input_data={},
        )

        response = self.client.get("/api/ai/jobs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_retrieve_job(self):
        """Test retrieving single job."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            input_data={"test": True},
        )

        response = self.client.get(f"/api/ai/jobs/{job.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(job.id))
        self.assertEqual(response.data["agent_key"], "dummy")

    def test_retrieve_nonexistent_job(self):
        """Test retrieving nonexistent job returns 404."""
        fake_id = uuid.uuid4()
        response = self.client.get(f"/api/ai/jobs/{fake_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_access_denied(self):
        """Test unauthenticated access is denied."""
        self.client.logout()

        response = self.client.get("/api/ai/jobs/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AgentViewSetTests(TenantTestCase):
    """Tests for AgentViewSet."""

    def setUp(self):
        """Set up test data."""
        self.client = TenantClient(self.tenant)

        # Create test user
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.client.force_login(self.user)

    def test_list_agents(self):
        """Test listing available agents."""
        response = self.client.get("/api/ai/agents/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Should have at least the dummy agent
        keys = [a["key"] for a in response.data]
        self.assertIn("dummy", keys)

    @patch("apps.ai.views.execute_ai_job.delay")
    def test_run_agent_success(self, mock_task):
        """Test running an agent creates job."""
        response = self.client.post(
            "/api/ai/agents/dummy/run/",
            data={"input": {"test": True}},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("job_id", response.data)
        self.assertEqual(response.data["status"], AIJobStatus.PENDING)
        self.assertTrue(response.data["created"])

        # Task should be enqueued
        mock_task.assert_called_once()

    def test_run_nonexistent_agent(self):
        """Test running nonexistent agent returns 404."""
        response = self.client.post(
            "/api/ai/agents/nonexistent/run/",
            data={"input": {}},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("apps.ai.views.execute_ai_job.delay")
    def test_run_agent_with_idempotency(self, mock_task):
        """Test running agent with idempotency key."""
        data = {
            "input": {"test": True},
            "idempotency_key": "unique-test-key",
        }

        # First call
        response1 = self.client.post(
            "/api/ai/agents/dummy/run/",
            data=data,
            content_type="application/json",
        )
        self.assertEqual(response1.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response1.data["created"])

        # Second call with same key
        response2 = self.client.post(
            "/api/ai/agents/dummy/run/",
            data=data,
            content_type="application/json",
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertFalse(response2.data["created"])

        # Same job ID
        self.assertEqual(response1.data["job_id"], response2.data["job_id"])

        # Task only called once
        self.assertEqual(mock_task.call_count, 1)

    @patch("apps.ai.views.execute_ai_job.delay")
    def test_run_agent_with_related(self, mock_task):
        """Test running agent with related object."""
        related_id = str(uuid.uuid4())
        response = self.client.post(
            "/api/ai/agents/dummy/run/",
            data={
                "input": {"alert_id": related_id},
                "related": {"type": "alert", "id": related_id},
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # Check job was created with related info
        job = AIJob.objects.get(id=response.data["job_id"])
        self.assertEqual(job.related_type, "alert")
        self.assertEqual(str(job.related_id), related_id)


class AIHealthViewSetTests(TenantTestCase):
    """Tests for AIHealthViewSet."""

    def setUp(self):
        """Set up test data."""
        self.client = TenantClient(self.tenant)

        # Create test user
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.client.force_login(self.user)

    @patch("apps.ai.views.check_llm_health")
    def test_health_check(self, mock_health):
        """Test health check endpoint."""
        mock_health.return_value = {
            "healthy": True,
            "provider": "openai_compat",
            "base_url": "http://ollama:11434/v1",
            "model": "mistral-nemo",
        }

        response = self.client.get("/api/ai/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("llm", response.data)
        self.assertIn("agents", response.data)
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "healthy")

    @patch("apps.ai.views.check_llm_health")
    def test_health_check_degraded(self, mock_health):
        """Test health check when LLM is down."""
        mock_health.return_value = {
            "healthy": False,
            "error": "Connection refused",
        }

        response = self.client.get("/api/ai/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "degraded")
