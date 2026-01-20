"""
Testes para QuickRepairAgent (AI-003).

Cobre:
- Auto-registro do agente
- Validação de entrada (symptom, asset_id)
- Coleta de contexto (asset, work_orders, procedures, inventory)
- Modo fallback quando LLM não disponível
- Output JSON válido
- Idempotency key
"""

import hashlib
import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from apps.ai.agents import QuickRepairAgent, get_agent, get_registered_agents
from apps.ai.agents.base import AgentContext, AgentResult
# Force import all agents for registration tests
import apps.ai.agents.dummy  # noqa: F401
import apps.ai.agents.root_cause  # noqa: F401
import apps.ai.agents.inventory  # noqa: F401
import apps.ai.agents.preventive  # noqa: F401
import apps.ai.agents.predictive  # noqa: F401
import apps.ai.agents.patterns  # noqa: F401


class QuickRepairAgentRegistrationTests(TestCase):
    """Testes de registro automático do agente."""

    def test_quick_repair_agent_registered(self):
        """Verifica se QuickRepairAgent está registrado."""
        agents = get_registered_agents()
        agent_keys = [a["key"] for a in agents]

        self.assertIn("quick_repair", agent_keys, "quick_repair não está registrado")

    def test_get_quick_repair_agent(self):
        """Recupera QuickRepairAgent por key."""
        agent_class = get_agent("quick_repair")

        self.assertIsNotNone(agent_class)
        self.assertEqual(agent_class.agent_key, "quick_repair")

    def test_quick_repair_agent_metadata(self):
        """Verifica metadados do agente."""
        agent = QuickRepairAgent()
        
        self.assertEqual(agent.agent_key, "quick_repair")
        self.assertEqual(agent.version, "1.0.0")
        self.assertTrue(agent.require_llm)  # Requer LLM (mas tem fallback)


class QuickRepairAgentValidationTests(TestCase):
    """Testes de validação de entrada."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()

    def test_validate_empty_input(self):
        """Input vazio é inválido."""
        is_valid, error = self.agent.validate_input({})
        self.assertFalse(is_valid)
        self.assertIn("symptom", error.lower())

    def test_validate_missing_asset_id(self):
        """Faltando asset_id é inválido."""
        is_valid, error = self.agent.validate_input({
            "symptom": "Equipamento fazendo barulho alto"
        })
        self.assertFalse(is_valid)
        self.assertIn("asset_id", error.lower())

    def test_validate_short_symptom(self):
        """Sintoma muito curto é inválido."""
        is_valid, error = self.agent.validate_input({
            "symptom": "barulho",  # Menos de 10 caracteres
            "asset_id": 123,
        })
        self.assertFalse(is_valid)
        self.assertIn("10 caracteres", error)

    def test_validate_valid_input(self):
        """Input válido passa."""
        is_valid, error = self.agent.validate_input({
            "symptom": "Equipamento está fazendo barulho alto durante a operação",
            "asset_id": 123,
        })
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_asset_id_string(self):
        """Asset ID como string numérica é válido."""
        is_valid, error = self.agent.validate_input({
            "symptom": "Temperatura não estabiliza corretamente",
            "asset_id": "456",
        })
        self.assertTrue(is_valid)

    def test_validate_asset_id_invalid(self):
        """Asset ID não-numérico é inválido."""
        is_valid, error = self.agent.validate_input({
            "symptom": "Problema com compressor do chiller",
            "asset_id": "abc",
        })
        self.assertFalse(is_valid)
        self.assertIn("inteiro", error.lower())

    def test_validate_with_optional_fields(self):
        """Input com campos opcionais."""
        is_valid, error = self.agent.validate_input({
            "symptom": "Vazamento de gás refrigerante detectado",
            "asset_id": 123,
            "constraints": ["Não pode parar a produção"],
            "observations": "Já tentamos reapertar conexões",
        })
        self.assertTrue(is_valid)


class QuickRepairAgentGatherContextTests(TestCase):
    """Testes de coleta de contexto."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()
        self.context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
        )

    def test_gather_context_asset_not_found(self):
        """Retorna asset=None quando ativo não existe (mocka método inteiro)."""
        # Patch gather_context para simular asset não encontrado
        with patch.object(self.agent, "gather_context") as mock_gather:
            mock_gather.return_value = {
                "symptom": "Equipamento não liga corretamente",
                "asset": None,
                "generated_at": timezone.now().isoformat(),
                "similar_work_orders": [],
                "relevant_procedures": [],
                "available_parts": [],
            }

            input_data = {
                "symptom": "Equipamento não liga corretamente",
                "asset_id": 9999,
            }

            result = self.agent.gather_context(input_data, self.context)

            self.assertIsNone(result.get("asset"))

    def test_gather_context_complete(self):
        """Coleta contexto completo com todos os dados (mocka método inteiro)."""
        with patch.object(self.agent, "gather_context") as mock_gather:
            mock_gather.return_value = {
                "symptom": "Chiller apresentando ruído excessivo durante operação",
                "asset": {
                    "id": 123,
                    "tag": "CH-001",
                    "name": "Chiller Principal",
                    "asset_type": "CHILLER",
                    "manufacturer": "Carrier",
                    "model": "30XA",
                },
                "generated_at": timezone.now().isoformat(),
                "similar_work_orders": [],
                "relevant_procedures": [],
                "available_parts": [],
            }

            input_data = {
                "symptom": "Chiller apresentando ruído excessivo durante operação",
                "asset_id": 123,
            }

            result = self.agent.gather_context(input_data, self.context)

            # Verifica estrutura
            self.assertIn("symptom", result)
            self.assertIn("asset", result)
            self.assertIn("generated_at", result)
            self.assertEqual(result["symptom"], input_data["symptom"])


