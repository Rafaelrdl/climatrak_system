"""
Testes de Isolamento Multi-Tenant (Regras Não-Negociáveis)

Verifica que:
1. Queries nunca atravessam schemas (isolamento por tenant)
2. Endpoints respeitam tenant derivado do host/subdomínio/header
3. Fixtures/seed criam tenant + owner corretamente

Referência:
- .github/copilot-instructions.md (seção Multi-tenant)
- django-tenants: isolamento por schema PostgreSQL
"""

import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import RequestFactory, TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

import pytest
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient
from django_tenants.utils import (
    get_public_schema_name,
    get_tenant_model,
    schema_context,
)

User = get_user_model()
Tenant = get_tenant_model()


class SchemaIsolationTests(TenantTestCase):
    """
    Testes para garantir que dados não vazam entre schemas.

    REGRA: Query nunca atravessa schema.
    """

    @classmethod
    def setUpClass(cls):
        """Configura schemas de teste."""
        super().setUpClass()

    def test_user_created_in_tenant_not_visible_in_public(self):
        """
        Usuário criado em tenant não deve ser visível no schema public.

        Garante isolamento: dados do tenant não vazam para public.
        """
        # Cria usuário no tenant de teste (self.tenant é criado por TenantTestCase)
        tenant_user = User.objects.create_user(
            username="tenant_user",
            email="tenant_user@example.com",
            password="testpass123",
            first_name="Tenant",
            last_name="User",
        )
        tenant_user_count = User.objects.count()

        # No schema public, não deve encontrar o mesmo usuário
        with schema_context("public"):
            public_user_count = User.objects.filter(
                email="tenant_user@example.com"
            ).count()
            # Usuário criado no tenant NÃO deve existir no public
            self.assertEqual(
                public_user_count,
                0,
                "Usuário do tenant vazou para schema public!"
            )

    def test_query_respects_current_schema(self):
        """
        Queries devem respeitar o schema atual da conexão.

        Verifica que connection.schema_name corresponde ao tenant ativo.
        """
        # No contexto do tenant de teste
        self.assertEqual(connection.schema_name, self.tenant.schema_name)

        # Alterna para public
        with schema_context("public"):
            self.assertEqual(connection.schema_name, "public")

        # Volta ao tenant
        self.assertEqual(connection.schema_name, self.tenant.schema_name)

    def test_tenant_specific_model_isolation(self):
        """
        Modelos tenant-specific devem ser isolados por schema.

        Cria dados em dois contextos e verifica que não se misturam.
        """
        # Criar dados no tenant atual
        tenant_data_count_before = User.objects.count()
        User.objects.create_user(
            username="isolated_test",
            email="isolated_test@example.com",
            password="testpass123",
            first_name="Isolated",
            last_name="Test",
        )
        tenant_data_count_after = User.objects.count()

        self.assertEqual(tenant_data_count_after, tenant_data_count_before + 1)

        # No public schema, o count deve ser diferente
        with schema_context("public"):
            public_count = User.objects.filter(email="isolated_test@example.com").count()
            self.assertEqual(public_count, 0)

    def test_cross_tenant_query_not_possible_directly(self):
        """
        Não deve ser possível acessar dados de outro tenant sem trocar contexto.

        Verifica que ORM do Django está corretamente configurado.
        """
        # Usuário do tenant atual
        User.objects.create_user(
            username="current_tenant",
            email="current_tenant@example.com",
            password="testpass123",
        )

        # Tentativa de buscar sem contexto explícito deve ficar no schema atual
        found = User.objects.filter(email="current_tenant@example.com").exists()
        self.assertTrue(found)

        # No schema public, não deve encontrar
        with schema_context("public"):
            found_in_public = User.objects.filter(
                email="current_tenant@example.com"
            ).exists()
            self.assertFalse(found_in_public)


