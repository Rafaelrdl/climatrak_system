"""
Pytest configuration and fixtures for ClimaTrak Backend tests.

This file provides common fixtures for:
- Django test client with tenant context
- Test user creation
- API authentication
- Multi-tenant test setup
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

User = get_user_model()


@pytest.fixture
def api_client():
    """Return a DRF API test client."""
    return APIClient()


@pytest.fixture
def user_password():
    """Default password for test users."""
    return "TestPassword123!"


@pytest.fixture
def create_user(db, user_password):
    """Factory fixture to create test users."""
    def _create_user(email="test@example.com", password=None, **kwargs):
        if password is None:
            password = user_password
        defaults = {
            "first_name": "Test",
            "last_name": "User",
            "is_active": True,
        }
        defaults.update(kwargs)
        user = User.objects.create_user(email=email, password=password, **defaults)
        return user
    return _create_user


@pytest.fixture
def authenticated_client(api_client, create_user, user_password):
    """Return an authenticated API client."""
    user = create_user()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_user(db, user_password):
    """Create an admin/superuser for testing."""
    user = User.objects.create_superuser(
        email="admin@example.com",
        password=user_password,
        first_name="Admin",
        last_name="User",
    )
    return user


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an authenticated API client with admin privileges."""
    api_client.force_authenticate(user=admin_user)
    return api_client


# =============================================================================
# Multi-tenant fixtures
# =============================================================================

@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Extend the default Django DB setup for tenant tests."""
    # The default setup is sufficient for most tests
    # Tenant-specific setup happens in individual test classes
    pass


@pytest.fixture
def tenant_client(db):
    """
    Return a tenant-aware test client.
    
    Note: For full tenant isolation tests, use TenantTestCase class instead.
    """
    return TenantClient()


# =============================================================================
# Finance module fixtures
# =============================================================================

@pytest.fixture
def cost_center(db):
    """Create a test cost center."""
    from apps.trakledger.models import CostCenter
    return CostCenter.objects.create(
        code="CC-TEST-001",
        name="Test Cost Center",
        description="Cost center for testing",
        is_active=True,
    )


@pytest.fixture
def rate_card(db):
    """Create a test rate card."""
    from apps.trakledger.models import RateCard
    from decimal import Decimal
    return RateCard.objects.create(
        name="Default Rate Card",
        labor_rate_per_hour=Decimal("75.00"),
        overtime_multiplier=Decimal("1.5"),
        is_default=True,
        is_active=True,
    )


# =============================================================================
# CMMS module fixtures
# =============================================================================

@pytest.fixture
def work_order_status():
    """Return common work order status values."""
    return {
        "open": "open",
        "in_progress": "in_progress",
        "completed": "completed",
        "cancelled": "cancelled",
    }


# =============================================================================
# Assets module fixtures
# =============================================================================

@pytest.fixture
def site(db):
    """Create a test site."""
    from apps.locations.models import Site
    return Site.objects.create(
        name="Test Site",
        code="SITE-001",
        is_active=True,
    )


# =============================================================================
# Utility fixtures
# =============================================================================

@pytest.fixture
def mock_celery_task(mocker):
    """Mock Celery task delay to run synchronously."""
    def _mock_task(task_path):
        return mocker.patch(f"{task_path}.delay", side_effect=lambda *args, **kwargs: None)
    return _mock_task


@pytest.fixture
def freeze_time():
    """
    Fixture to freeze time for deterministic tests.
    
    Usage:
        def test_something(freeze_time):
            with freeze_time("2024-01-15 10:00:00"):
                # time is frozen here
    """
    try:
        from freezegun import freeze_time as _freeze_time
        return _freeze_time
    except ImportError:
        pytest.skip("freezegun not installed")