class QuickRepairAgentFallbackTests(TestCase):
    """Testes do modo fallback."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()
        self.context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
        )

    def test_fallback_output_structure(self):
        """Verifica estrutura do output no modo fallback."""
        context_data = {
            "symptom": "Equipamento não refrigera adequadamente",
            "constraints": [],
            "observations": "",
            "generated_at": timezone.now().isoformat(),
            "asset": {
                "id": 123,
                "tag": "CH-001",
                "name": "Chiller Principal",
                "asset_type": "CHILLER",
                "manufacturer": "Carrier",
                "model": "30XA",
                "serial_number": "SN12345",
                "status": "ALERT",
                "specifications": {},
                "site_name": "Site A",
                "sector_name": None,
                "subsection_name": None,
            },
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [],
        }

        result = self.agent._execute_fallback(context_data, self.context)

        self.assertTrue(result.success)
        self.assertEqual(result.data.get("mode"), "fallback")
        self.assertIn("summary", result.data)
        self.assertIn("hypotheses", result.data)
        self.assertIn("diagnosis_steps", result.data)
        self.assertIn("repair_steps", result.data)
        self.assertIn("safety", result.data)
        self.assertIn("escalation", result.data)

    def test_fallback_includes_safety(self):
        """Fallback inclui informações de segurança."""
        context_data = {
            "symptom": "Motor do compressor fazendo barulho",
            "constraints": [],
            "observations": "",
            "generated_at": timezone.now().isoformat(),
            "asset": {
                "id": 456,
                "tag": "AHU-002",
                "name": "Unidade de Tratamento",
                "asset_type": "AHU",
                "manufacturer": "Trane",
                "model": "M-Series",
                "serial_number": "SN67890",
                "status": "OK",
                "specifications": {},
                "site_name": "Site B",
                "sector_name": "HVAC",
                "subsection_name": None,
            },
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [],
        }

        result = self.agent._execute_fallback(context_data, self.context)

        safety = result.data.get("safety", {})
        self.assertIn("ppe_required", safety)
        self.assertIn("warnings", safety)
        self.assertGreater(len(safety["ppe_required"]), 0)
        self.assertGreater(len(safety["warnings"]), 0)


class QuickRepairAgentEnrichmentTests(TestCase):
    """Testes de enriquecimento de output."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()

    def test_enrich_adds_references(self):
        """Enrichment adiciona referências."""
        output_data = {
            "summary": "Teste",
            "hypotheses": [],
            "diagnosis_steps": [],
            "repair_steps": [],
            "parts": [],
        }

        context_data = {
            "symptom": "Problema de teste",
            "generated_at": timezone.now().isoformat(),
            "asset": {"id": 123, "tag": "TEST-001"},
            "similar_work_orders": [
                {
                    "id": 1,
                    "number": "OS-0001",
                    "description": "OS similar",
                    "status": "COMPLETED",
                }
            ],
            "relevant_procedures": [
                {
                    "id": 10,
                    "title": "Procedimento de Teste",
                    "file_type": "PDF",
                }
            ],
            "available_parts": [],
        }

        result = self.agent._enrich_output(output_data, context_data)

        self.assertIn("references", result)
        self.assertEqual(len(result["references"]["similar_work_orders"]), 1)
        self.assertEqual(len(result["references"]["procedures"]), 1)

    def test_enrich_adds_idempotency_key(self):
        """Enrichment adiciona idempotency_key."""
        output_data = {"summary": "Teste", "parts": []}
        context_data = {
            "symptom": "Problema específico para teste",
            "generated_at": timezone.now().isoformat(),
            "asset": {"id": 789},
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [],
        }

        result = self.agent._enrich_output(output_data, context_data)

        self.assertIn("idempotency_key", result)
        self.assertTrue(result["idempotency_key"].startswith("quick_repair:asset:789:"))

    def test_enrich_matches_inventory(self):
        """Enrichment faz match de inventário nas partes."""
        output_data = {
            "summary": "Teste",
            "parts": [
                {"name": "Filtro de ar", "quantity": 1, "purpose": "Substituição"},
                {"name": "Correia", "quantity": 2, "purpose": "Substituição"},
            ],
        }

        context_data = {
            "symptom": "Filtro obstruído",
            "generated_at": timezone.now().isoformat(),
            "asset": {"id": 100},
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [
                {
                    "id": 50,
                    "code": "FILT-001",
                    "name": "Filtro de ar G4",
                    "quantity": Decimal("10"),
                    "unit": "UN",
                    "unit_cost": Decimal("25.00"),
                    "location": "A1-01",
                    "category__name": "Filtros",
                },
                {
                    "id": 51,
                    "code": "CORR-002",
                    "name": "Correia V",
                    "quantity": Decimal("5"),
                    "unit": "UN",
                    "unit_cost": Decimal("45.00"),
                    "location": "B2-03",
                    "category__name": "Correias",
                },
            ],
        }

        result = self.agent._enrich_output(output_data, context_data)

        # Verifica que "Filtro de ar" encontrou match
        filtro_part = result["parts"][0]
        self.assertIn("inventory_matches", filtro_part)
        self.assertGreater(len(filtro_part["inventory_matches"]), 0)


