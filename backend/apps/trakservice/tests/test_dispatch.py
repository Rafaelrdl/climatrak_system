"""
Tests for TrakService Dispatch feature.

Tests cover:
1. TechnicianProfile CRUD
2. ServiceAssignment CRUD
3. Feature gating (dispatch feature required)
4. Assignment status transitions
5. Filtering by date/technician/status

NOTA: Estes testes usam TenantTestCase com chamadas diretas às views via
RequestFactory em vez de HTTP client, para funcionar corretamente com
django-tenants multi-tenant.
"""

import uuid
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

from apps.tenants.features import FeatureService
from apps.trakservice.models import ServiceAssignment, TechnicianProfile
from apps.trakservice.services import DispatchService
from apps.trakservice.views import ServiceAssignmentViewSet, TechnicianProfileViewSet

User = get_user_model()


class BaseDispatchTestCase(TenantTestCase):
    """Base class para testes de Dispatch.

    Herda de TenantTestCase para criar automaticamente um tenant de teste
    e executar os testes dentro desse schema.
    Usa APIRequestFactory + force_authenticate para criar requests
    autenticados e chama views diretamente.
    """

    def setUp(self):
        """Setup comum para todos os testes."""
        super().setUp()
        self.factory = APIRequestFactory()

        # Enable dispatch feature for the test tenant
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
            },
        )

        # Create test user (dispatcher)
        self.user = User.objects.create_user(
            username="dispatcher",
            email="dispatcher@test.com",
            password="testpass123",
            first_name="Test",
            last_name="Dispatcher",
        )

        # Create technician user
        self.tech_user = User.objects.create_user(
            username="tech",
            email="tech@test.com",
            password="testpass123",
            first_name="John",
            last_name="Tech",
        )

        # Create technician profile
        self.technician = TechnicianProfile.objects.create(
            user=self.tech_user,
            phone="11999999999",
            skills=["HVAC", "Elétrica"],
            is_active=True,
        )

    def _create_work_order(self):
        """Helper to create a work order for testing."""
        from apps.assets.models import Asset, AssetType, Site
        from apps.cmms.models import WorkOrder

        # Create required related objects
        site = Site.objects.create(
            name="Test Site",
        )
        asset_type, _ = AssetType.objects.get_or_create(
            code="HVAC",
            defaults={"name": "HVAC Unit"},
        )
        asset = Asset.objects.create(
            name="Test Asset",
            tag=f"ASSET-{uuid.uuid4().hex[:8]}",
            site=site,
            asset_type=asset_type,
        )
        wo = WorkOrder.objects.create(
            number=f"WO-{uuid.uuid4().hex[:8]}",
            asset=asset,
            description="Test work order",
            type=WorkOrder.Type.CORRECTIVE,
            status=WorkOrder.Status.OPEN,
            priority=WorkOrder.Priority.MEDIUM,
        )
        return wo


# =============================================================================
# Model Tests
# =============================================================================


class TechnicianProfileModelTests(BaseDispatchTestCase):
    """Tests for TechnicianProfile model."""

    def test_create_technician_profile(self):
        """Test creating a technician profile."""
        new_user = User.objects.create_user(
            username="newtech",
            email="newtech@test.com",
            password="testpass123",
            first_name="New",
            last_name="Tech",
        )

        profile = TechnicianProfile.objects.create(
            user=new_user,
            phone="11988887777",
            skills=["HVAC"],
        )

        self.assertIsNotNone(profile.id)
        self.assertEqual(profile.user, new_user)
        self.assertTrue(profile.is_active)
        self.assertEqual(profile.full_name, "New Tech")

    def test_technician_str(self):
        """Test TechnicianProfile string representation."""
        self.assertEqual(str(self.technician), "John Tech")

    def test_technician_skills_json(self):
        """Test that skills are stored as JSON array."""
        self.assertEqual(self.technician.skills, ["HVAC", "Elétrica"])


