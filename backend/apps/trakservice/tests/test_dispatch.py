"""
Tests for TrakService Dispatch feature.

Tests cover:
1. TechnicianProfile CRUD
2. ServiceAssignment CRUD
3. Feature gating (dispatch feature required)
4. Assignment status transitions
5. Filtering by date/technician/status
"""

import pytest
from datetime import date, time, timedelta
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from django_tenants.utils import schema_context

from apps.tenants.models import Tenant, Domain
from apps.tenants.features import FeatureService
from apps.trakservice.models import TechnicianProfile, ServiceAssignment
from apps.trakservice.services import DispatchService


User = get_user_model()


@pytest.fixture
def tenant_with_dispatch(db):
    """Create a tenant with dispatch feature enabled."""
    with schema_context("public"):
        tenant = Tenant.objects.create(
            name="Dispatch Tenant",
            slug="dispatch-test",
            schema_name="dispatch_test",
        )
        Domain.objects.create(
            domain="dispatch-test.localhost",
            tenant=tenant,
            is_primary=True,
        )
        # Enable dispatch feature
        FeatureService.set_features(
            tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
            },
        )
        return tenant


@pytest.fixture
def tenant_without_dispatch(db):
    """Create a tenant with TrakService but NO dispatch feature."""
    with schema_context("public"):
        tenant = Tenant.objects.create(
            name="No Dispatch Tenant",
            slug="no-dispatch-test",
            schema_name="no_dispatch_test",
        )
        Domain.objects.create(
            domain="no-dispatch-test.localhost",
            tenant=tenant,
            is_primary=True,
        )
        # Enable TrakService but NOT dispatch
        FeatureService.set_features(
            tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": False,
            },
        )
        return tenant


@pytest.fixture
def auth_user(tenant_with_dispatch):
    """Create an authenticated user."""
    with schema_context(tenant_with_dispatch.schema_name):
        user = User.objects.create_user(
            email="dispatcher@test.com",
            password="testpass123",
            first_name="Test",
            last_name="Dispatcher",
        )
        return user


@pytest.fixture
def technician_user(tenant_with_dispatch):
    """Create a user to be a technician."""
    with schema_context(tenant_with_dispatch.schema_name):
        user = User.objects.create_user(
            email="tech@test.com",
            password="testpass123",
            first_name="John",
            last_name="Tech",
        )
        return user


@pytest.fixture
def technician_profile(tenant_with_dispatch, technician_user):
    """Create a technician profile."""
    with schema_context(tenant_with_dispatch.schema_name):
        profile = TechnicianProfile.objects.create(
            user=technician_user,
            phone="11999999999",
            skills=["HVAC", "Elétrica"],
            is_active=True,
        )
        return profile


@pytest.fixture
def work_order(tenant_with_dispatch):
    """Create a work order for testing."""
    from apps.cmms.models import WorkOrder
    from apps.assets.models import Asset, AssetType
    from apps.locations.models import Site
    
    with schema_context(tenant_with_dispatch.schema_name):
        # Create required related objects
        site = Site.objects.create(
            name="Test Site",
            code="TS01",
        )
        asset_type = AssetType.objects.create(
            name="Test Type",
            code="TT",
        )
        asset = Asset.objects.create(
            name="Test Asset",
            tag="ASSET-001",
            site=site,
            asset_type=asset_type,
        )
        wo = WorkOrder.objects.create(
            number="WO-TEST-001",
            asset=asset,
            description="Test work order",
            type=WorkOrder.Type.CORRECTIVE,
            status=WorkOrder.Status.OPEN,
            priority=WorkOrder.Priority.MEDIUM,
        )
        return wo


@pytest.fixture
def api_client(tenant_with_dispatch, auth_user):
    """Create an authenticated API client."""
    client = APIClient()
    client.force_authenticate(user=auth_user)
    return client


# =============================================================================
# Model Tests
# =============================================================================