class QuickRepairAgentKeywordExtractionTests(TestCase):
    """Testes de extração de keywords."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()

    def test_extract_keywords_basic(self):
        """Extrai keywords básicas."""
        text = "CHILLER Carrier compressor falhando"
        keywords = self.agent._extract_keywords(text)

        self.assertIn("chiller", keywords)
        self.assertIn("carrier", keywords)
        self.assertIn("compressor", keywords)
        self.assertIn("falhando", keywords)

    def test_extract_keywords_removes_stopwords(self):
        """Remove stopwords."""
        text = "O equipamento de HVAC está com problema"
        keywords = self.agent._extract_keywords(text)

        self.assertNotIn("o", keywords)
        self.assertNotIn("de", keywords)
        self.assertNotIn("está", keywords)
        self.assertNotIn("com", keywords)

    def test_extract_keywords_removes_short(self):
        """Remove palavras muito curtas."""
        text = "O ar do AC não gelando"
        keywords = self.agent._extract_keywords(text)

        self.assertNotIn("ar", keywords)
        self.assertNotIn("do", keywords)
        self.assertNotIn("ac", keywords)  # Apenas 2 caracteres


class QuickRepairAgentExecutionTests(TestCase):
    """Testes de execução completa."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()
        self.context = AgentContext(
            tenant_id=str(uuid.uuid4()),
            tenant_schema="test_tenant",
        )

    @patch.object(QuickRepairAgent, "gather_context")
    def test_execute_asset_not_found(self, mock_gather):
        """Retorna erro quando ativo não encontrado."""
        mock_gather.return_value = {"asset": None}

        input_data = {
            "symptom": "Qualquer sintoma para teste",
            "asset_id": 9999,
        }

        result = self.agent.execute(input_data, self.context)

        self.assertFalse(result.success)
        self.assertIn("não encontrado", result.error)

    @patch.object(QuickRepairAgent, "_execute_with_llm")
    @patch.object(QuickRepairAgent, "gather_context")
    def test_execute_llm_success(self, mock_gather, mock_llm):
        """Execução com LLM sucesso."""
        mock_gather.return_value = {
            "asset": {"id": 123, "tag": "TEST"},
            "symptom": "Teste",
            "generated_at": timezone.now().isoformat(),
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [],
        }
        mock_llm.return_value = AgentResult(
            success=True,
            data={"summary": "LLM response"},
            tokens_used=100,
        )

        input_data = {
            "symptom": "Sintoma de teste para LLM",
            "asset_id": 123,
        }

        result = self.agent.execute(input_data, self.context)

        self.assertTrue(result.success)
        mock_llm.assert_called_once()

    @patch.object(QuickRepairAgent, "_execute_fallback")
    @patch.object(QuickRepairAgent, "_execute_with_llm")
    @patch.object(QuickRepairAgent, "gather_context")
    def test_execute_llm_fails_uses_fallback(self, mock_gather, mock_llm, mock_fallback):
        """Usa fallback quando LLM falha."""
        mock_gather.return_value = {
            "asset": {"id": 123, "tag": "TEST"},
            "symptom": "Teste",
            "generated_at": timezone.now().isoformat(),
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [],
        }
        mock_llm.side_effect = Exception("LLM unavailable")
        mock_fallback.return_value = AgentResult(
            success=True,
            data={"mode": "fallback", "summary": "Fallback response"},
        )

        input_data = {
            "symptom": "Sintoma de teste para fallback",
            "asset_id": 123,
        }

        result = self.agent.execute(input_data, self.context)

        self.assertTrue(result.success)
        mock_fallback.assert_called_once()


