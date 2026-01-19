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
        self.assertIn("pattern", agent.description.lower())


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
    @patch.object(PatternsAgent, "_analyze_patterns")
    @patch.object(PatternsAgent, "_try_llm_summary")
    def test_execute_returns_valid_output(
        self, mock_llm, mock_patterns, mock_gather
    ):
        """Execute retorna output no schema esperado."""
        mock_gather.return_value = {
            "scope": {"type": "asset", "id": 123, "tag": "AHU-01"},
            "kpis": {
                "total": 10,
                "corrective": 4,
                "preventive": 6,
            },
            "top_parts": [
                {"part_id": 1, "name": "Filtro G4", "qty": 15},
            ],
            "wo_list": [],
            "window_days": 30,
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


class PatternsAgentRelatedIdTests(TestCase):
    """Testes de normalização de related_id."""

    def test_related_type_based_on_scope(self):
        """Retorna related_type baseado no scope."""
        self.assertEqual(
            PatternsAgent.get_related_type({"scope": "asset"}),
            "asset"
        )
        self.assertEqual(
            PatternsAgent.get_related_type({"scope": "site"}),
            "site"
        )
        self.assertEqual(
            PatternsAgent.get_related_type({"scope": "all"}),
            "all"
        )

    def test_related_id_for_asset_scope(self):
        """Gera related_id para scope asset."""
        input_data = {"scope": "asset", "asset_id": 123}

        related_id = PatternsAgent.get_related_id(input_data)

        self.assertIsNotNone(related_id)
        self.assertIsInstance(related_id, uuid.UUID)

    def test_related_id_for_all_scope(self):
        """Related_id para scope all pode ser None."""
        input_data = {"scope": "all"}

        related_id = PatternsAgent.get_related_id(input_data)

        # Para all scope, pode ser None ou um UUID baseado no tenant
        self.assertTrue(related_id is None or isinstance(related_id, uuid.UUID))

    def test_related_id_deterministic(self):
        """Mesmo input gera mesmo UUID."""
        input_data = {"scope": "asset", "asset_id": 456}

        related_id_1 = PatternsAgent.get_related_id(input_data)
        related_id_2 = PatternsAgent.get_related_id(input_data)

        self.assertEqual(related_id_1, related_id_2)
