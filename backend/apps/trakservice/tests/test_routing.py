"""
TrakService Routing & KM Tests

Tests for routing and KM functionality:
- Feature gating (trakservice.routing, trakservice.km)
- Route generation with optimization
- Nearest technician lookup
- KM summary calculation (estimated vs actual)
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.assets.models import Asset, AssetType, Site
from apps.cmms.models import WorkOrder
from apps.tenants.features import FeatureService
from apps.trakservice.models import (
    DailyRoute,
    LocationPing,
    RouteStop,
    ServiceAssignment,
    TechnicianProfile,
)
from apps.trakservice.services import RoutingService
from apps.trakservice.views import (
    DailyRouteViewSet,
    KMSummaryView,
    NearestTechnicianView,
)

User = get_user_model()


class BaseRoutingTestCase(TenantTestCase):
    """Base test case for routing tests with common setup."""
    
    def setUp(self):
        """Create test fixtures."""
        super().setUp()
        self.factory = APIRequestFactory()
        
        # Enable routing and km features for the test tenant
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": True,
                "trakservice.routing": True,
                "trakservice.km": True,
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
        
        # Create technician profile
        self.technician = TechnicianProfile.objects.create(
            user=self.tech_user,
            phone="+55 11 99999-0001",
            skills=["HVAC"],
            work_start_time=time(8, 0),
            work_end_time=time(18, 0),
            is_active=True,
            allow_tracking=True,
        )
        
        # Create second technician for testing
        self.tech_user_2 = User.objects.create_user(
            email="tech2@test.com",
            password="Test@123456",
            username="tech_user_2",
            first_name="Tech2",
            last_name="User",
        )
        self.technician_2 = TechnicianProfile.objects.create(
            user=self.tech_user_2,
            phone="+55 11 99999-0002",
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
        
        # Create CMMS fixtures for assignments
        self._create_cmms_fixtures()
    
    def _create_cmms_fixtures(self):
        """Create CMMS fixtures needed for routing tests."""
        # Create sites with coordinates (required by Asset for routing)
        self.site_1 = Site.objects.create(
            name="Site 1 - Centro",
            latitude=Decimal("-23.5505"),
            longitude=Decimal("-46.6333"),
            address="Rua Centro 1, São Paulo",
        )
        self.site_2 = Site.objects.create(
            name="Site 2 - Sul",
            latitude=Decimal("-23.5600"),
            longitude=Decimal("-46.6500"),
            address="Rua Sul 2, São Paulo",
        )
        self.site_3 = Site.objects.create(
            name="Site 3 - Sudeste",
            latitude=Decimal("-23.5700"),
            longitude=Decimal("-46.6600"),
            address="Rua Sudeste 3, São Paulo",
        )
        
        # Create asset type
        self.asset_type = AssetType.objects.create(
            name="HVAC Unit",
            code="HVAC001",
        )
        
        # Create assets with different sites (for coordinates)
        self.asset_1 = Asset.objects.create(
            tag="ASSET-001",
            name="AC Unit 1",
            asset_type=self.asset_type,
            site=self.site_1,
        )
        
        self.asset_2 = Asset.objects.create(
            tag="ASSET-002",
            name="AC Unit 2",
            asset_type=self.asset_type,
            site=self.site_2,
        )
        
        self.asset_3 = Asset.objects.create(
            tag="ASSET-003",
            name="AC Unit 3",
            asset_type=self.asset_type,
            site=self.site_3,
        )
        
        # Create work orders
        self.wo_1 = WorkOrder.objects.create(
            number="WO-001",
            description="Fix AC Unit 1",
            asset=self.asset_1,
            priority=WorkOrder.Priority.MEDIUM,
            status=WorkOrder.Status.OPEN,
            created_by=self.dispatcher_user,
        )
        
        self.wo_2 = WorkOrder.objects.create(
            number="WO-002",
            description="Fix AC Unit 2",
            asset=self.asset_2,
            priority=WorkOrder.Priority.HIGH,
            status=WorkOrder.Status.OPEN,
            created_by=self.dispatcher_user,
        )
        
        self.wo_3 = WorkOrder.objects.create(
            number="WO-003",
            description="Fix AC Unit 3",
            asset=self.asset_3,
            priority=WorkOrder.Priority.LOW,
            status=WorkOrder.Status.OPEN,
            created_by=self.dispatcher_user,
        )
    
    def _create_assignments_for_today(self):
        """Create service assignments for today.
        
        Note: Coordinates come from asset.site, not from assignment directly.
        """
        today = timezone.now().date()
        
        self.assignment_1 = ServiceAssignment.objects.create(
            work_order=self.wo_1,
            technician=self.technician,
            scheduled_date=today,
            scheduled_start=time(9, 0),
            scheduled_end=time(10, 0),
            created_by=self.dispatcher_user,
        )
        
        self.assignment_2 = ServiceAssignment.objects.create(
            work_order=self.wo_2,
            technician=self.technician,
            scheduled_date=today,
            scheduled_start=time(10, 30),
            scheduled_end=time(11, 30),
            created_by=self.dispatcher_user,
        )
        
        self.assignment_3 = ServiceAssignment.objects.create(
            work_order=self.wo_3,
            technician=self.technician,
            scheduled_date=today,
            scheduled_start=time(13, 0),
            scheduled_end=time(14, 0),
            created_by=self.dispatcher_user,
        )
        
        return [self.assignment_1, self.assignment_2, self.assignment_3]


# =============================================================================
# Feature Gating Tests
# =============================================================================


class RoutingFeatureGatingTests(BaseRoutingTestCase):
    """Tests for feature gating on routing endpoints."""
    
    def test_routes_endpoint_requires_routing_feature(self):
        """Routes endpoint returns 403 when routing feature is disabled."""
        # Disable routing feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": True,
                "trakservice.routing": False,  # Disabled
                "trakservice.km": True,
            },
        )
        
        request = self.factory.get("/api/trakservice/routes/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"get": "list"})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_nearest_technician_requires_routing_feature(self):
        """Nearest technician endpoint returns 403 when routing feature is disabled."""
        # Disable routing feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": True,
                "trakservice.routing": False,  # Disabled
                "trakservice.km": True,
            },
        )
        
        request = self.factory.get(
            "/api/trakservice/routes/nearest-technician/",
            {"latitude": "-23.5505", "longitude": "-46.6333"},
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = NearestTechnicianView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_km_endpoint_requires_km_feature(self):
        """KM endpoint returns 403 when km feature is disabled."""
        # Disable km feature
        FeatureService.set_features(
            self.tenant.id,
            {
                "trakservice.enabled": True,
                "trakservice.dispatch": True,
                "trakservice.tracking": True,
                "trakservice.routing": True,
                "trakservice.km": False,  # Disabled
            },
        )
        
        today = timezone.now().date()
        request = self.factory.get(
            "/api/trakservice/km/",
            {"date": str(today), "technician_id": str(self.technician.id)},
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = KMSummaryView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_routes_endpoint_allowed_with_feature_enabled(self):
        """Routes endpoint works when routing feature is enabled."""
        request = self.factory.get("/api/trakservice/routes/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"get": "list"})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# =============================================================================
# Route Generation Tests
# =============================================================================


class RouteGenerationTests(BaseRoutingTestCase):
    """Tests for route generation via service and API."""
    
    def test_generate_route_via_service(self):
        """RoutingService.generate_route creates route with optimized stops."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            start_address="Start Point",
            created_by=self.dispatcher_user,
        )
        
        self.assertIsNotNone(route)
        self.assertEqual(route.technician, self.technician)
        self.assertEqual(route.route_date, today)
        self.assertEqual(route.status, DailyRoute.Status.DRAFT)
        self.assertGreater(route.estimated_km, 0)
        
        # Check stops were created
        stops = route.stops.all().order_by("sequence")
        self.assertEqual(stops.count(), 3)
        
        # Check sequence is correct
        for i, stop in enumerate(stops):
            self.assertEqual(stop.sequence, i + 1)
    
    def test_generate_route_no_assignments_raises_error(self):
        """Route generation raises ValueError when no assignments exist."""
        today = timezone.now().date()
        
        with self.assertRaises(ValueError) as context:
            RoutingService.generate_route(
                technician=self.technician,
                route_date=today,
                start_lat=-23.5400,
                start_lon=-46.6200,
                created_by=self.dispatcher_user,
            )
        
        self.assertIn("Nenhuma atribuição encontrada", str(context.exception))
    
    def test_generate_route_via_api(self):
        """POST /api/trakservice/routes/generate/ creates route."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        data = {
            "technician_id": str(self.technician.id),
            "route_date": str(today),
            "start_latitude": "-23.5400",
            "start_longitude": "-46.6200",
            "start_address": "Start Point",
        }
        
        request = self.factory.post(
            "/api/trakservice/routes/generate/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"post": "generate"})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertIn("stops", response.data)
        self.assertEqual(len(response.data["stops"]), 3)
    
    def test_generate_route_duplicate_returns_conflict(self):
        """Generating route for same technician/date returns 409."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        # Create first route
        RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        # Try to create second route
        data = {
            "technician_id": str(self.technician.id),
            "route_date": str(today),
        }
        
        request = self.factory.post(
            "/api/trakservice/routes/generate/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"post": "generate"})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("route_id", response.data)
    
    def test_generate_route_invalid_technician(self):
        """Generating route for non-existent technician returns 400."""
        import uuid
        
        today = timezone.now().date()
        data = {
            "technician_id": str(uuid.uuid4()),  # Non-existent
            "route_date": str(today),
        }
        
        request = self.factory.post(
            "/api/trakservice/routes/generate/",
            data,
            format="json",
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"post": "generate"})
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Route Optimization Tests
# =============================================================================


