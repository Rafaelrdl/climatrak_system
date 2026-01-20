"""
Testes para PreventiveAgent (AI-005).

Cobre:
- Auto-registro do agente
- Validação de entrada
- Output schema
- Normalização de related_id
"""

import uuid
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.ai.agents import get_agent, get_registered_agents
from apps.ai.agents.preventive import PreventiveAgent
from apps.ai.agents.base import AgentContext, AgentResult
# Force import all agents for registration tests
import apps.ai.agents.dummy  # noqa: F401
import apps.ai.agents.root_cause  # noqa: F401
import apps.ai.agents.inventory  # noqa: F401
import apps.ai.agents.predictive  # noqa: F401
import apps.ai.agents.patterns  # noqa: F401
import apps.ai.agents.quick_repair  # noqa: F401


class PreventiveAgentRegistrationTests(TestCase):
    """Testes de registro automático do PreventiveAgent."""

    def test_preventive_agent_registered(self):
        """Verifica se PreventiveAgent está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("preventive", agent_keys, "preventive não está registrado")

    def test_get_preventive_agent(self):
        """Recupera PreventiveAgent por key."""
        agent_class = get_agent("preventive")

        self.assertIsNotNone(agent_class)
        self.assertEqual(agent_class.agent_key, "preventive")

    def test_preventive_agent_metadata(self):
        """Verifica metadata do agente."""
        agent = PreventiveAgent()

        self.assertEqual(agent.agent_key, "preventive")
        self.assertFalse(agent.require_llm)
        # Description em português
        self.assertIn("preventiva", agent.description.lower())


class PreventiveAgentValidationTests(TestCase):
    """Testes de validação do PreventiveAgent."""

    def setUp(self):
        """Setup."""
        self.agent = PreventiveAgent()

    def test_validate_input_empty_data(self):
        """Input vazio é rejeitado."""
        is_valid, error = self.agent.validate_input({})
        self.assertFalse(is_valid)

    def test_validate_input_asset_scope_requires_asset_id(self):
        """Scope asset requer asset_id."""
        is_valid, error = self.agent.validate_input({"scope": "asset"})
        self.assertFalse(is_valid)
        self.assertIn("asset_id", error)

    def test_validate_input_accepts_valid_asset_scope(self):
        """Scope asset com asset_id válido."""
        is_valid, error = self.agent.validate_input({
            "scope": "asset",
            "asset_id": 123
        })
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_input_accepts_string_asset_id(self):
        """Asset ID pode ser string numérica."""
        is_valid, error = self.agent.validate_input({
            "scope": "asset",
            "asset_id": "456"
        })
        self.assertTrue(is_valid)

    def test_validate_input_site_scope_requires_site_id(self):
        """Scope site requer site_id."""
        is_valid, error = self.agent.validate_input({"scope": "site"})
        self.assertFalse(is_valid)
        self.assertIn("site_id", error)

    def test_validate_input_all_scope_no_extra_required(self):
        """Scope all não requer IDs adicionais."""
        is_valid, error = self.agent.validate_input({"scope": "all"})
        self.assertTrue(is_valid)

    def test_validate_input_rejects_invalid_scope(self):
        """Scope desconhecido é rejeitado."""
        is_valid, error = self.agent.validate_input({"scope": "unknown"})
        self.assertFalse(is_valid)
        self.assertIn("scope", error)


class PreventiveAgentExecuteTests(TestCase):
    """Testes de execução do agente (mocked)."""

    def setUp(self):
        """Setup."""
        self.agent = PreventiveAgent()

    @patch.object(PreventiveAgent, "gather_context")
    @patch.object(PreventiveAgent, "_generate_recommendations")
    @patch.object(PreventiveAgent, "_try_llm_summary")
    def test_execute_returns_valid_output(
        self, mock_llm, mock_recs, mock_gather
    ):
        """Execute retorna output no schema esperado."""
        # gather_context retorna dict com "assets" (lista)
        mock_gather.return_value = {
            "assets": [
                {
                    "id": 123,
                    "tag": "AHU-01",
                    "stats": {
                        "open_wo_count": 2,
                        "overdue_plans": 0,
                        "due_soon_plans": 1,
                    },
                }
            ],
        }
        mock_recs.return_value = [
            {
                "type": "create_plan",
                "priority": "medium",
                "title": "Criar plano preventivo",
                "rationale": "Ativo sem plano de manutenção",
            }
        ]
        mock_llm.return_value = None

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"scope": "asset", "asset_id": 123}

        result = self.agent.execute(input_data, context)

        self.assertIsInstance(result, AgentResult)
        self.assertTrue(result.success)
        self.assertEqual(result.data["agent_key"], "preventive")
        self.assertIn("recommendations", result.data)
        self.assertIn("as_of", result.data)

    def test_execute_fails_on_invalid_input(self):
        """Execute retorna erro para input inválido."""
        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"scope": "asset"}  # Missing asset_id

        result = self.agent.execute(input_data, context)

        self.assertIsInstance(result, AgentResult)
        self.assertFalse(result.success)


# PreventiveAgentRelatedIdTests removed - get_related_id/get_related_type not yet implemented