class ServiceAssignmentModelTests(BaseDispatchTestCase):
    """Tests for ServiceAssignment model."""

    def test_create_assignment(self):
        """Test creating a service assignment."""
        wo = self._create_work_order()

        assignment = ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
            scheduled_start=time(9, 0),
            scheduled_end=time(12, 0),
        )

        self.assertIsNotNone(assignment.id)
        self.assertEqual(assignment.status, ServiceAssignment.Status.SCHEDULED)

    def test_assignment_status_transitions(self):
        """Test assignment status transitions."""
        wo = self._create_work_order()

        assignment = ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        # Test en_route
        assignment.set_en_route()
        self.assertEqual(assignment.status, ServiceAssignment.Status.EN_ROUTE)
        self.assertIsNotNone(assignment.departed_at)

        # Test on_site
        assignment.set_on_site()
        self.assertEqual(assignment.status, ServiceAssignment.Status.ON_SITE)
        self.assertIsNotNone(assignment.arrived_at)

        # Test done
        assignment.set_done()
        self.assertEqual(assignment.status, ServiceAssignment.Status.DONE)
        self.assertIsNotNone(assignment.completed_at)

    def test_assignment_cancellation(self):
        """Test assignment cancellation with reason."""
        wo = self._create_work_order()

        assignment = ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        assignment.set_canceled(reason="Cliente não disponível")

        self.assertEqual(assignment.status, ServiceAssignment.Status.CANCELED)
        self.assertIsNotNone(assignment.canceled_at)
        self.assertEqual(assignment.cancellation_reason, "Cliente não disponível")


# =============================================================================
# API Tests - Technicians
# =============================================================================


