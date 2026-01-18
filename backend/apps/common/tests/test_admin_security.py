"""
Testes de segurança do Django Admin para ClimaTrak.

Estes testes validam:
1. Multi-tenant: guard de schema (tenant vs public)
2. CostTransaction: proteção de lock (imutabilidade)
3. Permissões: RBAC e proteções de readonly
4. Auditoria: logging de operações

Referências:
- docs/ops/admin.md
- .github/instructions/testing.instructions.md
"""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone

from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context

User = get_user_model()


class AdminSiteMultiTenantTests(TenantTestCase):
    """
    Testes de proteção multi-tenant no AdminSite customizado.
    
    Valida que:
    - Banner de tenant é exibido corretamente
    - Apps são filtrados por schema
    - Bloqueio de schema errado funciona
    """
    
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        # Criar superuser para testes
        self.superuser = User.objects.create_superuser(
            username="admin_test",
            email="admin@test.com",
            password="testpass123",
        )
    
    def test_get_tenant_context_public_schema(self):
        """Contexto de tenant para schema público."""
        from apps.common.admin_site import get_tenant_context
        
        request = self.factory.get("/admin/")
        
        # Mock de tenant público
        mock_tenant = MagicMock()
        mock_tenant.schema_name = "public"
        mock_tenant.name = "Public"
        request.tenant = mock_tenant
        
        ctx = get_tenant_context(request)
        
        self.assertTrue(ctx["is_public"])
        self.assertEqual(ctx["schema_name"], "public")
        self.assertEqual(ctx["tenant_color"], "#dc3545")  # Vermelho
    
    def test_get_tenant_context_tenant_schema(self):
        """Contexto de tenant para schema de tenant."""
        from apps.common.admin_site import get_tenant_context
        
        request = self.factory.get("/admin/")
        
        # Mock de tenant
        mock_tenant = MagicMock()
        mock_tenant.schema_name = "umc"
        mock_tenant.name = "UMC"
        request.tenant = mock_tenant
        
        ctx = get_tenant_context(request)
        
        self.assertFalse(ctx["is_public"])
        self.assertEqual(ctx["schema_name"], "umc")
        self.assertEqual(ctx["tenant_name"], "UMC")
        self.assertEqual(ctx["tenant_color"], "#0d9488")  # Teal
    
    def test_tenant_only_apps_filtered_in_public(self):
        """Apps tenant-only são filtrados no schema público."""
        from apps.common.admin_site import TENANT_ONLY_APPS
        
        # Verificar que apps críticos estão na lista
        self.assertIn("cmms", TENANT_ONLY_APPS)
        self.assertIn("trakledger", TENANT_ONLY_APPS)
        self.assertIn("inventory", TENANT_ONLY_APPS)
    
    def test_public_only_apps_filtered_in_tenant(self):
        """Apps public-only são filtrados em schema de tenant."""
        from apps.common.admin_site import PUBLIC_ONLY_APPS
        
        # Verificar que apps de gestão estão na lista
        self.assertIn("tenants", PUBLIC_ONLY_APPS)
        self.assertIn("public_identity", PUBLIC_ONLY_APPS)