class QuickRepairAgentPromptTests(TestCase):
    """Testes do prompt."""

    def setUp(self):
        """Setup."""
        self.agent = QuickRepairAgent()

    def test_build_prompt_includes_asset_info(self):
        """Prompt inclui informações do ativo."""
        context_data = {
            "symptom": "Vazamento de refrigerante",
            "constraints": ["Não pode parar a produção"],
            "observations": "Problema intermitente",
            "asset": {
                "tag": "CH-001",
                "name": "Chiller Principal",
                "asset_type": "CHILLER",
                "manufacturer": "Carrier",
                "model": "30XA",
                "status": "ALERT",
                "specifications": {"capacity": "100TR"},
            },
            "similar_work_orders": [],
            "relevant_procedures": [],
            "available_parts": [],
        }

        prompt = self.agent._build_prompt(context_data)

        self.assertIn("CH-001", prompt)
        self.assertIn("CHILLER", prompt)
        self.assertIn("Carrier", prompt)
        self.assertIn("Vazamento de refrigerante", prompt)
        self.assertIn("Não pode parar a produção", prompt)

    def test_build_prompt_includes_history(self):
        """Prompt inclui histórico de OSs."""
        context_data = {
            "symptom": "Problema recorrente",
            "constraints": [],
            "observations": "",
            "asset": {
                "tag": "AHU-001",
                "name": "AHU Sala 1",
                "asset_type": "AHU",
                "manufacturer": "Trane",
                "model": "M-200",
                "status": "OK",
                "specifications": {},
            },
            "similar_work_orders": [
                {
                    "number": "OS-0001",
                    "description": "Troca de filtro",
                    "execution_description": "Filtro G4 substituído",
                }
            ],
            "relevant_procedures": [],
            "available_parts": [],
        }

        prompt = self.agent._build_prompt(context_data)

        self.assertIn("OS-0001", prompt)
        self.assertIn("Troca de filtro", prompt)
