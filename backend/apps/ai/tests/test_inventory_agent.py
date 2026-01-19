"""
Testes para InventoryAgent (AI-004).

Cobre:
- Auto-registro do agente
- Validação de entrada (mode, item_id)
- Coleta de contexto (itens, consumo)
- Cálculo de heurísticas
- Classificações (reorder, overstock, dead_stock)
- Output JSON válido
"""

import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from apps.ai.agents import InventoryAgent, get_agent, get_registered_agents
from apps.ai.agents.base import AgentContext


class InventoryAgentRegistrationTests(TestCase):
    """Testes de registro automático do agente."""

    def test_inventory_agent_registered(self):
        """Verifica se InventoryAgent está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("inventory", agent_keys, "inventory não está registrado")

    def test_get_inventory_agent(self):
        """Recupera InventoryAgent por key."""
        agent_class = get_agent("inventory")

        self.assertIsNotNone(agent_class)
        self.assertEqual(agent_class.agent_key, "inventory")

    def test_inventory_agent_metadata(self):
        """Verifica metadados do agente."""
        agent = InventoryAgent()
        
        self.assertEqual(agent.agent_key, "inventory")
        self.assertEqual(agent.version, "1.0.0")
        self.assertFalse(agent.require_llm)  # Não requer LLM


class InventoryAgentValidationTests(TestCase):
    """Testes de validação de entrada."""

    def setUp(self):
        """Setup."""
        self.agent = InventoryAgent()

    def test_validate_empty_input(self):
        """Input vazio é inválido."""
        is_valid, error = self.agent.validate_input({})
        self.assertFalse(is_valid)
        self.assertIn("vazio", error)

    def test_validate_mode_overview(self):
        """Mode overview é válido."""
        is_valid, error = self.agent.validate_input({"mode": "overview"})
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_mode_item_without_id(self):
        """Mode item sem item_id é inválido."""
        is_valid, error = self.agent.validate_input({"mode": "item"})
        self.assertFalse(is_valid)
        self.assertIn("item_id", error)

    def test_validate_mode_item_with_id(self):
        """Mode item com item_id é válido."""
        is_valid, error = self.agent.validate_input({"mode": "item", "item_id": 123})
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_mode_item_string_id(self):
        """Mode item com string numérica é válido."""
        is_valid, error = self.agent.validate_input({"mode": "item", "item_id": "456"})
        self.assertTrue(is_valid)

    def test_validate_mode_item_invalid_id(self):
        """Mode item com ID não-numérico é inválido."""
        is_valid, error = self.agent.validate_input({"mode": "item", "item_id": "abc"})
        self.assertFalse(is_valid)
        self.assertIn("numérico", error)

    def test_validate_invalid_mode(self):
        """Mode inválido é rejeitado."""
        is_valid, error = self.agent.validate_input({"mode": "invalid"})
        self.assertFalse(is_valid)
        self.assertIn("overview", error)

    def test_validate_window_days_positive(self):
        """Window_days deve ser >= 1."""
        is_valid, error = self.agent.validate_input(
            {"mode": "overview", "window_days": 0}
        )
        self.assertFalse(is_valid)

    def test_validate_window_days_valid(self):
        """Window_days válido."""
        is_valid, error = self.agent.validate_input(
            {"mode": "overview", "window_days": 90}
        )
        self.assertTrue(is_valid)


class InventoryAgentHeuristicsTests(TestCase):
    """Testes das heurísticas de cálculo."""

    def setUp(self):
        """Setup."""
        self.agent = InventoryAgent()
        self.context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
        )

    def test_calculate_recommendations_empty_list(self):
        """Retorna estrutura vazia quando não há itens."""
        context_data = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "items_data": [],
        }

        result = self.agent._calculate_recommendations(context_data)

        self.assertEqual(result["summary"]["total_items"], 0)
        self.assertEqual(result["reorder"], [])
        self.assertEqual(result["overstock"], [])
        self.assertEqual(result["dead_stock"], [])

    def test_calculate_reorder_point(self):
        """Calcula ponto de reposição corretamente."""
        # Item com consumo médio de 1/dia
        context_data = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "items_data": [{
                "id": 1,
                "code": "ITEM-001",
                "name": "Item Teste",
                "unit": "UN",
                "category_id": None,
                "category_name": None,
                "current_qty": 5.0,
                "min_quantity": 2.0,
                "max_quantity": None,
                "reorder_point": None,
                "lead_time_days": 7,
                "unit_cost": 10.0,
                "is_critical": False,
                "total_out": 90.0,  # 1/dia
                "movement_count": 30,
                "last_out_date": timezone.now().isoformat(),
            }],
        }

        result = self.agent._calculate_recommendations(context_data)

        self.assertEqual(result["summary"]["total_items"], 1)
        self.assertEqual(result["summary"]["items_with_consumption"], 1)

        # Verificar que gerou recomendação
        if result["reorder"]:
            rec = result["reorder"][0]
            # avg_daily = 90/90 = 1
            # safety = 1 * 3 = 3
            # reorder_point = 1 * 7 + 3 = 10
            self.assertAlmostEqual(rec["avg_daily_usage"], 1.0, places=2)
            self.assertAlmostEqual(rec["suggested_reorder_point"], 10.0, places=2)

    def test_stockout_risk_detection(self):
        """Detecta risco de ruptura."""
        context_data = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "items_data": [{
                "id": 1,
                "code": "ITEM-001",
                "name": "Item Crítico",
                "unit": "UN",
                "category_id": None,
                "category_name": None,
                "current_qty": 3.0,  # Só 3 dias de cobertura
                "min_quantity": 2.0,
                "max_quantity": None,
                "reorder_point": None,
                "lead_time_days": 10,  # Lead time 10 dias
                "unit_cost": 10.0,
                "is_critical": True,
                "total_out": 90.0,  # 1/dia
                "movement_count": 15,
                "last_out_date": timezone.now().isoformat(),
            }],
        }

        result = self.agent._calculate_recommendations(context_data)

        # Deve estar na lista de reorder
        self.assertGreater(len(result["reorder"]), 0)
        rec = result["reorder"][0]
        self.assertTrue(rec["stockout_risk"])
        self.assertAlmostEqual(rec["days_of_cover"], 3.0, places=1)

    def test_dead_stock_detection(self):
        """Detecta estoque parado."""
        old_date = timezone.now() - timedelta(days=200)

        context_data = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "items_data": [{
                "id": 1,
                "code": "ITEM-PARADO",
                "name": "Item Parado",
                "unit": "UN",
                "category_id": None,
                "category_name": None,
                "current_qty": 50.0,
                "min_quantity": 0.0,
                "max_quantity": None,
                "reorder_point": None,
                "lead_time_days": None,
                "unit_cost": 100.0,
                "is_critical": False,
                "total_out": 0.0,  # Sem consumo
                "movement_count": 0,
                "last_out_date": old_date.isoformat(),
            }],
        }

        result = self.agent._calculate_recommendations(context_data)

        self.assertGreater(len(result["dead_stock"]), 0)
        dead = result["dead_stock"][0]
        self.assertEqual(dead["code"], "ITEM-PARADO")
        self.assertEqual(dead["stock_value"], 5000.0)  # 50 * 100

    def test_overstock_detection(self):
        """Detecta excesso de estoque."""
        context_data = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 30,  # 30 dias de cobertura max
            "top_n": 30,
            "items_data": [{
                "id": 1,
                "code": "ITEM-EXCESSO",
                "name": "Item Excesso",
                "unit": "UN",
                "category_id": None,
                "category_name": None,
                "current_qty": 100.0,  # 100 dias de cobertura
                "min_quantity": 5.0,
                "max_quantity": 20.0,
                "reorder_point": None,
                "lead_time_days": 7,
                "unit_cost": 50.0,
                "is_critical": False,
                "total_out": 90.0,  # 1/dia
                "movement_count": 45,
                "last_out_date": timezone.now().isoformat(),
            }],
        }

        result = self.agent._calculate_recommendations(context_data)

        self.assertGreater(len(result["overstock"]), 0)
        over = result["overstock"][0]
        self.assertEqual(over["code"], "ITEM-EXCESSO")
        self.assertGreater(over["excess_qty"], 0)

    def test_confidence_levels(self):
        """Verifica níveis de confiança baseado em movimentações."""
        context_data = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "items_data": [
                {
                    "id": 1,
                    "code": "HIGH-CONF",
                    "name": "Alta Confiança",
                    "unit": "UN",
                    "category_id": None,
                    "category_name": None,
                    "current_qty": 5.0,
                    "min_quantity": 10.0,
                    "max_quantity": None,
                    "reorder_point": None,
                    "lead_time_days": 7,
                    "unit_cost": 10.0,
                    "is_critical": False,
                    "total_out": 90.0,
                    "movement_count": 15,  # >= 10 = high
                    "last_out_date": timezone.now().isoformat(),
                },
                {
                    "id": 2,
                    "code": "MED-CONF",
                    "name": "Média Confiança",
                    "unit": "UN",
                    "category_id": None,
                    "category_name": None,
                    "current_qty": 5.0,
                    "min_quantity": 10.0,
                    "max_quantity": None,
                    "reorder_point": None,
                    "lead_time_days": 7,
                    "unit_cost": 10.0,
                    "is_critical": False,
                    "total_out": 15.0,
                    "movement_count": 5,  # 3-9 = medium
                    "last_out_date": timezone.now().isoformat(),
                },
                {
                    "id": 3,
                    "code": "LOW-CONF",
                    "name": "Baixa Confiança",
                    "unit": "UN",
                    "category_id": None,
                    "category_name": None,
                    "current_qty": 5.0,
                    "min_quantity": 10.0,
                    "max_quantity": None,
                    "reorder_point": None,
                    "lead_time_days": 7,
                    "unit_cost": 10.0,
                    "is_critical": False,
                    "total_out": 2.0,
                    "movement_count": 2,  # < 3 = low
                    "last_out_date": timezone.now().isoformat(),
                },
            ],
        }

        result = self.agent._calculate_recommendations(context_data)

        # Encontrar por código
        by_code = {r["code"]: r for r in result["reorder"]}

        self.assertEqual(by_code["HIGH-CONF"]["confidence"], "high")
        self.assertEqual(by_code["MED-CONF"]["confidence"], "medium")
        self.assertEqual(by_code["LOW-CONF"]["confidence"], "low")


class InventoryAgentExecuteTests(TestCase):
    """Testes de execução do agente."""

    def setUp(self):
        """Setup."""
        self.agent = InventoryAgent()
        self.context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
        )

    @patch.object(InventoryAgent, "gather_context")
    def test_execute_returns_structured_output(self, mock_gather):
        """Execute retorna estrutura JSON completa."""
        mock_gather.return_value = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "generated_at": timezone.now().isoformat(),
            "items_data": [],
        }

        result = self.agent.execute({"mode": "overview"}, self.context)

        self.assertTrue(result.success)
        self.assertIn("agent_key", result.data)
        self.assertEqual(result.data["agent_key"], "inventory")
        self.assertIn("version", result.data)
        self.assertIn("summary", result.data)
        self.assertIn("recommendations", result.data)
        self.assertIn("reorder", result.data["recommendations"])
        self.assertIn("overstock", result.data["recommendations"])
        self.assertIn("dead_stock", result.data["recommendations"])
        self.assertIn("engine", result.data)

    @patch.object(InventoryAgent, "gather_context")
    def test_execute_handles_error(self, mock_gather):
        """Execute captura erros e retorna AgentResult com erro."""
        mock_gather.side_effect = Exception("Database error")

        result = self.agent.execute({"mode": "overview"}, self.context)

        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)
        self.assertIn("Database error", result.error)

    @patch.object(InventoryAgent, "gather_context")
    def test_execute_includes_execution_time(self, mock_gather):
        """Execute inclui tempo de execução."""
        mock_gather.return_value = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "generated_at": timezone.now().isoformat(),
            "items_data": [],
        }

        result = self.agent.execute({"mode": "overview"}, self.context)

        self.assertTrue(result.success)
        self.assertGreaterEqual(result.execution_time_ms, 0)


class InventoryAgentOutputSchemaTests(TestCase):
    """Testes do schema de saída."""

    def setUp(self):
        """Setup."""
        self.agent = InventoryAgent()
        self.context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
        )

    @patch.object(InventoryAgent, "gather_context")
    def test_output_has_required_fields(self, mock_gather):
        """Output contém todos os campos obrigatórios."""
        mock_gather.return_value = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "generated_at": "2026-01-18T12:00:00-03:00",
            "items_data": [{
                "id": 1,
                "code": "TEST-001",
                "name": "Item Teste",
                "unit": "UN",
                "category_id": None,
                "category_name": None,
                "current_qty": 5.0,
                "min_quantity": 10.0,
                "max_quantity": None,
                "reorder_point": None,
                "lead_time_days": 7,
                "unit_cost": 100.0,
                "is_critical": False,
                "total_out": 90.0,
                "movement_count": 30,
                "last_out_date": timezone.now().isoformat(),
            }],
        }

        result = self.agent.execute({"mode": "overview"}, self.context)

        self.assertTrue(result.success)
        data = result.data

        # Campos obrigatórios do schema
        required_fields = [
            "agent_key", "version", "mode", "window_days",
            "generated_at", "summary", "recommendations",
            "llm_summary", "engine"
        ]
        for field in required_fields:
            self.assertIn(field, data, f"Campo {field} ausente no output")

        # Summary fields
        summary_fields = [
            "total_items", "items_with_consumption", "total_stock_value",
            "low_stock_count", "out_of_stock_count", "critical_low_count"
        ]
        for field in summary_fields:
            self.assertIn(field, data["summary"], f"Campo {field} ausente no summary")

    @patch.object(InventoryAgent, "gather_context")
    def test_reorder_item_has_required_fields(self, mock_gather):
        """Item de reorder contém campos obrigatórios."""
        mock_gather.return_value = {
            "mode": "overview",
            "window_days": 90,
            "default_lead_time_days": 7,
            "safety_days": 3,
            "dead_stock_days": 180,
            "overstock_days": 180,
            "top_n": 30,
            "generated_at": "2026-01-18T12:00:00-03:00",
            "items_data": [{
                "id": 1,
                "code": "TEST-001",
                "name": "Item Teste",
                "unit": "UN",
                "category_id": None,
                "category_name": None,
                "current_qty": 5.0,
                "min_quantity": 10.0,  # Abaixo do mínimo
                "max_quantity": None,
                "reorder_point": None,
                "lead_time_days": 7,
                "unit_cost": 100.0,
                "is_critical": False,
                "total_out": 90.0,
                "movement_count": 30,
                "last_out_date": timezone.now().isoformat(),
            }],
        }

        result = self.agent.execute({"mode": "overview"}, self.context)
        data = result.data

        self.assertGreater(len(data["recommendations"]["reorder"]), 0)
        rec = data["recommendations"]["reorder"][0]

        # Campos obrigatórios do item de reorder
        item_fields = [
            "item_id", "code", "name", "unit", "current_qty",
            "avg_daily_usage", "lead_time_days", "days_of_cover",
            "stockout_risk", "suggested_reorder_point",
            "suggested_min_quantity", "suggested_max_quantity",
            "suggested_order_qty", "confidence", "notes"
        ]
        for field in item_fields:
            self.assertIn(field, rec, f"Campo {field} ausente no item de reorder")
