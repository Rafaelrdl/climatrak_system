"""
TrakService Tracking Tests

Tests for location tracking functionality:
- Feature gating (trakservice.tracking)
- Privacy constraints (allow_tracking, work window)
- Ping submission
- Latest location retrieval
- Trail retrieval
"""

from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.trakservice.models import LocationPing, TechnicianProfile
from apps.trakservice.views import LocationPingView, TechnicianLocationView
from apps.tenants.features import FeatureService

User = get_user_model()


class BaseTrackingTestCase(TenantTestCase):
    """Base test case for tracking tests with common setup."""
    
    def setUp(self):
        """Create test fixtures."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Enable tracking feature for the test tenant
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": True,
            },
        )
        
        # Create test user (technician)
        self.tech_user = User.objects.create_user(
            email="tech@test.com",
            password="Test@123456",
            username="tech_user",
            first_name="Tech",
            last_name="User",
        )
        
        # Create technician profile with tracking enabled
        self.technician = TechnicianProfile.objects.create(
            user=self.tech_user,
            phone="+55 11 99999-0001",
            skills=["HVAC"],
            work_start_time=time(8, 0),
            work_end_time=time(18, 0),
            is_active=True,
            allow_tracking=True,
        )
        
        # Create dispatcher user (non-technician)
        self.dispatcher_user = User.objects.create_user(
            email="dispatcher@test.com",
            password="Test@123456",
            username="dispatcher_user",
            first_name="Dispatcher",
            last_name="User",
        )


# =============================================================================
# Location Ping Tests
# =============================================================================


class LocationPingTests(BaseTrackingTestCase):
    """Tests for POST /api/trakservice/location/pings"""
    
    def test_submit_ping_success(self):
        """Technician can submit location ping within work window."""
        # Create timestamp within work window
        now = timezone.now()
        recorded_at = now.replace(hour=10, minute=30, second=0, microsecond=0)
        
        data = {
            "latitude": "-23.5505199",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": recorded_at.isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.tech_user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(
            Decimal(str(response.data["latitude"])),
            Decimal("-23.5505199")
        )
        
        # Verify ping was saved
        self.assertEqual(LocationPing.objects.count(), 1)
        ping = LocationPing.objects.first()
        self.assertEqual(ping.technician, self.technician)
        self.assertEqual(ping.device_id, "device-abc123")
    
    def test_submit_ping_outside_work_window_rejected(self):
        """Ping outside work window is rejected."""
        # Create timestamp outside work window (3 AM)
        now = timezone.now()
        recorded_at = now.replace(hour=3, minute=0, second=0, microsecond=0)
        
        data = {
            "latitude": "-23.5505199",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": recorded_at.isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.tech_user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("janela de trabalho", str(response.data).lower())
        
        # Verify no ping was saved
        self.assertEqual(LocationPing.objects.count(), 0)
    
    def test_submit_ping_tracking_disabled_rejected(self):
        """Ping rejected when technician has allow_tracking=False."""
        # Disable tracking for technician
        self.technician.allow_tracking = False
        self.technician.save()
        
        now = timezone.now()
        recorded_at = now.replace(hour=10, minute=30, second=0, microsecond=0)
        
        data = {
            "latitude": "-23.5505199",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": recorded_at.isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.tech_user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rastreamento", str(response.data).lower())
    
    def test_submit_ping_non_technician_rejected(self):
        """Non-technician user cannot submit pings."""
        now = timezone.now()
        recorded_at = now.replace(hour=10, minute=30, second=0, microsecond=0)
        
        data = {
            "latitude": "-23.5505199",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": recorded_at.isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("perfil de técnico", str(response.data).lower())
    
    def test_submit_ping_invalid_coordinates_rejected(self):
        """Invalid coordinates are rejected."""
        now = timezone.now()
        recorded_at = now.replace(hour=10, minute=30, second=0, microsecond=0)
        
        # Invalid latitude (> 90)
        data = {
            "latitude": "100.0",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": recorded_at.isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.tech_user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("latitude", response.data)


# =============================================================================
# Latest Location Tests
# =============================================================================


class LatestLocationTests(BaseTrackingTestCase):
    """Tests for GET /api/trakservice/technicians/{id}/location/latest"""
    
    def setUp(self):
        super().setUp()
        
        # Create some pings
        now = timezone.now()
        
        self.old_ping = LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-23.5500000"),
            longitude=Decimal("-46.6300000"),
            accuracy=15.0,
            source="gps",
            device_id="device-abc123",
            recorded_at=now - timedelta(hours=1),
        )
        
        self.latest_ping = LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-23.5505199"),
            longitude=Decimal("-46.6333094"),
            accuracy=10.5,
            source="gps",
            device_id="device-abc123",
            recorded_at=now - timedelta(minutes=2),
        )
    
    def test_get_latest_location_success(self):
        """Get latest location for technician."""
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/latest/"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Decimal(str(response.data["latitude"])),
            Decimal("-23.5505199")
        )
        self.assertFalse(response.data["is_stale"])
        self.assertLess(response.data["minutes_ago"], 5)
    
    def test_get_latest_location_stale(self):
        """Latest location is marked as stale if older than 5 minutes."""
        # Make the latest ping old
        self.latest_ping.recorded_at = timezone.now() - timedelta(minutes=10)
        self.latest_ping.save()
        
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/latest/"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_stale"])
        self.assertGreaterEqual(response.data["minutes_ago"], 10)
    
    def test_get_latest_location_not_found(self):
        """404 if technician has no pings."""
        # Create technician without pings
        new_user = User.objects.create_user(
            email="new_tech@test.com",
            password="Test@123456",
            username="new_tech",
        )
        new_technician = TechnicianProfile.objects.create(
            user=new_user,
            phone="+55 11 99999-0002",
        )
        
        request = self.factory.get(
            f"/api/trakservice/technicians/{new_technician.id}/location/latest/"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=new_technician.id)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_latest_location_invalid_technician(self):
        """404 if technician doesn't exist."""
        import uuid
        fake_id = uuid.uuid4()
        
        request = self.factory.get(
            f"/api/trakservice/technicians/{fake_id}/location/latest/"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=fake_id)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# =============================================================================
