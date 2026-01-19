"""
Testes para RootCauseAgent (AI-002).

Cobre:
- Auto-registro do agente
- Validação de entrada
- Coleta de contexto
- Parsing de JSON
- Conversão de related.id (int) para UUID
"""

import json
import uuid
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.ai.agents import RootCauseAgent, get_agent, get_registered_agents
from apps.ai.agents.base import AgentContext


class AgentRegistrationTests(TestCase):
    """Testes de registro automático de agentes."""

    def test_root_cause_agent_registered(self):
        """Verifica se RootCauseAgent está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("root_cause", agent_keys, "root_cause não está registrado")

    def test_dummy_agent_registered(self):
        """Verifica se DummyAgent ainda está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("dummy", agent_keys, "dummy não está registrado")

    def test_get_root_cause_agent(self):
        """Recupera RootCauseAgent por key."""
        agent_class = get_agent("root_cause")

        self.assertIsNotNone(agent_class)
        self.assertEqual(agent_class.agent_key, "root_cause")


class RootCauseAgentValidationTests(TestCase):
    """Testes de validação do RootCauseAgent."""

    def setUp(self):
        """Setup."""
        self.agent = RootCauseAgent()

    def test_validate_input_requires_alert_id(self):
        """Alert ID é obrigatório."""
        with self.assertRaises(ValueError):
            self.agent.validate_input({})

    def test_validate_input_accepts_int_alert_id(self):
        """Alert ID pode ser int."""
        result = self.agent.validate_input({"alert_id": 123})
        self.assertTrue(result)

    def test_validate_input_accepts_string_alert_id(self):
        """Alert ID pode ser string numérica."""
        result = self.agent.validate_input({"alert_id": "456"})
        self.assertTrue(result)

    def test_validate_input_rejects_non_numeric(self):
        """Alert ID não-numérico é rejeitado."""
        with self.assertRaises(ValueError):
            self.agent.validate_input({"alert_id": "not_a_number"})

    def test_validate_input_accepts_window_minutes(self):
        """Window_minutes é opcional."""
        result = self.agent.validate_input({"alert_id": 123, "window_minutes": 60})
        self.assertTrue(result)


class RootCauseAgentContextTests(TestCase):
    """Testes de coleta de contexto (mocked)."""

    def setUp(self):
        """Setup."""
        self.agent = RootCauseAgent()

    @patch("apps.ai.agents.root_cause.Alert.objects.get")
    def test_gather_context_with_alert(self, mock_alert_get):
        """Coleta contexto quando alerta existe."""
        # Mock do alerta
        mock_alert = MagicMock()
        mock_alert.id = 123
        mock_alert.asset_tag = "AHU-01"
        mock_alert.parameter_key = "temp_supply"
        mock_alert.current_value = 18.3
        mock_alert.threshold_value = 12.0
        mock_alert.severity = "Critical"
        mock_alert.unit = "°C"
        mock_alert.triggered_at = "2024-01-15T10:00:00Z"

        mock_alert_get.return_value = mock_alert

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 123}

        result = self.agent.gather_context(input_data, context)

        self.assertIn("alert", result)
        self.assertEqual(result["alert"]["id"], 123)
        self.assertEqual(result["alert"]["asset_tag"], "AHU-01")

    @patch("apps.ai.agents.root_cause.Alert.objects.get")
    def test_gather_context_alert_not_found(self, mock_alert_get):
        """Lança erro se alerta não existe."""
        from django.core.exceptions import ObjectDoesNotExist

        mock_alert_get.side_effect = ObjectDoesNotExist()

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 99999}

        with self.assertRaises(ValueError):
            self.agent.gather_context(input_data, context)

    @patch("apps.ai.agents.root_cause.Reading.objects.filter")
    @patch("apps.ai.agents.root_cause.Alert.objects.get")
    def test_gather_context_includes_telemetry(self, mock_alert_get, mock_reading_filter):
        """Contexto inclui telemetria."""
        # Mock do alerta
        mock_alert = MagicMock()
        mock_alert.id = 123
        mock_alert.asset_tag = "AHU-01"
        mock_alert.parameter_key = "temp_supply"
        mock_alert.current_value = 18.0
        mock_alert_get.return_value = mock_alert

        # Mock das readings
        mock_reading_qs = MagicMock()
        mock_reading_qs.order_by.return_value.values_list.return_value = [
            (18.0, "2024-01-15T09:55:00Z"),
            (18.5, "2024-01-15T09:50:00Z"),
            (19.0, "2024-01-15T09:45:00Z"),
        ]
        mock_reading_filter.return_value = mock_reading_qs

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 123, "window_minutes": 120}

        result = self.agent.gather_context(input_data, context)

        self.assertIn("telemetry_summary", result)
        telemetry = result["telemetry_summary"]
        self.assertIn("primary_sensor", telemetry)
        self.assertIn("min", telemetry["primary_sensor"])
        self.assertIn("max", telemetry["primary_sensor"])