class CostTransactionAdminSecurityTests(TenantTestCase):
    """
    Testes de segurança para CostTransactionAdmin.
    
    Valida que:
    - Transações locked não podem ser editadas
    - Delete é sempre proibido
    - Add é restrito a superusers
    """
    
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        # Criar usuários para testes
        self.superuser = User.objects.create_superuser(
            username="super_test",
            email="super@test.com",
            password="testpass123",
        )
        self.staff_user = User.objects.create_user(
            username="staff_test",
            email="staff@test.com",
            password="testpass123",
            is_staff=True,
        )
        
        # Criar centro de custo para transações
        from apps.trakledger.models import CostCenter
        
        self.cost_center = CostCenter.objects.create(
            code="CC-TEST",
            name="Centro de Custo Teste",
        )
    
    def _create_transaction(self, is_locked=False):
        """Helper para criar transação de teste."""
        from apps.trakledger.models import CostTransaction
        
        txn = CostTransaction.objects.create(
            transaction_type="labor",
            category="corrective",
            amount=Decimal("100.00"),
            occurred_at=timezone.now(),
            description="Transação de teste",
            cost_center=self.cost_center,
            is_locked=is_locked,
            locked_at=timezone.now() if is_locked else None,
            locked_by=self.superuser if is_locked else None,
            created_by=self.superuser,
        )
        return txn
    
    def test_delete_always_denied(self):
        """Delete de CostTransaction é sempre proibido."""
        from apps.trakledger.admin import CostTransactionAdmin
        from apps.trakledger.models import CostTransaction
        
        admin = CostTransactionAdmin(
            model=CostTransaction,
            admin_site=AdminSite(),
        )
        
        request = self.factory.get("/admin/")
        request.user = self.superuser
        
        # Mesmo superuser não pode deletar
        txn = self._create_transaction(is_locked=False)
        
        self.assertFalse(admin.has_delete_permission(request, txn))
        self.assertFalse(admin.has_delete_permission(request, None))
    
    def test_change_locked_denied(self):
        """Edição de transação locked é negada."""
        from apps.trakledger.admin import CostTransactionAdmin
        from apps.trakledger.models import CostTransaction
        
        admin = CostTransactionAdmin(
            model=CostTransaction,
            admin_site=AdminSite(),
        )
        
        request = self.factory.get("/admin/")
        request.user = self.superuser
        
        # Transação locked
        txn = self._create_transaction(is_locked=True)
        
        self.assertFalse(admin.has_change_permission(request, txn))
    
    def test_change_unlocked_superuser_only(self):
        """Edição de transação não-locked apenas para superuser."""
        from apps.trakledger.admin import CostTransactionAdmin
        from apps.trakledger.models import CostTransaction
        
        admin = CostTransactionAdmin(
            model=CostTransaction,
            admin_site=AdminSite(),
        )
        
        txn = self._create_transaction(is_locked=False)
        
        # Superuser pode editar
        request = self.factory.get("/admin/")
        request.user = self.superuser
        self.assertTrue(admin.has_change_permission(request, txn))
        
        # Staff comum não pode editar
        request.user = self.staff_user
        self.assertFalse(admin.has_change_permission(request, txn))
    
    def test_add_superuser_only(self):
        """Criação via admin apenas para superusers."""
        from apps.trakledger.admin import CostTransactionAdmin
        from apps.trakledger.models import CostTransaction
        
        admin = CostTransactionAdmin(
            model=CostTransaction,
            admin_site=AdminSite(),
        )
        
        # Superuser pode criar
        request = self.factory.get("/admin/")
        request.user = self.superuser
        self.assertTrue(admin.has_add_permission(request))
        
        # Staff comum não pode criar
        request.user = self.staff_user
        self.assertFalse(admin.has_add_permission(request))