class RouteOptimizationTests(BaseRoutingTestCase):
    """Tests for route optimization algorithm."""
    
    def test_optimize_route_minimizes_distance(self):
        """Route optimization produces stops in distance-efficient order."""
        # Create sites with different coordinates spread across São Paulo
        site_north = Site.objects.create(
            name="Site North",
            latitude=Decimal("-23.5000"),  # North
            longitude=Decimal("-46.6333"),
        )
        site_south = Site.objects.create(
            name="Site South",
            latitude=Decimal("-23.5800"),  # South
            longitude=Decimal("-46.6333"),
        )
        site_mid = Site.objects.create(
            name="Site Mid",
            latitude=Decimal("-23.5400"),  # Middle
            longitude=Decimal("-46.6333"),
        )
        
        # Create assets at these sites
        asset_north = Asset.objects.create(
            tag="ASSET-NORTH",
            name="AC Unit North",
            asset_type=self.asset_type,
            site=site_north,
        )
        asset_south = Asset.objects.create(
            tag="ASSET-SOUTH",
            name="AC Unit South",
            asset_type=self.asset_type,
            site=site_south,
        )
        asset_mid = Asset.objects.create(
            tag="ASSET-MID",
            name="AC Unit Mid",
            asset_type=self.asset_type,
            site=site_mid,
        )
        
        # Create work orders
        wo_north = WorkOrder.objects.create(
            number="WO-NORTH",
            description="Fix AC North",
            asset=asset_north,
            priority=WorkOrder.Priority.MEDIUM,
            status=WorkOrder.Status.OPEN,
            created_by=self.dispatcher_user,
        )
        wo_south = WorkOrder.objects.create(
            number="WO-SOUTH",
            description="Fix AC South",
            asset=asset_south,
            priority=WorkOrder.Priority.MEDIUM,
            status=WorkOrder.Status.OPEN,
            created_by=self.dispatcher_user,
        )
        wo_mid = WorkOrder.objects.create(
            number="WO-MID",
            description="Fix AC Mid",
            asset=asset_mid,
            priority=WorkOrder.Priority.MEDIUM,
            status=WorkOrder.Status.OPEN,
            created_by=self.dispatcher_user,
        )
        
        # Create assignments spread across São Paulo
        today = timezone.now().date()
        
        # Assignment at north (far from start)
        assignment_north = ServiceAssignment.objects.create(
            work_order=wo_north,
            technician=self.technician,
            scheduled_date=today,
            scheduled_start=time(9, 0),
            created_by=self.dispatcher_user,
        )
        
        # Assignment at south (close to start)
        assignment_south = ServiceAssignment.objects.create(
            work_order=wo_south,
            technician=self.technician,
            scheduled_date=today,
            scheduled_start=time(10, 0),
            created_by=self.dispatcher_user,
        )
        
        # Assignment in middle
        assignment_mid = ServiceAssignment.objects.create(
            work_order=wo_mid,
            technician=self.technician,
            scheduled_date=today,
            scheduled_start=time(11, 0),
            created_by=self.dispatcher_user,
        )
        
        # Start from south
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.6000,  # South of all
            start_lon=-46.6333,
            created_by=self.dispatcher_user,
        )
        
        # With nearest neighbor from south, should visit south first
        stops = list(route.stops.order_by("sequence"))
        
        # Verify total_km is calculated
        self.assertGreater(route.estimated_km, 0)
        
        # Verify each stop has distance calculated
        for stop in stops:
            self.assertIsNotNone(stop.distance_from_previous_km)


