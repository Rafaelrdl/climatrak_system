"""
Tests for alerts tasks.
"""

from unittest.mock import patch

from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

from apps.alerts.tasks import evaluate_rules_task
from apps.tenants.models import Domain, Tenant


class EvaluateRulesTaskTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context("public"):
            self.extra_tenant = Tenant.objects.create(
                name="Extra Tenant",
                slug="extra-tenant",
                schema_name="extra_tenant",
            )
            Domain.objects.create(
                domain="extra-tenant.localhost",
                tenant=self.extra_tenant,
                is_primary=True,
            )

    def test_evaluate_rules_task_fans_out(self):
        with patch("apps.alerts.tasks.evaluate_rules_for_tenant.delay") as mocked:
            result = evaluate_rules_task()

        called_schemas = {call.args[0] for call in mocked.call_args_list}
        self.assertIn(self.tenant.schema_name, called_schemas)
        self.assertIn(self.extra_tenant.schema_name, called_schemas)
        self.assertEqual(result["scheduled"], len(called_schemas))