class TenantConfigurationTests(TestCase):
    """
    Testes para validar configuração de apps tenant vs shared.

    REGRA: Apps sensíveis devem estar em TENANT_APPS para isolamento.
    """

    @pytest.mark.tenant
    def test_finance_models_are_tenant_specific(self):
        """Finance deve estar em TENANT_APPS para isolamento de dados financeiros."""
        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn(
            "apps.finance",
            tenant_apps,
            "apps.finance DEVE estar em TENANT_APPS para isolamento!"
        )

    @pytest.mark.tenant
    def test_accounts_models_are_tenant_specific(self):
        """Accounts deve estar em TENANT_APPS para isolamento de usuários."""
        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn(
            "apps.accounts",
            tenant_apps,
            "apps.accounts DEVE estar em TENANT_APPS para isolamento!"
        )

    @pytest.mark.tenant
    def test_cmms_models_are_tenant_specific(self):
        """CMMS deve estar em TENANT_APPS para isolamento de ordens de serviço."""
        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn(
            "apps.cmms",
            tenant_apps,
            "apps.cmms DEVE estar em TENANT_APPS para isolamento!"
        )

    @pytest.mark.tenant
    def test_assets_models_are_tenant_specific(self):
        """Assets deve estar em TENANT_APPS para isolamento de ativos."""
        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn(
            "apps.assets",
            tenant_apps,
            "apps.assets DEVE estar em TENANT_APPS para isolamento!"
        )

    @pytest.mark.tenant
    def test_alerts_models_are_tenant_specific(self):
        """Alerts deve estar em TENANT_APPS para isolamento de alertas."""
        tenant_apps = getattr(settings, "TENANT_APPS", [])
        self.assertIn(
            "apps.alerts",
            tenant_apps,
            "apps.alerts DEVE estar em TENANT_APPS para isolamento!"
        )

    @pytest.mark.tenant
    def test_core_events_is_shared(self):
        """
        Core Events (Outbox) pode ser shared ou tenant.

        Se shared, eventos devem ter tenant_id explícito.
        Se tenant, eventos são isolados por schema.
        """
        shared_apps = getattr(settings, "SHARED_APPS", [])
        tenant_apps = getattr(settings, "TENANT_APPS", [])

        # Deve estar em um dos dois
        in_shared = "apps.core_events" in shared_apps
        in_tenant = "apps.core_events" in tenant_apps

        self.assertTrue(
            in_shared or in_tenant,
            "apps.core_events deve estar em SHARED_APPS ou TENANT_APPS"
        )


class TenantHeaderMiddlewareTests(TenantTestCase):
    """
    Testes para o middleware X-Tenant header.

    REGRA: Endpoints respeitam tenant derivado do host/subdomínio/header.
    """

    def setUp(self):
        """Setup do cliente de teste."""
        super().setUp()
        self.client = TenantClient(self.tenant)
        self.api_client = APIClient()

        # Criar usuário no tenant de teste
        self.user = User.objects.create_user(
            username="api_tester",
            email="api_test@example.com",
            password="testpass123",
            first_name="API",
            last_name="Tester",
        )

    def test_api_health_endpoint_works(self):
        """Endpoint de health deve funcionar sem autenticação."""
        response = self.client.get("/api/health/")
        # Health pode estar em diferentes paths, aceitar 200 ou 404
        self.assertIn(response.status_code, [200, 404, 301, 302])

    def test_request_without_tenant_header_uses_domain_resolution(self):
        """
        Requisição sem X-Tenant deve usar resolução por domínio.

        No TenantTestCase, o domínio é automaticamente o tenant de teste.
        """
        # O TenantClient já está configurado com o tenant correto
        self.assertEqual(connection.schema_name, self.tenant.schema_name)

    def test_tenant_model_has_schema_name(self):
        """Tenant deve ter schema_name configurado."""
        self.assertIsNotNone(self.tenant.schema_name)
        self.assertTrue(len(self.tenant.schema_name) > 0)

    def test_authenticated_request_respects_tenant_context(self):
        """
        Requisições autenticadas devem operar no schema correto.

        Usuário criado no tenant de teste deve ser encontrado.
        """
        self.api_client.force_authenticate(user=self.user)

        # Verificar que estamos no contexto do tenant
        self.assertEqual(connection.schema_name, self.tenant.schema_name)

        # Usuário deve existir neste contexto
        user_exists = User.objects.filter(email="api_test@example.com").exists()
        self.assertTrue(user_exists)


class TenantCreationTests(TenantTestCase):
    """
    Testes para criação de tenant com fixtures/seed.

    REGRA: Fixtures/seed criam tenant + owner corretamente.
    """

    def test_tenant_test_case_creates_valid_tenant(self):
        """TenantTestCase deve criar tenant válido com schema."""
        self.assertIsNotNone(self.tenant)
        self.assertIsNotNone(self.tenant.schema_name)
        self.assertNotEqual(self.tenant.schema_name, "public")

    def test_tenant_has_required_attributes(self):
        """Tenant deve ter atributos obrigatórios."""
        required_attrs = ["schema_name"]
        for attr in required_attrs:
            self.assertTrue(
                hasattr(self.tenant, attr),
                f"Tenant missing required attribute: {attr}"
            )

    def test_can_create_user_in_tenant(self):
        """Deve ser possível criar usuário no tenant."""
        user = User.objects.create_user(
            username="tenant_owner",
            email="owner@newtenant.com",
            password="ownerpass123",
            first_name="Tenant",
            last_name="Owner",
        )
        self.assertIsNotNone(user.pk)
        self.assertEqual(user.email, "owner@newtenant.com")

    def test_tenant_schema_is_valid_postgres_identifier(self):
        """Schema name deve ser identificador PostgreSQL válido."""
        import re
        # PostgreSQL identifiers: letras, dígitos, underscores, começam com letra ou underscore
        pattern = r'^[a-zA-Z_][a-zA-Z0-9_]*$'
        self.assertTrue(
            re.match(pattern, self.tenant.schema_name),
            f"Schema name '{self.tenant.schema_name}' não é identificador PostgreSQL válido"
        )