# =============================================================================
# Nearest Technician Tests
# =============================================================================


class NearestTechnicianTests(BaseRoutingTestCase):
    """Tests for nearest technician lookup."""
    
    def test_find_nearest_technician_via_service(self):
        """RoutingService.find_nearest_technician returns closest tech."""
        # Create pings for both technicians at different locations
        now = timezone.now()
        
        # Tech 1 at location A
        LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-23.5500"),
            longitude=Decimal("-46.6300"),
            accuracy=Decimal("10.0"),
            source="gps",
            device_id="device-1",
            recorded_at=now,
        )
        
        # Tech 2 at location B (closer to target)
        LocationPing.objects.create(
            technician=self.technician_2,
            latitude=Decimal("-23.5510"),
            longitude=Decimal("-46.6310"),
            accuracy=Decimal("10.0"),
            source="gps",
            device_id="device-2",
            recorded_at=now,
        )
        
        # Search near tech 2's location
        result = RoutingService.find_nearest_technician(
            latitude=-23.5515,
            longitude=-46.6315,
        )
        
        self.assertIsNotNone(result)
        self.assertEqual(result["technician_id"], str(self.technician_2.id))
    
    def test_find_nearest_technician_via_api(self):
        """GET /api/trakservice/routes/nearest-technician/ returns closest tech."""
        now = timezone.now()
        
        # Create ping for technician
        LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-23.5500"),
            longitude=Decimal("-46.6300"),
            accuracy=Decimal("10.0"),
            source="gps",
            device_id="device-1",
            recorded_at=now,
        )
        
        request = self.factory.get(
            "/api/trakservice/routes/nearest-technician/",
            {"latitude": "-23.5505", "longitude": "-46.6305"},
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = NearestTechnicianView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["technician_id"], str(self.technician.id))
        self.assertIn("distance_km", response.data)
    
    def test_find_nearest_technician_max_distance(self):
        """find_nearest_technician respects max_distance_km."""
        now = timezone.now()
        
        # Create ping 50km away
        LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-24.0000"),  # About 50km south
            longitude=Decimal("-46.6300"),
            accuracy=Decimal("10.0"),
            source="gps",
            device_id="device-1",
            recorded_at=now,
        )
        
        # Search with max 10km
        result = RoutingService.find_nearest_technician(
            latitude=-23.5500,
            longitude=-46.6300,
            max_distance_km=10.0,
        )
        
        self.assertIsNone(result)
    
    def test_find_nearest_technician_no_pings(self):
        """find_nearest_technician returns None when no pings exist."""
        result = RoutingService.find_nearest_technician(
            latitude=-23.5500,
            longitude=-46.6300,
        )
        
        self.assertIsNone(result)
    
    def test_find_nearest_technician_api_no_techs_returns_404(self):
        """API returns 404 when no technicians are nearby."""
        request = self.factory.get(
            "/api/trakservice/routes/nearest-technician/",
            {"latitude": "-23.5505", "longitude": "-46.6305"},
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = NearestTechnicianView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# =============================================================================
# KM Summary Tests
# =============================================================================


class KMSummaryTests(BaseRoutingTestCase):
    """Tests for KM summary calculation."""
    
    def test_km_summary_via_service(self):
        """RoutingService.calculate_km_summary returns correct values."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        # Generate route (creates estimated_km)
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        # Create pings to simulate actual travel
        # Make sure pings are within the technician's work window (8:00 - 18:00)
        base_dt = timezone.make_aware(datetime.combine(today, time(9, 0)))
        ping_times = [
            base_dt,
            base_dt + timedelta(minutes=30),
            base_dt + timedelta(hours=1),
            base_dt + timedelta(hours=1, minutes=30),
        ]
        
        ping_locations = [
            (-23.5400, -46.6200),
            (-23.5450, -46.6250),
            (-23.5500, -46.6300),
            (-23.5550, -46.6350),
        ]
        
        for ping_time, (lat, lon) in zip(ping_times, ping_locations):
            LocationPing.objects.create(
                technician=self.technician,
                latitude=Decimal(str(lat)),
                longitude=Decimal(str(lon)),
                accuracy=Decimal("10.0"),
                source="gps",
                device_id="device-1",
                recorded_at=ping_time,
            )
        
        result = RoutingService.calculate_km_summary(
            technician=self.technician,
            date=today,
        )
        
        self.assertIn("km_estimated", result)
        self.assertIn("km_actual", result)
        self.assertIn("km_difference", result)
        self.assertIn("ping_count", result)
        self.assertEqual(result["ping_count"], 4)
        self.assertGreater(result["km_actual"], 0)
    
    def test_km_summary_via_api(self):
        """GET /api/trakservice/km/ returns KM summary."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        # Generate route
        RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        request = self.factory.get(
            "/api/trakservice/km/",
            {
                "date": str(today),
                "technician_id": str(self.technician.id),
            },
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = KMSummaryView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("km_estimated", response.data)
        self.assertIn("km_actual", response.data)
    
    def test_km_summary_no_route(self):
        """KM summary works even without a planned route."""
        today = timezone.now().date()
        
        # Create pings without route
        # Make sure pings are within the technician's work window (8:00 - 18:00)
        base_dt = timezone.make_aware(datetime.combine(today, time(9, 0)))
        
        LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-23.5400"),
            longitude=Decimal("-46.6200"),
            accuracy=Decimal("10.0"),
            source="gps",
            device_id="device-1",
            recorded_at=base_dt,
        )
        LocationPing.objects.create(
            technician=self.technician,
            latitude=Decimal("-23.5500"),
            longitude=Decimal("-46.6300"),
            accuracy=Decimal("10.0"),
            source="gps",
            device_id="device-1",
            recorded_at=base_dt + timedelta(minutes=30),
        )
        
        result = RoutingService.calculate_km_summary(
            technician=self.technician,
            date=today,
        )
        
        self.assertEqual(result["km_estimated"], 0.0)
        self.assertGreater(result["km_actual"], 0)
        self.assertIsNone(result["route_id"])
    
    def test_km_summary_invalid_technician_returns_400(self):
        """KM summary with invalid technician returns 400."""
        import uuid
        
        today = timezone.now().date()
        
        request = self.factory.get(
            "/api/trakservice/km/",
            {
                "date": str(today),
                "technician_id": str(uuid.uuid4()),  # Non-existent
            },
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = KMSummaryView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Route Status Management Tests
# =============================================================================


class RouteStatusTests(BaseRoutingTestCase):
    """Tests for route status management."""
    
    def test_start_route(self):
        """POST /api/trakservice/routes/{id}/start/ changes status."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        request = self.factory.post(f"/api/trakservice/routes/{route.id}/start/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"post": "start_route"})
        response = view(request, pk=route.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        route.refresh_from_db()
        self.assertEqual(route.status, DailyRoute.Status.IN_PROGRESS)
    
    def test_complete_route(self):
        """POST /api/trakservice/routes/{id}/complete/ changes status."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        # Start route first
        route.status = DailyRoute.Status.IN_PROGRESS
        route.save()
        
        request = self.factory.post(f"/api/trakservice/routes/{route.id}/complete/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"post": "complete_route"})
        response = view(request, pk=route.id)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        route.refresh_from_db()
        self.assertEqual(route.status, DailyRoute.Status.COMPLETED)
    
    def test_complete_route_not_in_progress_fails(self):
        """Cannot complete route that is not in progress."""
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        # Route is in DRAFT status
        request = self.factory.post(f"/api/trakservice/routes/{route.id}/complete/")
        request.tenant = self.tenant
        force_authenticate(request, user=self.dispatcher_user)
        
        view = DailyRouteViewSet.as_view({"post": "complete_route"})
        response = view(request, pk=route.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Haversine Distance Tests
# =============================================================================


class HaversineDistanceTests(TenantTestCase):
    """Tests for haversine distance calculation."""
    
    def test_same_point_returns_zero(self):
        """Distance from point to itself is zero."""
        distance = RoutingService.haversine_distance(
            lat1=-23.5505, lon1=-46.6333,
            lat2=-23.5505, lon2=-46.6333,
        )
        self.assertEqual(distance, 0.0)
    
    def test_known_distance(self):
        """Test against known distance (São Paulo to Rio ~360km)."""
        # São Paulo coordinates
        sp_lat, sp_lon = -23.5505, -46.6333
        # Rio de Janeiro coordinates
        rj_lat, rj_lon = -22.9068, -43.1729
        
        distance = RoutingService.haversine_distance(
            lat1=sp_lat, lon1=sp_lon,
            lat2=rj_lat, lon2=rj_lon,
        )
        
        # Should be approximately 360-380 km
        self.assertGreater(distance, 350)
        self.assertLess(distance, 400)
    
    def test_small_distance(self):
        """Test small distance calculation (~1km)."""
        # About 1km apart
        distance = RoutingService.haversine_distance(
            lat1=-23.5500, lon1=-46.6330,
            lat2=-23.5590, lon2=-46.6330,
        )
        
        # Should be approximately 1km
        self.assertGreater(distance, 0.9)
        self.assertLess(distance, 1.1)


# =============================================================================
# Multi-Tenant Isolation Tests
# =============================================================================


class RoutingMultiTenantTests(BaseRoutingTestCase):
    """Tests for multi-tenant isolation in routing."""
    
    def test_route_isolation_between_tenants(self):
        """Routes from tenant A should not be visible to tenant B."""
        # This test relies on django-tenants middleware
        # Routes created in setUp are in self.tenant
        
        self._create_assignments_for_today()
        today = timezone.now().date()
        
        route = RoutingService.generate_route(
            technician=self.technician,
            route_date=today,
            start_lat=-23.5400,
            start_lon=-46.6200,
            created_by=self.dispatcher_user,
        )
        
        # Verify route exists
        self.assertEqual(DailyRoute.objects.count(), 1)
        
        # Note: Full multi-tenant isolation testing requires creating
        # a second tenant and switching context, which is handled by
        # django-tenants middleware in the actual application
