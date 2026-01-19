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
        # Passa dados não vazios mas sem alert_id para testar a validação de campo obrigatório
        is_valid, error = self.agent.validate_input({"other_field": 123})
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        # Verificar que a mensagem de erro é sobre campo obrigatório
        self.assertTrue("alert_id" in error.lower() or "obrigat" in error.lower())

    def test_validate_input_accepts_int_alert_id(self):
        """Alert ID pode ser int."""
        is_valid, error = self.agent.validate_input({"alert_id": 123})
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_input_accepts_string_alert_id(self):
        """Alert ID pode ser string numérica."""
        is_valid, error = self.agent.validate_input({"alert_id": "456"})
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_input_rejects_non_numeric(self):
        """Alert ID não-numérico é rejeitado."""
        is_valid, error = self.agent.validate_input({"alert_id": "not_a_number"})
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)

    def test_validate_input_accepts_window_minutes(self):
        """Window_minutes é opcional."""
        is_valid, error = self.agent.validate_input({"alert_id": 123, "window_minutes": 60})
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_input_rejects_empty_data(self):
        """Input data vazio é rejeitado."""
        is_valid, error = self.agent.validate_input(None)
        self.assertFalse(is_valid)
        self.assertIn("vazio", error.lower())


class RootCauseAgentContextTests(TestCase):
    """Testes de coleta de contexto (mocked)."""

    def setUp(self):
        """Setup."""
        self.agent = RootCauseAgent()

    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_correlated_alerts")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_cmms_context")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_related_sensors")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_telemetry")
    @patch("apps.ai.agents.root_cause.Asset.objects.filter")
    @patch("apps.ai.agents.root_cause.Alert.objects.select_related")
    def test_gather_context_with_alert(self, mock_select_related, mock_asset_filter,
                                        mock_telemetry, mock_related, mock_cmms, mock_correlated):
        """Coleta contexto quando alerta existe."""
        from django.utils import timezone

        # Mock do alerta com campos REAIS do model
        mock_alert = MagicMock()
        mock_alert.id = 123
        mock_alert.asset_tag = "AHU-01"
        mock_alert.parameter_key = "temp_supply"
        mock_alert.parameter_value = 18.3  # Campo real (não current_value)
        mock_alert.threshold = 12.0  # Campo real (não threshold_value)
        mock_alert.message = "Temperatura acima do limite"  # Campo real (não description)
        mock_alert.severity = "Critical"
        mock_alert.triggered_at = timezone.now()
        mock_alert.rule = None

        # Mock da cadeia select_related().get()
        mock_qs = MagicMock()
        mock_qs.get.return_value = mock_alert
        mock_select_related.return_value = mock_qs
        
        # Mock do Asset.objects.filter para retornar None (sem asset)
        mock_asset_qs = MagicMock()
        mock_asset_qs.first.return_value = None
        mock_asset_filter.return_value = mock_asset_qs
        
        # Mock dos métodos auxiliares
        mock_telemetry.return_value = {"window_minutes": 120, "primary_sensor": {}}
        mock_related.return_value = []
        mock_cmms.return_value = {"recent_work_orders": []}
        mock_correlated.return_value = {"same_asset_active_count": 0, "recent_severities": []}

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 123}

        result = self.agent.gather_context(input_data, context)

        self.assertIn("alert", result)
        self.assertEqual(result["alert"]["id"], 123)
        self.assertEqual(result["alert"]["asset_tag"], "AHU-01")
        # Verifica que campos são mapeados corretamente
        self.assertEqual(result["alert"]["current_value"], 18.3)
        self.assertEqual(result["alert"]["threshold_value"], 12.0)
        self.assertEqual(result["alert"]["description"], "Temperatura acima do limite")

    @patch("apps.ai.agents.root_cause.Alert.objects.select_related")
    def test_gather_context_alert_not_found(self, mock_select_related):
        """Lança erro se alerta não existe."""
        from apps.alerts.models import Alert

        mock_qs = MagicMock()
        mock_qs.get.side_effect = Alert.DoesNotExist()
        mock_select_related.return_value = mock_qs

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 99999}

        with self.assertRaises(ValueError):
            self.agent.gather_context(input_data, context)

    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_correlated_alerts")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_cmms_context")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_related_sensors")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_telemetry")
    @patch("apps.ai.agents.root_cause.Asset.objects.filter")
    @patch("apps.ai.agents.root_cause.Alert.objects.select_related")
    def test_gather_context_includes_telemetry(self, mock_select_related, mock_asset_filter,
                                                mock_telemetry, mock_related, mock_cmms, mock_correlated):
        """Contexto inclui telemetria."""
        from django.utils import timezone

        # Mock do alerta com campos REAIS do model
        mock_alert = MagicMock()
        mock_alert.id = 123
        mock_alert.asset_tag = "AHU-01"
        mock_alert.parameter_key = "temp_supply"
        mock_alert.parameter_value = 18.0  # Campo real
        mock_alert.threshold = 12.0  # Campo real
        mock_alert.message = "Alerta de temperatura"
        mock_alert.severity = "High"
        mock_alert.triggered_at = timezone.now()
        mock_alert.rule = None

        mock_qs = MagicMock()
        mock_qs.get.return_value = mock_alert
        mock_select_related.return_value = mock_qs
        
        # Mock do Asset.objects.filter para retornar None (sem asset)
        mock_asset_qs = MagicMock()
        mock_asset_qs.first.return_value = None
        mock_asset_filter.return_value = mock_asset_qs

        # Mock dos métodos auxiliares
        mock_telemetry.return_value = {
            "window_minutes": 120,
            "primary_sensor": {"min": 17.5, "max": 19.0, "avg": 18.0}
        }
        mock_related.return_value = []
        mock_cmms.return_value = {"recent_work_orders": []}
        mock_correlated.return_value = {"same_asset_active_count": 0, "recent_severities": []}

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

    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_correlated_alerts")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_cmms_context")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_related_sensors")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_telemetry")
    @patch("apps.ai.agents.root_cause.Asset.objects.filter")
    @patch("apps.ai.agents.root_cause.Alert.objects.select_related")
    def test_gather_context_resilient_no_attribute_error(self, mock_select_related, mock_asset_filter,
                                                          mock_telemetry, mock_related, mock_cmms, mock_correlated):
        """
        Verifica que gather_context NÃO lança AttributeError
        mesmo quando Alert não tem current_value, threshold_value ou description.
        (Regressão para bug: AttributeError: 'Alert' has no attribute 'current_value')
        """
        from django.utils import timezone

        # Mock de alerta com APENAS campos reais do model
        mock_alert = MagicMock(spec=["id", "asset_tag", "parameter_key", "parameter_value",
                                      "threshold", "message", "severity", "triggered_at", "rule"])
        mock_alert.id = 999
        mock_alert.asset_tag = "CHILLER-01"
        mock_alert.parameter_key = "pressure"
        mock_alert.parameter_value = 150.5
        mock_alert.threshold = 140.0
        mock_alert.message = "Pressão elevada"
        mock_alert.severity = "High"
        mock_alert.triggered_at = timezone.now()
        mock_alert.rule = None

        mock_qs = MagicMock()
        mock_qs.get.return_value = mock_alert
        mock_select_related.return_value = mock_qs
        
        # Mock do Asset.objects.filter para retornar None (sem asset)
        mock_asset_qs = MagicMock()
        mock_asset_qs.first.return_value = None
        mock_asset_filter.return_value = mock_asset_qs

        # Mock dos métodos auxiliares
        mock_telemetry.return_value = {"window_minutes": 120, "primary_sensor": {}}
        mock_related.return_value = []
        mock_cmms.return_value = {"recent_work_orders": []}
        mock_correlated.return_value = {"same_asset_active_count": 0, "recent_severities": []}

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 999}

        # Não deve lançar AttributeError
        result = self.agent.gather_context(input_data, context)

        # Verifica mapeamento correto
        self.assertEqual(result["alert"]["current_value"], 150.5)
        self.assertEqual(result["alert"]["threshold_value"], 140.0)
        self.assertEqual(result["alert"]["description"], "Pressão elevada")

    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_correlated_alerts")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_cmms_context")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_related_sensors")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_telemetry")
    @patch("apps.ai.agents.root_cause.Asset.objects.filter")
    @patch("apps.ai.agents.root_cause.Alert.objects.select_related")
    def test_gather_context_with_unit_from_rule(self, mock_select_related, mock_asset_filter,
                                                 mock_telemetry, mock_related, mock_cmms, mock_correlated):
        """Verifica que unit é extraído da Rule quando disponível."""
        from django.utils import timezone

        # Mock da Rule com unit
        mock_rule = MagicMock()
        mock_rule.unit = "°C"
        mock_rule.equipment = None

        # Mock do alerta
        mock_alert = MagicMock()
        mock_alert.id = 456
        mock_alert.asset_tag = "FCU-02"
        mock_alert.parameter_key = "temp_return"
        mock_alert.parameter_value = 28.5
        mock_alert.threshold = 26.0
        mock_alert.message = "Temperatura de retorno elevada"
        mock_alert.severity = "Medium"
        mock_alert.triggered_at = timezone.now()
        mock_alert.rule = mock_rule

        mock_qs = MagicMock()
        mock_qs.get.return_value = mock_alert
        mock_select_related.return_value = mock_qs
        
        # Mock do Asset.objects.filter para retornar None (sem asset)
        mock_asset_qs = MagicMock()
        mock_asset_qs.first.return_value = None
        mock_asset_filter.return_value = mock_asset_qs
        
        # Mock dos métodos auxiliares
        mock_telemetry.return_value = {"window_minutes": 120, "primary_sensor": {}}
        mock_related.return_value = []
        mock_cmms.return_value = {"recent_work_orders": []}
        mock_correlated.return_value = {"same_asset_active_count": 0, "recent_severities": []}

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 456}

        result = self.agent.gather_context(input_data, context)

        self.assertEqual(result["alert"]["unit"], "°C")

    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_correlated_alerts")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_cmms_context")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_related_sensors")
    @patch("apps.ai.agents.root_cause.RootCauseAgent._gather_telemetry")
    @patch("apps.ai.agents.root_cause.Asset.objects.filter")
    @patch("apps.ai.agents.root_cause.Alert.objects.select_related")
    def test_gather_context_handles_missing_optional_fields(self, mock_select_related, mock_asset_filter,
                                                             mock_telemetry, mock_related, mock_cmms, mock_correlated):
        """Verifica resiliência com campos opcionais ausentes (message=None)."""
        from django.utils import timezone

        mock_alert = MagicMock()
        mock_alert.id = 789
        mock_alert.asset_tag = "AHU-03"
        mock_alert.parameter_key = "humidity"
        mock_alert.parameter_value = 85.0
        mock_alert.threshold = 70.0
        mock_alert.message = None  # Campo pode ser None
        mock_alert.severity = "Low"
        mock_alert.triggered_at = timezone.now()
        mock_alert.rule = None

        mock_qs = MagicMock()
        mock_qs.get.return_value = mock_alert
        mock_select_related.return_value = mock_qs
        
        # Mock do Asset.objects.filter para retornar None (sem asset)
        mock_asset_qs = MagicMock()
        mock_asset_qs.first.return_value = None
        mock_asset_filter.return_value = mock_asset_qs
        
        # Mock dos métodos auxiliares
        mock_telemetry.return_value = {"window_minutes": 120, "primary_sensor": {}}
        mock_related.return_value = []
        mock_cmms.return_value = {"recent_work_orders": []}
        mock_correlated.return_value = {"same_asset_active_count": 0, "recent_severities": []}

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 789}

        result = self.agent.gather_context(input_data, context)

        # description deve ser string vazia quando message é None
        self.assertEqual(result["alert"]["description"], "")


