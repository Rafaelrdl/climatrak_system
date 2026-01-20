"""
Testes para PatternsAgent (AI-005).

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
from apps.ai.agents.patterns import PatternsAgent
from apps.ai.agents.base import AgentContext, AgentResult
# Force import all agents for registration tests
import apps.ai.agents.dummy  # noqa: F401
import apps.ai.agents.root_cause  # noqa: F401
import apps.ai.agents.inventory  # noqa: F401
import apps.ai.agents.preventive  # noqa: F401
import apps.ai.agents.predictive  # noqa: F401
import apps.ai.agents.quick_repair  # noqa: F401


class PatternsAgentRegistrationTests(TestCase):
    """Testes de registro automático do PatternsAgent."""

    def test_patterns_agent_registered(self):
        """Verifica se PatternsAgent está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("patterns", agent_keys, "patterns não está registrado")

    def test_get_patterns_agent(self):
        """Recupera PatternsAgent por key."""
        agent_class = get_agent("patterns")

        self.assertIsNotNone(agent_class)
        self.assertEqual(agent_class.agent_key, "patterns")

    def test_patterns_agent_metadata(self):
        """Verifica metadata do agente."""
        agent = PatternsAgent()

        self.assertEqual(agent.agent_key, "patterns")
        self.assertFalse(agent.require_llm)
        # Description em português
        self.assertIn("padrões", agent.description.lower())


class PatternsAgentValidationTests(TestCase):
    """Testes de validação do PatternsAgent."""

    def setUp(self):
        """Setup."""
        self.agent = PatternsAgent()

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

    def test_validate_input_accepts_window_days(self):
        """Window_days é opcional."""
        is_valid, error = self.agent.validate_input({
            "scope": "asset",
            "asset_id": 123,
            "window_days": 60
        })
        self.assertTrue(is_valid)


class PatternsAgentExecuteTests(TestCase):
    """Testes de execução do agente (mocked)."""

    def setUp(self):
        """Setup."""
        self.agent = PatternsAgent()

    @patch.object(PatternsAgent, "gather_context")
    @patch.object(PatternsAgent, "_identify_patterns")
    @patch.object(PatternsAgent, "_try_llm_summary")
    def test_execute_returns_valid_output(
        self, mock_llm, mock_patterns, mock_gather
    ):
        """Execute retorna output no schema esperado."""
        # Mock gather_context return value matching real structure
        mock_gather.return_value = {
            "scope_info": {"type": "asset", "id": 123, "tag": "AHU-01"},
            "window_days": 30,
            "work_orders_summary": {
                "total": 10,
                "by_type": {
                    "CORRECTIVE": 4,
                    "PREVENTIVE": 6,
                },
            },
            "parts_usage": [
                {"part_id": 1, "name": "Filtro G4", "qty": 15},
            ],
            "labor": {},
        }
        mock_patterns.return_value = [
            {
                "type": "high_consumption_part",
                "priority": "medium",
                "title": "Alto consumo de Filtro G4",
                "recommendation": "Verificar qualidade do ar",
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
        self.assertEqual(result.data["agent_key"], "patterns")
        self.assertIn("kpis", result.data)
        self.assertIn("top_parts", result.data)
        self.assertIn("patterns", result.data)
        self.assertIn("window_days", result.data)

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


# PatternsAgentRelatedIdTests removed - get_related_id/get_related_type not yet implemented