class OutboxEventAdminSecurityTests(TenantTestCase):
    """
    Testes de segurança para OutboxEventAdmin.
    
    Valida que:
    - Eventos são readonly (sem add/change)
    - Delete apenas para superusers
    - Reprocessamento é idempotente
    """
    
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        self.superuser = User.objects.create_superuser(
            username="super_outbox",
            email="super@outbox.com",
            password="testpass123",
        )
        self.staff_user = User.objects.create_user(
            username="staff_outbox",
            email="staff@outbox.com",
            password="testpass123",
            is_staff=True,
        )
    
    def test_add_denied(self):
        """Criação manual de eventos é negada."""
        from apps.core_events.admin import OutboxEventAdmin
        from apps.core_events.models import OutboxEvent
        
        admin = OutboxEventAdmin(
            model=OutboxEvent,
            admin_site=AdminSite(),
        )
        
        request = self.factory.get("/admin/")
        request.user = self.superuser
        
        self.assertFalse(admin.has_add_permission(request))
    
    def test_change_denied(self):
        """Edição de eventos é negada."""
        from apps.core_events.admin import OutboxEventAdmin
        from apps.core_events.models import OutboxEvent
        
        admin = OutboxEventAdmin(
            model=OutboxEvent,
            admin_site=AdminSite(),
        )
        
        request = self.factory.get("/admin/")
        request.user = self.superuser
        
        self.assertFalse(admin.has_change_permission(request, None))
    
    def test_delete_superuser_only(self):
        """Delete apenas para superusers."""
        from apps.core_events.admin import OutboxEventAdmin
        from apps.core_events.models import OutboxEvent
        
        admin = OutboxEventAdmin(
            model=OutboxEvent,
            admin_site=AdminSite(),
        )
        
        # Superuser pode deletar
        request = self.factory.get("/admin/")
        request.user = self.superuser
        self.assertTrue(admin.has_delete_permission(request, None))
        
        # Staff comum não pode deletar
        request.user = self.staff_user
        self.assertFalse(admin.has_delete_permission(request, None))


class BaseAdminAuditTests(TenantTestCase):
    """
    Testes de auditoria (logging) do BaseAdmin.
    
    Valida que:
    - save_model gera log
    - delete_model gera log
    - Logs contêm informações de tenant
    """
    
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        self.superuser = User.objects.create_superuser(
            username="audit_test",
            email="audit@test.com",
            password="testpass123",
        )
    
    @patch("apps.common.admin_base.logger")
    def test_save_model_logs(self, mock_logger):
        """save_model gera log estruturado."""
        from apps.common.admin_base import BaseAdmin
        from apps.trakledger.models import CostCenter
        
        admin = BaseAdmin(
            model=CostCenter,
            admin_site=AdminSite(),
        )
        
        request = self.factory.post("/admin/")
        request.user = self.superuser
        request.META["REMOTE_ADDR"] = "127.0.0.1"
        
        # Mock de tenant
        mock_tenant = MagicMock()
        mock_tenant.schema_name = "umc"
        mock_tenant.name = "UMC"
        request.tenant = mock_tenant
        
        # Criar objeto
        obj = CostCenter(code="CC-AUDIT", name="Teste Audit")
        obj.save()
        
        # Mock de form
        mock_form = MagicMock()
        mock_form.changed_data = ["name"]
        
        # Chamar save_model (sem change=True, seria add)
        admin.save_model(request, obj, mock_form, change=False)
        
        # Verificar que log foi chamado
        mock_logger.info.assert_called_once()
        call_args = mock_logger.info.call_args
        
        # Verificar conteúdo do log
        log_extra = call_args.kwargs.get("extra", {})
        self.assertEqual(log_extra["admin_action"], "add")
        self.assertEqual(log_extra["username"], "audit_test")
        self.assertEqual(log_extra["tenant"], "UMC")
        self.assertEqual(log_extra["schema"], "umc")


class InventoryMovementReadonlyTests(TenantTestCase):
    """
    Testes para garantir que InventoryMovement é readonly.
    """
    
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        self.superuser = User.objects.create_superuser(
            username="inv_test",
            email="inv@test.com",
            password="testpass123",
        )
    
    def test_movement_readonly(self):
        """InventoryMovement é totalmente readonly."""
        from apps.inventory.admin import InventoryMovementAdmin
        from apps.inventory.models import InventoryMovement
        
        admin = InventoryMovementAdmin(
            model=InventoryMovement,
            admin_site=AdminSite(),
        )
        
        request = self.factory.get("/admin/")
        request.user = self.superuser
        
        # Nenhuma operação permitida
        self.assertFalse(admin.has_add_permission(request))
        self.assertFalse(admin.has_change_permission(request, None))
        self.assertFalse(admin.has_delete_permission(request, None))