class RootCauseAgentExecutionTests(TestCase):
    """Testes de execução do agent."""

    def setUp(self):
        """Setup."""
        self.agent = RootCauseAgent()
        # Contexto mockado completo que build_user_prompt espera
        self.complete_context = {
            "alert": {
                "id": 1,
                "severity": "High",
                "asset_tag": "TEST-01",
                "parameter_key": "temp",
                "current_value": 25.0,
                "threshold_value": 20.0,
                "unit": "°C",
                "triggered_at": "2024-01-15T10:00:00Z",
                "description": "Teste",
            },
            "telemetry_summary": {"window_minutes": 120, "primary_sensor": {}},
            "related_sensors": [],
            "cmms_context": {"recent_work_orders": []},
            "correlated_alerts": {"same_asset_active_count": 0, "recent_severities": []},
            "asset": None,
        }

    @patch("apps.ai.agents.root_cause.RootCauseAgent.gather_context")
    def test_execute_parses_llm_json_output(self, mock_gather):
        """Execute parseia output JSON do LLM."""
        mock_gather.return_value = self.complete_context

        # Mock do provider - LLMResponse usa content diretamente
        mock_response = MagicMock()
        mock_response.content = json.dumps(
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
        mock_response.model = "mistral-nemo"
        mock_response.tokens_total = 150

        # Configurar o provider mockado
        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = mock_response
        self.agent._provider = mock_provider

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 1}

        result = self.agent.execute(input_data, context)

        self.assertTrue(result.success)
        self.assertIsNotNone(result.data)
        self.assertIn("hypotheses", result.data)
        self.assertEqual(result.tokens_used, 150)

    @patch("apps.ai.agents.root_cause.RootCauseAgent.gather_context")
    def test_execute_removes_json_fence(self, mock_gather):
        """Execute remove ```json fence se presente."""
        mock_gather.return_value = self.complete_context

        mock_response = MagicMock()
        # Resposta com fence - LLMResponse usa content diretamente
        mock_response.content = """```json
{
  "schema_version": "1.0",
  "hypotheses": [],
  "immediate_actions": []
}
```"""
        mock_response.model = "mistral-nemo"
        mock_response.tokens_total = 100

        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = mock_response
        self.agent._provider = mock_provider

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 1}

        result = self.agent.execute(input_data, context)

        self.assertTrue(result.success)
        self.assertIsInstance(result.data, dict)

    @patch("apps.ai.agents.root_cause.RootCauseAgent.gather_context")
    def test_execute_handles_invalid_json(self, mock_gather):
        """Execute trata JSON inválido com erro."""
        mock_gather.return_value = self.complete_context

        mock_response = MagicMock()
        # LLMResponse usa content diretamente
        mock_response.content = "invalid json {{"
        mock_response.model = "mistral-nemo"

        mock_provider = MagicMock()
        mock_provider.chat_sync.return_value = mock_response
        self.agent._provider = mock_provider

        context = AgentContext(
            tenant_id=uuid.uuid4(),
            tenant_schema="test_tenant",
        )
        input_data = {"alert_id": 1}

        result = self.agent.execute(input_data, context)

        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)