# Location Trail Tests
# =============================================================================


class LocationTrailTests(BaseTrackingTestCase):
    """Tests for GET /api/trakservice/technicians/{id}/location?from=...&to=..."""
    
    def setUp(self):
        super().setUp()
        
        # Create pings over several hours
        now = timezone.now()
        base_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
        
        for i in range(5):
            LocationPing.objects.create(
                technician=self.technician,
                latitude=Decimal(f"-23.550{i}000"),
                longitude=Decimal(f"-46.633{i}000"),
                accuracy=10.0,
                source="gps",
                device_id="device-abc123",
                recorded_at=base_time + timedelta(hours=i),
            )
    
    def test_get_trail_success(self):
        """Get location trail within time range."""
        now = timezone.now()
        from_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        to_date = now.replace(hour=23, minute=59, second=59, microsecond=0)
        
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/",
            {"from": from_date.isoformat(), "to": to_date.isoformat()}
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_pings"], 5)
        self.assertEqual(len(response.data["pings"]), 5)
    
    def test_get_trail_max_24h_limit(self):
        """Trail request limited to 24 hours."""
        now = timezone.now()
        from_date = now - timedelta(days=2)
        to_date = now
        
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/",
            {"from": from_date.isoformat(), "to": to_date.isoformat()}
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("24 horas", str(response.data))
    
    def test_get_trail_invalid_date_format(self):
        """Invalid date format returns 400."""
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/",
            {"from": "invalid-date", "to": "also-invalid"}
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Feature Gating Tests
# =============================================================================


class TrackingFeatureGatingTests(TenantTestCase):
    """Tests for feature gating on tracking endpoints."""
    
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Configure tenant WITHOUT tracking feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": False,  # Tracking disabled
            },
        )
        
        self.user = User.objects.create_user(
            email="user@test.com",
            password="Test@123456",
            username="test_user",
        )
        
        self.technician = TechnicianProfile.objects.create(
            user=self.user,
            phone="+55 11 99999-0001",
            allow_tracking=True,
        )
    
    def test_ping_blocked_without_tracking_feature(self):
        """POST /location/pings blocked when tracking feature disabled."""
        now = timezone.now()
        data = {
            "latitude": "-23.5505199",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": now.replace(hour=10).isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        # Should return 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_latest_location_blocked_without_tracking_feature(self):
        """GET /technicians/{id}/location/latest blocked when tracking disabled."""
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/latest/"
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        # Should return 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_trail_blocked_without_tracking_feature(self):
        """GET /technicians/{id}/location?from=...&to=... blocked when disabled."""
        now = timezone.now()
        from_date = now - timedelta(hours=12)
        
        request = self.factory.get(
            f"/api/trakservice/technicians/{self.technician.id}/location/",
            {"from": from_date.isoformat(), "to": now.isoformat()}
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        
        view = TechnicianLocationView.as_view()
        response = view(request, technician_id=self.technician.id)
        
        # Should return 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TrakServiceDisabledTests(TenantTestCase):
    """Tests when base trakservice.enabled is False."""
    
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Configure tenant without TrakService enabled
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": False,
            },
        )
        
        self.user = User.objects.create_user(
            email="user@test.com",
            password="Test@123456",
            username="test_user",
        )
    
    def test_tracking_blocked_when_trakservice_disabled(self):
        """All tracking endpoints blocked when base module disabled."""
        now = timezone.now()
        data = {
            "latitude": "-23.5505199",
            "longitude": "-46.6333094",
            "accuracy": 10.5,
            "source": "gps",
            "device_id": "device-abc123",
            "recorded_at": now.isoformat(),
        }
        
        request = self.factory.post(
            "/api/trakservice/location/pings/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        
        view = LocationPingView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