class TechnicianAPITests(BaseDispatchTestCase):
    """Tests for Technician API endpoints."""

    def test_list_technicians(self):
        """GET /api/trakservice/technicians/ deve listar técnicos."""
        request = self.factory.get("/api/trakservice/technicians/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = TechnicianProfileViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_create_technician(self):
        """POST /api/trakservice/technicians/ deve criar técnico."""
        new_user = User.objects.create_user(
            username="createtech",
            email="createtech@test.com",
            password="testpass123",
            first_name="Created",
            last_name="Tech",
        )

        data = {
            "user_id": new_user.id,
            "phone": "11977776666",
            "skills": ["Refrigeração"],
        }

        request = self.factory.post(
            "/api/trakservice/technicians/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = TechnicianProfileViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TechnicianProfile.objects.filter(user=new_user).exists())

    def test_get_active_technicians(self):
        """GET /api/trakservice/technicians/active/ deve retornar só ativos."""
        # Create an inactive technician
        inactive_user = User.objects.create_user(
            username="inactive",
            email="inactive@test.com",
            password="testpass123",
            first_name="Inactive",
            last_name="Tech",
        )
        TechnicianProfile.objects.create(
            user=inactive_user,
            phone="11955554444",
            skills=["Test"],
            is_active=False,
        )

        request = self.factory.get("/api/trakservice/technicians/active/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = TechnicianProfileViewSet.as_view({"get": "active"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned should be active
        for tech in response.data:
            self.assertTrue(tech["is_active"])

    def test_get_technician_detail(self):
        """GET /api/trakservice/technicians/{id}/ deve retornar detalhes."""
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = TechnicianProfileViewSet.as_view({"get": "retrieve"})
        response = view(request, pk=str(self.technician.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.technician.id))


# =============================================================================
# API Tests - Assignments
# =============================================================================


class AssignmentAPITests(BaseDispatchTestCase):
    """Tests for ServiceAssignment API endpoints."""

    def test_create_assignment(self):
        """POST /api/trakservice/assignments/ deve criar atribuição."""
        wo = self._create_work_order()

        data = {
            "work_order": wo.id,
            "technician": str(self.technician.id),
            "scheduled_date": str(date.today()),
            "scheduled_start": "09:00:00",
            "scheduled_end": "12:00:00",
            "notes": "Test assignment",
        }

        request = self.factory.post(
            "/api/trakservice/assignments/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"post": "create"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "scheduled")

    def test_list_assignments(self):
        """GET /api/trakservice/assignments/ deve listar atribuições."""
        wo = self._create_work_order()
        ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        request = self.factory.get("/api/trakservice/assignments/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_filter_assignments_by_date(self):
        """Filtrar atribuições por data."""
        wo = self._create_work_order()
        today = date.today()

        ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=today,
        )

        request = self.factory.get(f"/api/trakservice/assignments/?date={today}")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response may be paginated (dict with 'results') or a list
        results = (
            response.data.get("results", response.data)
            if isinstance(response.data, dict)
            else response.data
        )
        for item in results:
            self.assertEqual(item["scheduled_date"], str(today))

    def test_filter_assignments_by_technician(self):
        """Filtrar atribuições por técnico."""
        wo = self._create_work_order()

        ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        request = self.factory.get(
            f"/api/trakservice/assignments/?technician_id={self.technician.id}"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response may be paginated (dict with 'results') or a list
        results = (
            response.data.get("results", response.data)
            if isinstance(response.data, dict)
            else response.data
        )
        for item in results:
            # technician is a nested object with id
            self.assertEqual(item["technician"]["id"], str(self.technician.id))

    def test_filter_assignments_by_status(self):
        """Filtrar atribuições por status."""
        wo = self._create_work_order()

        assignment = ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        request = self.factory.get("/api/trakservice/assignments/?status=scheduled")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response may be paginated (dict with 'results') or a list
        results = (
            response.data.get("results", response.data)
            if isinstance(response.data, dict)
            else response.data
        )
        for item in results:
            self.assertEqual(item["status"], "scheduled")

    def test_change_assignment_status(self):
        """POST para mudar status da atribuição."""
        wo = self._create_work_order()

        assignment = ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        request = self.factory.post(
            f"/api/trakservice/assignments/{assignment.id}/status/",
            {"status": "en_route"},
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"post": "change_status"})
        response = view(request, pk=str(assignment.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, ServiceAssignment.Status.EN_ROUTE)

    def test_cancel_assignment_requires_reason(self):
        """Cancelar atribuição requer motivo."""
        wo = self._create_work_order()

        assignment = ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        # Try without reason
        request = self.factory.post(
            f"/api/trakservice/assignments/{assignment.id}/status/",
            {"status": "canceled"},
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"post": "change_status"})
        response = view(request, pk=str(assignment.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # With reason should work
        request = self.factory.post(
            f"/api/trakservice/assignments/{assignment.id}/status/",
            {"status": "canceled", "reason": "Cliente cancelou"},
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = view(request, pk=str(assignment.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_today_assignments(self):
        """GET /api/trakservice/assignments/today/ retorna agenda de hoje."""
        wo = self._create_work_order()

        ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        request = self.factory.get("/api/trakservice/assignments/today/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"get": "today"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)


# =============================================================================
# Service Tests
# =============================================================================


class DispatchServiceTests(BaseDispatchTestCase):
    """Tests for DispatchService."""

    def test_get_technician_schedule(self):
        """Testar obtenção da agenda de um técnico."""
        wo = self._create_work_order()

        ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        schedule = DispatchService.get_technician_schedule(
            technician_id=self.technician.id,
            date_from=date.today(),
            date_to=date.today() + timedelta(days=7),
        )

        self.assertGreaterEqual(len(schedule), 1)

    def test_get_daily_summary(self):
        """Testar resumo diário do dispatch."""
        wo = self._create_work_order()

        ServiceAssignment.objects.create(
            work_order=wo,
            technician=self.technician,
            scheduled_date=date.today(),
        )

        summary = DispatchService.get_daily_summary(date.today())

        self.assertIn("total", summary)
        self.assertIn("scheduled", summary)
        self.assertGreaterEqual(summary["total"], 1)


# =============================================================================
# Feature Gating Tests
# =============================================================================


class FeatureGatingTests(TenantTestCase):
    """Tests for dispatch feature gating.

    Uses a separate tenant without dispatch feature enabled.
    """

    def setUp(self):
        """Setup tenant WITHOUT dispatch feature."""
        super().setUp()
        self.factory = APIRequestFactory()

        # Set features - dispatch DISABLED
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": False,
            },
        )

        # Create test user
        self.user = User.objects.create_user(
            username="nofeature",
            email="nofeature@test.com",
            password="testpass123",
            first_name="No",
            last_name="Feature",
        )

    def test_technicians_blocked_without_dispatch_feature(self):
        """Endpoints de técnicos devem retornar 403 sem feature dispatch."""
        request = self.factory.get("/api/trakservice/technicians/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = TechnicianProfileViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assignments_blocked_without_dispatch_feature(self):
        """Endpoints de atribuições devem retornar 403 sem feature dispatch."""
        request = self.factory.get("/api/trakservice/assignments/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        view = ServiceAssignmentViewSet.as_view({"get": "list"})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