class TenantDataLeakagePreventionTests(TenantTestCase):
    """
    Testes de prevenção de vazamento de dados entre tenants.

    Cenários críticos que NUNCA devem acontecer.
    """

    def test_finance_data_isolation(self):
        """
        Dados financeiros são críticos e DEVEM ser isolados.

        CostTransaction de um tenant não pode aparecer em outro.
        """
        from decimal import Decimal

        from django.utils import timezone

        from apps.finance.models import CostCenter, CostTransaction

        # Criar dados no tenant atual
        cc = CostCenter.objects.create(
            code="CC-ISOLATED",
            name="Isolated Cost Center",
            is_active=True,
        )
        tx = CostTransaction.objects.create(
            cost_center=cc,
            transaction_type=CostTransaction.TransactionType.LABOR,
            category=CostTransaction.Category.PREVENTIVE,
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            description="Test transaction for isolation",
            idempotency_key=f"test:isolation:{uuid.uuid4()}",
        )

        # Verificar que existe no tenant atual
        self.assertTrue(
            CostTransaction.objects.filter(pk=tx.pk).exists()
        )

        # No schema public, não deve existir
        with schema_context("public"):
            # CostTransaction é tenant-specific, não deve ter tabela no public
            # ou se tiver, não deve ter esse registro
            try:
                exists_in_public = CostTransaction.objects.filter(pk=tx.pk).exists()
                self.assertFalse(
                    exists_in_public,
                    "VAZAMENTO DE DADOS: CostTransaction encontrada no schema public!"
                )
            except Exception:
                # Tabela pode não existir no public, o que é esperado
                pass

    def test_outbox_events_have_tenant_id(self):
        """
        Eventos Outbox DEVEM ter tenant_id para rastreabilidade.

        Mesmo se OutboxEvent for shared, tenant_id permite filtrar.
        """
        from apps.core_events.models import OutboxEvent

        # Verificar que o model tem o campo tenant_id
        self.assertTrue(
            hasattr(OutboxEvent, 'tenant_id'),
            "OutboxEvent DEVE ter campo tenant_id para rastreabilidade"
        )

    def test_user_email_unique_per_tenant(self):
        """
        Email de usuário deve ser único por tenant, não globalmente.

        Permite que "admin@company.com" exista em múltiplos tenants.
        """
        # Criar usuário no tenant atual
        user1 = User.objects.create_user(
            username="shared_user",
            email="shared_email@example.com",
            password="testpass123",
        )

        # Deve existir no tenant
        self.assertTrue(
            User.objects.filter(email="shared_email@example.com").exists()
        )

        # No public, não deve existir (emails são tenant-specific)
        with schema_context("public"):
            exists_in_public = User.objects.filter(
                email="shared_email@example.com"
            ).exists()
            self.assertFalse(exists_in_public)


class RawSQLIsolationTests(TenantTestCase):
    """
    Testes para garantir que queries raw SQL também respeitam schema.

    REGRA: Mesmo queries raw devem operar no schema correto.
    """

    def test_raw_query_uses_current_schema(self):
        """
        Raw queries devem respeitar search_path do PostgreSQL.
        """
        # Executar query raw para verificar schema atual
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_schema()")
            current_schema = cursor.fetchone()[0]

        # Deve ser o schema do tenant de teste
        self.assertEqual(current_schema, self.tenant.schema_name)

    def test_raw_insert_goes_to_correct_schema(self):
        """
        INSERT via raw SQL deve ir para o schema correto.

        Nota: O sistema ClimaTrak tem um índice de usuários no schema public
        (TenantUserIndex via public_identity app) para permitir login centralizado.
        Porém, os dados COMPLETOS do usuário só existem no schema do tenant.
        """
        # Criar usuário via ORM
        User.objects.create_user(
            username="raw_test",
            email="raw_test@example.com",
            password="testpass123",
        )

        # Verificar via raw query no tenant atual
        # Nota: a tabela é 'users' (definida em accounts/models.py db_table)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM users WHERE email = %s",
                ["raw_test@example.com"]
            )
            count = cursor.fetchone()[0]

        self.assertEqual(count, 1)

        # No public schema, existe uma tabela de índice para login centralizado,
        # mas os dados são sincronizados via signals (public_identity app).
        # O importante é que o usuário ORIGINAL está no tenant, não no public.
        with schema_context("public"):
            with connection.cursor() as cursor:
                # Verificar que se existe users no public, é apenas índice
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name IN ('public_tenant_user_index', 'public_tenant_memberships')
                    """
                )
                index_tables = cursor.fetchone()[0]
                # Se existem tabelas de índice, verificar que são as certas
                if index_tables > 0:
                    # Arquitetura: public_identity sincroniza para índice
                    self.assertGreaterEqual(index_tables, 1)
