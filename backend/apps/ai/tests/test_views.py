"""
Tests for AI API Views

Uses APIRequestFactory pattern for proper multi-tenant testing.
Following the same pattern as apps/trakservice/tests/test_trakservice_api.py
"""

import uuid
from unittest.mock import patch, MagicMock

from django.db import connection
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

from apps.accounts.models import User
from apps.ai.models import AIJob, AIJobStatus
from apps.ai.views import AIJobViewSet, AgentViewSet, AIHealthViewSet
from apps.ai.agents.registry import register_agent, _agent_registry
from apps.ai.agents.dummy import DummyAgent


class AIJobViewSetTests(TenantTestCase):
    """Tests for AIJobViewSet using APIRequestFactory."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Clean any existing AIJobs from previous tests
        AIJob.objects.all().delete()
        
        # Create test user in tenant context
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        
        # Create tenant UUID
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )

    def _get_authenticated_request(self, method, path, data=None):
        """Helper to create authenticated request."""
        if method == "GET":
            request = self.factory.get(path)
        elif method == "POST":
            request = self.factory.post(path, data=data, format="json")
        else:
            request = self.factory.get(path)
        
        force_authenticate(request, user=self.user)
        return request

    def test_list_jobs_success(self):
        """Test listing jobs returns valid response with correct structure."""
        from django.db import connection
        service_tenant_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"tenant:{connection.schema_name}")
        
        # Get initial count
        initial_count = AIJob.objects.filter(tenant_id=service_tenant_id).count()
        
        # Create a job
        job = AIJob.objects.create(
            tenant_id=service_tenant_id,
            agent_key="dummy",
            input_data={"test": True},
        )

        request = self._get_authenticated_request("GET", "/api/ai/jobs/")
        view = AIJobViewSet.as_view({"get": "list"})
        
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle both paginated and non-paginated responses
        if isinstance(response.data, dict) and "results" in response.data:
            # Paginated response
            results = response.data["results"]
            self.assertIn("count", response.data)
        else:
            # Non-paginated response
            results = response.data
            
        self.assertIsInstance(results, list)
        # Should have at least the job we created
        self.assertGreaterEqual(len(results), 1)
        
        # Verify our job is in the response
        job_ids = [j["id"] for j in results]
        self.assertIn(str(job.id), job_ids)

    def test_retrieve_job(self):
        """Test retrieving single job."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            input_data={"test": True},
        )

        request = self._get_authenticated_request("GET", f"/api/ai/jobs/{job.id}/")
        view = AIJobViewSet.as_view({"get": "retrieve"})
        
        response = view(request, id=str(job.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(job.id))
        self.assertEqual(response.data["agent_key"], "dummy")

    def test_retrieve_nonexistent_job(self):
        """Test retrieving nonexistent job returns 404."""
        fake_id = uuid.uuid4()
        
        request = self._get_authenticated_request("GET", f"/api/ai/jobs/{fake_id}/")
        view = AIJobViewSet.as_view({"get": "retrieve"})
        
        response = view(request, id=str(fake_id))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_access_denied(self):
        """Test unauthenticated access is denied."""
        request = self.factory.get("/api/ai/jobs/")
        # Don't set request.user - simulate unauthenticated
        request.user = MagicMock()
        request.user.is_authenticated = False
        
        view = AIJobViewSet.as_view({"get": "list"})
        
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AgentViewSetTests(TenantTestCase):
    """Tests for AgentViewSet using APIRequestFactory."""

    @classmethod
    def setUpClass(cls):
        """Ensure DummyAgent is registered before tests."""
        super().setUpClass()
        # Register dummy agent if not already registered
        if "dummy" not in _agent_registry:
            register_agent(DummyAgent)

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        
        # Ensure dummy agent is registered
        if "dummy" not in _agent_registry:
            register_agent(DummyAgent)
        
        # Create tenant UUID
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )

    def _get_authenticated_request(self, method, path, data=None):
        """Helper to create authenticated request."""
        if method == "GET":
            request = self.factory.get(path)
        elif method == "POST":
            request = self.factory.post(path, data=data, format="json")
        else:
            request = self.factory.get(path)
        
        force_authenticate(request, user=self.user)
        return request

    def test_list_agents(self):
        """Test listing available agents."""
        request = self._get_authenticated_request("GET", "/api/ai/agents/")
        view = AgentViewSet.as_view({"get": "list"})
        
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Should have at least the dummy agent
        keys = [a["key"] for a in response.data]
        self.assertIn("dummy", keys)

    @patch("apps.ai.views.execute_ai_job.delay")
    def test_run_agent_success(self, mock_task):
        """Test running an agent creates job."""
        # Set connection.tenant for the view to use
        connection.tenant = self.tenant
        
        request = self._get_authenticated_request(
            "POST", 
            "/api/ai/agents/dummy/run/",
            data={"input": {"test": True}}
        )
        view = AgentViewSet.as_view({"post": "run"})
        
        response = view(request, pk="dummy")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("job_id", response.data)
        self.assertEqual(response.data["status"], AIJobStatus.PENDING)
        self.assertTrue(response.data["created"])

        # Task should be enqueued
        mock_task.assert_called_once()

    def test_run_nonexistent_agent(self):
        """Test running nonexistent agent returns 404."""
        connection.tenant = self.tenant
        
        request = self._get_authenticated_request(
            "POST",
            "/api/ai/agents/nonexistent/run/",
            data={"input": {}}
        )
        view = AgentViewSet.as_view({"post": "run"})
        
        response = view(request, pk="nonexistent")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("apps.ai.views.execute_ai_job.delay")
    def test_run_agent_with_idempotency(self, mock_task):
        """Test running agent with idempotency key."""
        connection.tenant = self.tenant
        
        data = {
            "input": {"test": True},
            "idempotency_key": "unique-test-key",
        }

        # First call
        request1 = self._get_authenticated_request(
            "POST",
            "/api/ai/agents/dummy/run/",
            data=data
        )
        view = AgentViewSet.as_view({"post": "run"})
        response1 = view(request1, pk="dummy")
        
        self.assertEqual(response1.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response1.data["created"])
        job_id = response1.data["job_id"]

        # Second call with same key
        request2 = self._get_authenticated_request(
            "POST",
            "/api/ai/agents/dummy/run/",
            data=data
        )
        response2 = view(request2, pk="dummy")
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertFalse(response2.data["created"])

        # Same job ID
        self.assertEqual(response1.data["job_id"], response2.data["job_id"])

        # Task only called once
        self.assertEqual(mock_task.call_count, 1)

    @patch("apps.ai.views.execute_ai_job.delay")
    def test_run_agent_with_related(self, mock_task):
        """Test running agent with related object."""
        connection.tenant = self.tenant
        
        related_id = str(uuid.uuid4())
        request = self._get_authenticated_request(
            "POST",
            "/api/ai/agents/dummy/run/",
            data={
                "input": {"alert_id": related_id},
                "related": {"type": "alert", "id": related_id},
            }
        )
        view = AgentViewSet.as_view({"post": "run"})
        
        response = view(request, pk="dummy")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # Check job was created with related info
        job = AIJob.objects.get(id=response.data["job_id"])
        self.assertEqual(job.related_type, "alert")
        self.assertEqual(str(job.related_id), related_id)


class AIHealthViewSetTests(TenantTestCase):
    """Tests for AIHealthViewSet using APIRequestFactory."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser3",
            email="test3@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def _get_authenticated_request(self, method, path, data=None):
        """Helper to create authenticated request."""
        if method == "GET":
            request = self.factory.get(path)
        elif method == "POST":
            request = self.factory.post(path, data=data, format="json")
        else:
            request = self.factory.get(path)
        
        force_authenticate(request, user=self.user)
        return request

    @patch("apps.ai.views.check_llm_health")
    def test_health_check(self, mock_health):
        """Test health check endpoint."""
        mock_health.return_value = {
            "healthy": True,
            "provider": "openai_compat",
            "base_url": "https://api.z.ai/api/paas/v4",
            "model": "glm-4.7-flash",
        }

        request = self._get_authenticated_request("GET", "/api/ai/health/")
        view = AIHealthViewSet.as_view({"get": "list"})
        
        response = view(request)

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

        request = self._get_authenticated_request("GET", "/api/ai/health/")
        view = AIHealthViewSet.as_view({"get": "list"})
        
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "degraded")