class TestTechnicianProfileModel:
    """Tests for TechnicianProfile model."""

    def test_create_technician_profile(self, tenant_with_dispatch, technician_user):
        """Test creating a technician profile."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            profile = TechnicianProfile.objects.create(
                user=technician_user,
                phone="11988887777",
                skills=["HVAC"],
            )
            
            assert profile.id is not None
            assert profile.user == technician_user
            assert profile.is_active is True
            assert profile.full_name == "John Tech"

    def test_technician_str(self, technician_profile, tenant_with_dispatch):
        """Test TechnicianProfile string representation."""
        with schema_context(tenant_with_dispatch.schema_name):
            assert str(technician_profile) == "John Tech"


class TestServiceAssignmentModel:
    """Tests for ServiceAssignment model."""

    def test_create_assignment(
        self, tenant_with_dispatch, technician_profile, work_order
    ):
        """Test creating a service assignment."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            assignment = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
                scheduled_start=time(9, 0),
                scheduled_end=time(12, 0),
            )
            
            assert assignment.id is not None
            assert assignment.status == ServiceAssignment.Status.SCHEDULED

    def test_assignment_status_transitions(
        self, tenant_with_dispatch, technician_profile, work_order
    ):
        """Test assignment status transitions."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            assignment = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            
            # Test en_route
            assignment.set_en_route()
            assert assignment.status == ServiceAssignment.Status.EN_ROUTE
            assert assignment.departed_at is not None
            
            # Test on_site
            assignment.set_on_site()
            assert assignment.status == ServiceAssignment.Status.ON_SITE
            assert assignment.arrived_at is not None
            
            # Test done
            assignment.set_done()
            assert assignment.status == ServiceAssignment.Status.DONE
            assert assignment.completed_at is not None

    def test_assignment_cancellation(
        self, tenant_with_dispatch, technician_profile, work_order
    ):
        """Test assignment cancellation with reason."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            assignment = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            
            assignment.set_canceled(reason="Cliente não disponível")
            
            assert assignment.status == ServiceAssignment.Status.CANCELED
            assert assignment.canceled_at is not None
            assert assignment.cancellation_reason == "Cliente não disponível"


# =============================================================================
# API Tests - Feature Gating
# =============================================================================


class TestDispatchFeatureGating:
    """Tests for dispatch feature gating."""

    def test_technicians_blocked_without_dispatch_feature(
        self, tenant_without_dispatch, auth_user
    ):
        """Test that technicians endpoint returns 403 without dispatch feature."""
        client = APIClient()
        client.force_authenticate(user=auth_user)
        
        with schema_context(tenant_without_dispatch.schema_name):
            connection.tenant = tenant_without_dispatch
            response = client.get("/api/trakservice/technicians/")
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_assignments_blocked_without_dispatch_feature(
        self, tenant_without_dispatch, auth_user
    ):
        """Test that assignments endpoint returns 403 without dispatch feature."""
        client = APIClient()
        client.force_authenticate(user=auth_user)
        
        with schema_context(tenant_without_dispatch.schema_name):
            connection.tenant = tenant_without_dispatch
            response = client.get("/api/trakservice/assignments/")
            assert response.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# API Tests - Technicians
# =============================================================================


