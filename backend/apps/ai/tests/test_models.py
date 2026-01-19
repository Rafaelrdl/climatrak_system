"""
Tests for AI Models - AIJob
"""

import uuid
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

from apps.ai.models import AIJob, AIJobStatus


class AIJobModelTests(TenantTestCase):
    """Tests for AIJob model."""

    def setUp(self):
        """Set up test data."""
        self.tenant_id = uuid.uuid5(
            uuid.NAMESPACE_DNS, f"tenant:{self.tenant.schema_name}"
        )

    def test_create_job(self):
        """Test creating a new AI job."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            input_data={"test": "data"},
        )

        self.assertEqual(job.agent_key, "dummy")
        self.assertEqual(job.status, AIJobStatus.PENDING)
        self.assertEqual(job.input_data, {"test": "data"})
        self.assertEqual(job.attempts, 0)
        self.assertIsNotNone(job.created_at)

    def test_mark_running(self):
        """Test marking job as running."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
        )

        job.mark_running()
        job.refresh_from_db()

        self.assertEqual(job.status, AIJobStatus.RUNNING)
        self.assertEqual(job.attempts, 1)
        self.assertIsNotNone(job.started_at)

    def test_mark_succeeded(self):
        """Test marking job as succeeded."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
        )
        job.mark_running()

        output = {"result": "success"}
        job.mark_succeeded(output=output, tokens=100, execution_time_ms=500)
        job.refresh_from_db()

        self.assertEqual(job.status, AIJobStatus.SUCCEEDED)
        self.assertEqual(job.output_data, output)
        self.assertEqual(job.tokens_used, 100)
        self.assertEqual(job.execution_time_ms, 500)
        self.assertIsNotNone(job.completed_at)

    def test_mark_failed(self):
        """Test marking job as failed."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
        )
        job.mark_running()

        job.mark_failed("Error message", {"type": "TestError"})
        job.refresh_from_db()

        self.assertEqual(job.status, AIJobStatus.FAILED)
        self.assertEqual(job.error_message, "Error message")
        self.assertEqual(job.error_details, {"type": "TestError"})
        self.assertIsNotNone(job.completed_at)

    def test_mark_timeout(self):
        """Test marking job as timeout."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
        )
        job.mark_running()

        job.mark_timeout()
        job.refresh_from_db()

        self.assertEqual(job.status, AIJobStatus.TIMEOUT)
        self.assertIn("exceeded", job.error_message.lower())
        self.assertIsNotNone(job.completed_at)

    def test_can_retry_failed_job(self):
        """Test can_retry for failed job with attempts remaining."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            max_attempts=3,
        )
        job.mark_running()
        job.mark_failed("Error")

        self.assertTrue(job.can_retry())

    def test_cannot_retry_max_attempts(self):
        """Test can_retry returns False when max attempts reached."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            max_attempts=1,
        )
        job.mark_running()  # attempts = 1
        job.mark_failed("Error")

        self.assertFalse(job.can_retry())

    def test_cannot_retry_succeeded_job(self):
        """Test can_retry returns False for succeeded job."""
        job = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
        )
        job.mark_running()
        job.mark_succeeded({"result": "ok"})

        self.assertFalse(job.can_retry())

    def test_idempotency_key_unique_per_tenant(self):
        """Test idempotency_key is unique per tenant."""
        idempotency_key = "test-key-123"

        # Create first job
        job1 = AIJob.objects.create(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            idempotency_key=idempotency_key,
        )

        # Try to create second job with same key
        with self.assertRaises(Exception):  # IntegrityError
            AIJob.objects.create(
                tenant_id=self.tenant_id,
                agent_key="dummy",
                idempotency_key=idempotency_key,
            )

    def test_get_or_create_idempotent_creates(self):
        """Test get_or_create_idempotent creates new job."""
        job, created = AIJob.get_or_create_idempotent(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            idempotency_key="new-key",
            defaults={"input_data": {"test": True}},
        )

        self.assertTrue(created)
        self.assertEqual(job.idempotency_key, "new-key")
        self.assertEqual(job.input_data, {"test": True})

    def test_get_or_create_idempotent_returns_existing(self):
        """Test get_or_create_idempotent returns existing job."""
        # Create first job
        job1, created1 = AIJob.get_or_create_idempotent(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            idempotency_key="existing-key",
            defaults={"input_data": {"original": True}},
        )
        self.assertTrue(created1)

        # Try to create with same key
        job2, created2 = AIJob.get_or_create_idempotent(
            tenant_id=self.tenant_id,
            agent_key="dummy",
            idempotency_key="existing-key",
            defaults={"input_data": {"new": True}},  # Different data
        )

        self.assertFalse(created2)
        self.assertEqual(job1.id, job2.id)
        self.assertEqual(job2.input_data, {"original": True})  # Original data preserved


class AIJobTenantIsolationTests(TenantTestCase):
    """Tests for tenant isolation in AI jobs."""

    def test_jobs_isolated_by_tenant(self):
        """Test that jobs from different tenants are isolated."""
        tenant_a_id = uuid.uuid5(uuid.NAMESPACE_DNS, "tenant:tenant_a")
        tenant_b_id = uuid.uuid5(uuid.NAMESPACE_DNS, "tenant:tenant_b")

        # Create job for tenant A
        job_a = AIJob.objects.create(
            tenant_id=tenant_a_id,
            agent_key="dummy",
            input_data={"tenant": "A"},
        )

        # Create job for tenant B
        job_b = AIJob.objects.create(
            tenant_id=tenant_b_id,
            agent_key="dummy",
            input_data={"tenant": "B"},
        )

        # Query by tenant A should only return A's job
        jobs_a = AIJob.objects.filter(tenant_id=tenant_a_id)
        self.assertEqual(jobs_a.count(), 1)
        self.assertEqual(jobs_a.first().id, job_a.id)

        # Query by tenant B should only return B's job
        jobs_b = AIJob.objects.filter(tenant_id=tenant_b_id)
        self.assertEqual(jobs_b.count(), 1)
        self.assertEqual(jobs_b.first().id, job_b.id)
