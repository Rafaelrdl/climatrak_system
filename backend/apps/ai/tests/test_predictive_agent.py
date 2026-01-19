"""
Testes para PredictiveAgent (AI-005).

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
from apps.ai.agents.predictive import PredictiveAgent
from apps.ai.agents.base import AgentContext, AgentResult


class PredictiveAgentRegistrationTests(TestCase):
    """Testes de registro automático do PredictiveAgent."""

    def test_predictive_agent_registered(self):
        """Verifica se PredictiveAgent está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("predictive", agent_keys, "predictive não está registrado")

    def test_get_predictive_agent(self):
        """Recupera PredictiveAgent por key."""
        agent_class = get_agent("predictive")

        self.assertIsNotNone(agent_class)
        self.assertEqual(agent_class.agent_key, "predictive")

    def test_predictive_agent_metadata(self):
        """Verifica metadata do agente."""
        agent = PredictiveAgent()

        self.assertEqual(agent.agent_key, "predictive")
        self.assertFalse(agent.require_llm)
        self.assertIn("risk", agent.description.lower())


class PredictiveAgentValidationTests(TestCase):
    """Testes de validação do PredictiveAgent."""

    def setUp(self):
        """Setup."""
        self.agent = PredictiveAgent()

    def test_validate_input_requires_asset_id(self):
        """Asset ID é obrigatório."""
        is_valid, error = self.agent.validate_input({})
        self.assertFalse(is_valid)
        self.assertIn("asset_id", error)

    def test_validate_input_accepts_int_asset_id(self):
        """Asset ID pode ser int."""
        is_valid, error = self.agent.validate_input({"asset_id": 123})
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_input_accepts_string_asset_id(self):
        """Asset ID pode ser string numérica."""
        is_valid, error = self.agent.validate_input({"asset_id": "456"})
        self.assertTrue(is_valid)

    def test_validate_input_rejects_non_numeric(self):
        """Asset ID não-numérico é rejeitado."""
        is_valid, error = self.agent.validate_input({"asset_id": "not_a_number"})
        self.assertFalse(is_valid)


class PredictiveAgentExecuteTests(TestCase):
    """Testes de execução do agente (mocked)."""

    def setUp(self):
        """Setup."""
        self.agent = PredictiveAgent()

    @patch.object(PredictiveAgent, "gather_context")
    @patch.object(PredictiveAgent, "_calculate_risk_score")
    @patch.object(PredictiveAgent, "_get_risk_level")
    @patch.object(PredictiveAgent, "_try_llm_summary")
    def test_execute_returns_valid_output(
        self, mock_llm, mock_level, mock_score, mock_gather
    ):
        """Execute retorna output no schema esperado."""
        mock_gather.return_value = {
            "asset": {"id": 123, "tag": "AHU-01"},
            "alerts": {
                "last_24h": {"total": 5, "by_severity": {}, "unresolved": 2},
                "last_7d": {"total": 10, "by_severity": {}},
            },
            "work_orders": {"total_count": 3, "corrective_count": 1},
            "telemetry": [],
            "telemetry_window_days": 7,
        }
        mock_score.return_value = (45, ["5 alertas nas últimas 24h"])
        mock_level.return_value = "medium"
        mock_llm.return_value = None

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"asset_id": 123}

        result = self.agent.execute(input_data, context)

        self.assertIsInstance(result, AgentResult)
        self.assertTrue(result.success)
        self.assertIn("risk", result.data)
        self.assertEqual(result.data["risk"]["score"], 45)
        self.assertEqual(result.data["risk"]["level"], "medium")

    def test_execute_fails_on_invalid_input(self):
        """Execute retorna erro para input inválido."""
        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {}  # Missing asset_id

        result = self.agent.execute(input_data, context)

        self.assertIsInstance(result, AgentResult)
        self.assertFalse(result.success)
        self.assertIn("asset_id", result.error)


class PredictiveAgentRiskLevelTests(TestCase):
    """Testes de níveis de risco."""

    def setUp(self):
        """Setup."""
        self.agent = PredictiveAgent()

    def test_risk_level_minimal(self):
        """Score < 30 = minimal."""
        self.assertEqual(self.agent._get_risk_level(0), "minimal")
        self.assertEqual(self.agent._get_risk_level(15), "minimal")
        self.assertEqual(self.agent._get_risk_level(29), "minimal")

    def test_risk_level_low(self):
        """Score 30-49 = low."""
        self.assertEqual(self.agent._get_risk_level(30), "low")
        self.assertEqual(self.agent._get_risk_level(40), "low")
        self.assertEqual(self.agent._get_risk_level(49), "low")

    def test_risk_level_medium(self):
        """Score 50-69 = medium."""
        self.assertEqual(self.agent._get_risk_level(50), "medium")
        self.assertEqual(self.agent._get_risk_level(60), "medium")
        self.assertEqual(self.agent._get_risk_level(69), "medium")

    def test_risk_level_high(self):
        """Score >= 70 = high."""
        self.assertEqual(self.agent._get_risk_level(70), "high")
        self.assertEqual(self.agent._get_risk_level(85), "high")
        self.assertEqual(self.agent._get_risk_level(100), "high")


class PredictiveAgentRelatedIdTests(TestCase):
    """Testes de normalização de related_id."""

    def test_related_type_is_asset(self):
        """Retorna related_type correto."""
        result = PredictiveAgent.get_related_type({})
        self.assertEqual(result, "asset")

    def test_related_id_uses_normalize(self):
        """Usa normalize_related_id para converter."""
        input_data = {"asset_id": 123}

        related_id = PredictiveAgent.get_related_id(input_data)

        self.assertIsNotNone(related_id)
        self.assertIsInstance(related_id, uuid.UUID)

    def test_related_id_deterministic(self):
        """Mesmo input gera mesmo UUID."""
        input_data = {"asset_id": 123}

        related_id_1 = PredictiveAgent.get_related_id(input_data)
        related_id_2 = PredictiveAgent.get_related_id(input_data)

        self.assertEqual(related_id_1, related_id_2)