class RootCauseAgentExecutionTests(TestCase):
    """Testes de execução do agent."""

    def setUp(self):
        """Setup."""
        self.agent = RootCauseAgent()

    @patch("apps.ai.agents.root_cause.RootCauseAgent.gather_context")
    def test_execute_parses_llm_json_output(self, mock_gather):
        """Execute parseia output JSON do LLM."""
        mock_gather.return_value = {"alert": {"id": 1}}

        # Mock do provider
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {
                "schema_version": "1.0",
                "alert": {"id": 1},
                "hypotheses": [
                    {"id": "H1", "title": "Test", "confidence": 0.8, "evidence": []}
                ],
                "immediate_actions": ["Action 1"],
                "notes": "Test note",
            }
        )
        mock_response.usage = MagicMock()
        mock_response.usage.total_tokens = 150

        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = mock_response

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 1}

        result = self.agent.execute(input_data, mock_gather.return_value, mock_provider)

        self.assertTrue(result.success)
        self.assertIsNotNone(result.data)
        self.assertIn("hypotheses", result.data)
        self.assertEqual(result.tokens_used, 150)

    @patch("apps.ai.agents.root_cause.RootCauseAgent.gather_context")
    def test_execute_removes_json_fence(self, mock_gather):
        """Execute remove ```json fence se presente."""
        mock_gather.return_value = {"alert": {"id": 1}}

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        # Resposta com fence
        mock_response.choices[0].message.content = """```json
{
  "schema_version": "1.0",
  "hypotheses": [],
  "immediate_actions": []
}
```"""
        mock_response.usage = MagicMock()
        mock_response.usage.total_tokens = 100

        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = mock_response

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 1}

        result = self.agent.execute(input_data, mock_gather.return_value, mock_provider)

        self.assertTrue(result.success)
        self.assertIsInstance(result.data, dict)

    @patch("apps.ai.agents.root_cause.RootCauseAgent.gather_context")
    def test_execute_handles_invalid_json(self, mock_gather):
        """Execute trata JSON inválido com erro."""
        mock_gather.return_value = {"alert": {"id": 1}}

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "invalid json {{"

        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = mock_response

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 1}

        result = self.agent.execute(input_data, mock_gather.return_value, mock_provider)

        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)


class RelatedIdConversionTests(TestCase):
    """Testes de conversão de related.id para UUID."""

    def test_convert_int_related_id_to_uuid(self):
        """Int é convertido para UUID determinístico."""
        from apps.ai.views import convert_related_id_to_uuid

        result = convert_related_id_to_uuid(123, "alert")

        self.assertIsInstance(result, uuid.UUID)
        # Determinístico: mesma entrada = mesmo UUID
        result2 = convert_related_id_to_uuid(123, "alert")
        self.assertEqual(result, result2)

    def test_convert_string_numeric_to_uuid(self):
        """String numérica é convertida."""
        from apps.ai.views import convert_related_id_to_uuid

        result = convert_related_id_to_uuid("456", "alert")

        self.assertIsInstance(result, uuid.UUID)

    def test_convert_valid_uuid_unchanged(self):
        """UUID válido passa direto."""
        from apps.ai.views import convert_related_id_to_uuid

        original_uuid = uuid.uuid4()
        result = convert_related_id_to_uuid(original_uuid, "alert")

        self.assertEqual(result, original_uuid)

    def test_convert_uuid_string_unchanged(self):
        """String UUID válido passa direto."""
        from apps.ai.views import convert_related_id_to_uuid

        original_uuid = uuid.uuid4()
        result = convert_related_id_to_uuid(str(original_uuid), "alert")

        self.assertEqual(result, original_uuid)

    def test_convert_none_returns_none(self):
        """None retorna None."""
        from apps.ai.views import convert_related_id_to_uuid

        result = convert_related_id_to_uuid(None, "alert")

        self.assertIsNone(result)

    def test_different_types_generate_different_uuids(self):
        """Tipos diferentes geram UUIDs diferentes mesmo com mesmo ID."""
        from apps.ai.views import convert_related_id_to_uuid

        uuid_alert = convert_related_id_to_uuid(123, "alert")
        uuid_device = convert_related_id_to_uuid(123, "device")

        self.assertNotEqual(uuid_alert, uuid_device)
