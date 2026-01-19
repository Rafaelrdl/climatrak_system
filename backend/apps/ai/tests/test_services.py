"""
Tests for AI Services
"""

import uuid
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

from apps.ai.models import AIJob, AIJobStatus
from apps.ai.services import AIJobService
from apps.ai.agents.registry import register_agent, _agent_registry
from apps.ai.agents.dummy import DummyAgent


class AIJobServiceTests(TenantTestCase):
    """Tests for AIJobService."""

    @classmethod
    def setUpClass(cls):
        """Ensure DummyAgent is registered before tests."""
        super().setUpClass()
        # Register dummy agent if not already registered
        if "dummy" not in _agent_registry:
            register_agent(DummyAgent)

    def test_create_job_success(self):
        """Test creating a new job."""
        job, created = AIJobService.create_job(
            agent_key="dummy",
            input_data={"test": True},
        )

        self.assertTrue(created)
        self.assertEqual(job.agent_key, "dummy")
        self.assertEqual(job.input_data, {"test": True})
        self.assertEqual(job.status, AIJobStatus.PENDING)

    def test_create_job_invalid_agent(self):
        """Test creating job with invalid agent raises error."""
        with self.assertRaises(ValueError) as ctx:
            AIJobService.create_job(
                agent_key="nonexistent_agent",
                input_data={},
            )

        self.assertIn("not found", str(ctx.exception))

    def test_create_job_with_idempotency(self):
        """Test idempotency key prevents duplicates."""
        # Create first job
        job1, created1 = AIJobService.create_job(
            agent_key="dummy",
            input_data={"first": True},
            idempotency_key="unique-key-123",
        )
        self.assertTrue(created1)

        # Try to create with same idempotency key
        job2, created2 = AIJobService.create_job(
            agent_key="dummy",
            input_data={"second": True},  # Different data
            idempotency_key="unique-key-123",
        )

        self.assertFalse(created2)
        self.assertEqual(job1.id, job2.id)
        # Original data preserved
        self.assertEqual(job2.input_data, {"first": True})

    def test_get_job(self):
        """Test getting job by ID."""
        job, _ = AIJobService.create_job(
            agent_key="dummy",
            input_data={},
        )

        retrieved = AIJobService.get_job(job.id)

        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.id, job.id)

    def test_get_job_not_found(self):
        """Test getting nonexistent job returns None."""
        result = AIJobService.get_job(uuid.uuid4())
        self.assertIsNone(result)

    def test_list_jobs(self):
        """Test listing jobs."""
        # Create multiple jobs
        AIJobService.create_job(agent_key="dummy", input_data={"n": 1})
        AIJobService.create_job(agent_key="dummy", input_data={"n": 2})
        AIJobService.create_job(agent_key="dummy", input_data={"n": 3})

        jobs = AIJobService.list_jobs()

        self.assertEqual(len(jobs), 3)

    def test_list_jobs_filter_by_agent(self):
        """Test filtering jobs by agent key."""
        AIJobService.create_job(agent_key="dummy", input_data={})

        jobs = AIJobService.list_jobs(agent_key="dummy")
        self.assertEqual(len(jobs), 1)

        jobs = AIJobService.list_jobs(agent_key="other")
        self.assertEqual(len(jobs), 0)

    def test_list_jobs_filter_by_status(self):
        """Test filtering jobs by status."""
        job, _ = AIJobService.create_job(agent_key="dummy", input_data={})
        job.mark_running()
        job.mark_succeeded({"ok": True})

        jobs = AIJobService.list_jobs(status=AIJobStatus.SUCCEEDED)
        self.assertEqual(len(jobs), 1)

        jobs = AIJobService.list_jobs(status=AIJobStatus.PENDING)
        self.assertEqual(len(jobs), 0)

    def test_execute_job_success(self):
        """Test executing a job successfully."""
        job, _ = AIJobService.create_job(
            agent_key="dummy",
            input_data={"echo": "test"},
        )

        result = AIJobService.execute_job(job)

        self.assertEqual(result.status, AIJobStatus.SUCCEEDED)
        self.assertIsNotNone(result.output_data)
        self.assertEqual(result.output_data["echo"], "test")

    def test_execute_job_with_error(self):
        """Test executing job that causes error."""
        job, _ = AIJobService.create_job(
            agent_key="dummy",
            input_data={"simulate_error": True},
        )

        result = AIJobService.execute_job(job)

        self.assertEqual(result.status, AIJobStatus.FAILED)
        self.assertIsNotNone(result.error_message)

    def test_cancel_pending_job(self):
        """Test cancelling a pending job."""
        job, _ = AIJobService.create_job(agent_key="dummy", input_data={})

        cancelled = AIJobService.cancel_job(job.id)

        self.assertIsNotNone(cancelled)
        self.assertEqual(cancelled.status, AIJobStatus.CANCELLED)

    def test_cancel_running_job_fails(self):
        """Test cannot cancel running job."""
        job, _ = AIJobService.create_job(agent_key="dummy", input_data={})
        job.mark_running()

        cancelled = AIJobService.cancel_job(job.id)

        self.assertIsNone(cancelled)


class AIJobServiceIdempotencyTests(TenantTestCase):
    """
    Tests for idempotency in AI jobs.

    REGRA: Repetir operação com mesma idempotency_key NÃO duplica job.
    """

    @classmethod
    def setUpClass(cls):
        """Ensure DummyAgent is registered before tests."""
        super().setUpClass()
        # Register dummy agent if not already registered
        if "dummy" not in _agent_registry:
            register_agent(DummyAgent)

    def test_same_idempotency_key_creates_one_job(self):
        """
        Usar mesma idempotency_key deve criar apenas 1 job.
        """
        key = f"test:{uuid.uuid4()}:v1"

        # Primeira criação
        job1, created1 = AIJobService.create_job(
            agent_key="dummy",
            input_data={"amount": 1000},
            idempotency_key=key,
        )

        # Segunda "criação" com mesma chave
        job2, created2 = AIJobService.create_job(
            agent_key="dummy",
            input_data={"amount": 9999},  # Valor diferente!
            idempotency_key=key,
        )

        self.assertTrue(created1)
        self.assertFalse(created2)  # NÃO criou
        self.assertEqual(job1.pk, job2.pk)
        self.assertEqual(job2.input_data["amount"], 1000)  # Valor original

    def test_different_idempotency_keys_create_separate_jobs(self):
        """
        Diferentes idempotency_keys criam jobs separados.
        """
        job1, created1 = AIJobService.create_job(
            agent_key="dummy",
            input_data={},
            idempotency_key="key-1",
        )

        job2, created2 = AIJobService.create_job(
            agent_key="dummy",
            input_data={},
            idempotency_key="key-2",
        )

        self.assertTrue(created1)
        self.assertTrue(created2)
        self.assertNotEqual(job1.pk, job2.pk)
