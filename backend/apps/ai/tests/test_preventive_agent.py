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
        self.assertIn("preventive", agent.description.lower())


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
        mock_gather.return_value = {
            "asset": {"id": 123, "tag": "AHU-01"},
            "open_work_orders": 2,
            "maintenance_plans": [],
            "overdue_plans": [],
            "due_soon_plans": [],
            "corrective_history": [],
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


class PreventiveAgentRelatedIdTests(TestCase):
    """Testes de normalização de related_id."""

    def test_related_type_is_asset(self):
        """Retorna related_type correto."""
        result = PreventiveAgent.get_related_type({"scope": "asset"})
        self.assertEqual(result, "asset")

    def test_related_id_for_asset_scope(self):
        """Gera related_id para scope asset."""
        input_data = {"scope": "asset", "asset_id": 123}

        related_id = PreventiveAgent.get_related_id(input_data)

        self.assertIsNotNone(related_id)
        self.assertIsInstance(related_id, uuid.UUID)

    def test_related_id_deterministic(self):
        """Mesmo input gera mesmo UUID."""
        input_data = {"scope": "asset", "asset_id": 123}

        related_id_1 = PreventiveAgent.get_related_id(input_data)
        related_id_2 = PreventiveAgent.get_related_id(input_data)

        self.assertEqual(related_id_1, related_id_2)