class TestTechnicianAPI:
    """Tests for Technician API endpoints."""

    def test_list_technicians(self, api_client, technician_profile, tenant_with_dispatch):
        """Test listing technicians."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            response = api_client.get("/api/trakservice/technicians/")
            
            assert response.status_code == status.HTTP_200_OK
            assert len(response.data) >= 1

    def test_create_technician(self, api_client, tenant_with_dispatch):
        """Test creating a technician profile."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            # Create a user first
            user = User.objects.create_user(
                email="newtech@test.com",
                password="testpass123",
                first_name="New",
                last_name="Technician",
            )
            
            data = {
                "user_id": user.id,
                "phone": "11977776666",
                "skills": ["Refrigeração"],
            }
            
            response = api_client.post(
                "/api/trakservice/technicians/",
                data,
                format="json",
            )
            
            assert response.status_code == status.HTTP_201_CREATED
            assert TechnicianProfile.objects.filter(user=user).exists()

    def test_get_active_technicians(
        self, api_client, technician_profile, tenant_with_dispatch
    ):
        """Test getting only active technicians."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            response = api_client.get("/api/trakservice/technicians/active/")
            
            assert response.status_code == status.HTTP_200_OK
            # All returned should be active
            for tech in response.data:
                assert tech["is_active"] is True


# =============================================================================
# API Tests - Assignments
# =============================================================================


class TestAssignmentAPI:
    """Tests for ServiceAssignment API endpoints."""

    def test_create_assignment(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test creating a service assignment."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            data = {
                "work_order": work_order.id,
                "technician": str(technician_profile.id),
                "scheduled_date": str(date.today()),
                "scheduled_start": "09:00:00",
                "scheduled_end": "12:00:00",
                "notes": "Test assignment",
            }
            
            response = api_client.post(
                "/api/trakservice/assignments/",
                data,
                format="json",
            )
            
            assert response.status_code == status.HTTP_201_CREATED
            assert response.data["status"] == "scheduled"

    def test_list_assignments(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test listing assignments."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            # Create an assignment
            ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            
            response = api_client.get("/api/trakservice/assignments/")
            
            assert response.status_code == status.HTTP_200_OK
            assert len(response.data) >= 1

    def test_filter_assignments_by_date(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test filtering assignments by date."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            today = date.today()
            tomorrow = today + timedelta(days=1)
            
            # Create assignments for different dates
            ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=today,
            )
            
            # Filter by today
            response = api_client.get(
                f"/api/trakservice/assignments/?date={today}"
            )
            
            assert response.status_code == status.HTTP_200_OK
            for item in response.data:
                assert item["scheduled_date"] == str(today)

    def test_filter_assignments_by_technician(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test filtering assignments by technician."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            # Create assignment
            ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            
            # Filter by technician
            response = api_client.get(
                f"/api/trakservice/assignments/?technician_id={technician_profile.id}"
            )
            
            assert response.status_code == status.HTTP_200_OK
            for item in response.data:
                assert item["technician"]["id"] == str(technician_profile.id)

    def test_filter_assignments_by_status(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test filtering assignments by status."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            # Create assignment
            assignment = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            assignment.set_en_route()
            
            # Filter by en_route status
            response = api_client.get(
                "/api/trakservice/assignments/?status=en_route"
            )
            
            assert response.status_code == status.HTTP_200_OK
            for item in response.data:
                assert item["status"] == "en_route"

    def test_change_assignment_status(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test changing assignment status via API."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            # Create assignment
            assignment = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            
            # Change status to en_route
            response = api_client.post(
                f"/api/trakservice/assignments/{assignment.id}/status/",
                {"status": "en_route"},
                format="json",
            )
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "en_route"
            
            # Change status to on_site
            response = api_client.post(
                f"/api/trakservice/assignments/{assignment.id}/status/",
                {"status": "on_site"},
                format="json",
            )
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "on_site"

    def test_cancel_assignment_requires_reason(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test that canceling an assignment requires a reason."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            assignment = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=date.today(),
            )
            
            # Try to cancel without reason
            response = api_client.post(
                f"/api/trakservice/assignments/{assignment.id}/status/",
                {"status": "canceled"},
                format="json",
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "reason" in str(response.data)
            
            # Cancel with reason
            response = api_client.post(
                f"/api/trakservice/assignments/{assignment.id}/status/",
                {"status": "canceled", "reason": "Cliente cancelou"},
                format="json",
            )
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "canceled"

    def test_get_today_assignments(
        self, api_client, technician_profile, work_order, tenant_with_dispatch
    ):
        """Test getting today's assignments."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            today = date.today()
            
            ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=today,
            )
            
            response = api_client.get("/api/trakservice/assignments/today/")
            
            assert response.status_code == status.HTTP_200_OK
            for item in response.data:
                assert item["scheduled_date"] == str(today)


# =============================================================================
# Service Layer Tests
# =============================================================================


class TestDispatchService:
    """Tests for DispatchService."""

    def test_get_technician_schedule(
        self, tenant_with_dispatch, technician_profile, work_order
    ):
        """Test getting a technician's schedule."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            today = date.today()
            
            # Create assignments
            ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=today,
            )
            
            schedule = DispatchService.get_technician_schedule(
                technician_id=technician_profile.id,
                date_from=today,
                date_to=today + timedelta(days=7),
            )
            
            assert schedule.count() >= 1

    def test_get_daily_summary(
        self, tenant_with_dispatch, technician_profile, work_order
    ):
        """Test getting daily summary statistics."""
        with schema_context(tenant_with_dispatch.schema_name):
            connection.tenant = tenant_with_dispatch
            
            today = date.today()
            
            # Create assignments with different statuses
            assignment1 = ServiceAssignment.objects.create(
                work_order=work_order,
                technician=technician_profile,
                scheduled_date=today,
            )
            
            summary = DispatchService.get_daily_summary(today)
            
            assert "total" in summary
            assert "scheduled" in summary
            assert summary["scheduled"] >= 1
