"""
TrakService Views

API endpoints for TrakService module.
All endpoints are protected by TrakServiceFeatureRequired permission.
"""

import logging
from datetime import datetime, timedelta

from django.db import models
from django.db.models import Q
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.permissions import TrakServiceFeatureRequired

from .models import DailyRoute, LocationPing, Quote, QuoteItem, RouteStop, ServiceAssignment, ServiceCatalogItem, TechnicianProfile
from .serializers import (
    DailyRouteListSerializer,
    DailyRouteSerializer,
    KMSummaryRequestSerializer,
    KMSummarySerializer,
    LatestLocationSerializer,
    LocationPingCreateSerializer,
    LocationPingSerializer,
    LocationTrailSerializer,
    NearestTechnicianRequestSerializer,
    NearestTechnicianSerializer,
    QuoteApproveSerializer,
    QuoteCreateSerializer,
    QuoteItemCreateSerializer,
    QuoteItemSerializer,
    QuoteListSerializer,
    QuoteRejectSerializer,
    QuoteSendSerializer,
    QuoteSerializer,
    QuoteUpdateSerializer,
    RouteGenerateSerializer,
    RouteStopSerializer,
    ServiceAssignmentCreateSerializer,
    ServiceAssignmentSerializer,
    ServiceAssignmentStatusSerializer,
    ServiceAssignmentUpdateSerializer,
    ServiceCatalogItemCreateSerializer,
    ServiceCatalogItemListSerializer,
    ServiceCatalogItemSerializer,
    TechnicianProfileCreateSerializer,
    TechnicianProfileListSerializer,
    TechnicianProfileSerializer,
    TrakServiceHealthSerializer,
    TrakServiceMetaSerializer,
)
from .services import RoutingService, TrakServiceMetaService

logger = logging.getLogger(__name__)


# =============================================================================
# Meta & Health Views (existing)
# =============================================================================


class TrakServiceMetaView(APIView):
    """
    TrakService module metadata endpoint.

    Returns module information, version, and enabled features.
    Protected by TrakService feature gate.

    GET /api/trakservice/_meta/
    """

    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = []  # Only requires base trakservice.enabled

    def get(self, request):
        """Get TrakService module metadata."""
        data = TrakServiceMetaService.get_meta()
        serializer = TrakServiceMetaSerializer(data)
        return Response(serializer.data)


class TrakServiceHealthView(APIView):
    """
    TrakService health check endpoint.

    Returns current health status and enabled features.
    Protected by TrakService feature gate.

    GET /api/trakservice/_health/
    """

    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = []  # Only requires base trakservice.enabled

    def get(self, request):
        """Get TrakService health status."""
        data = TrakServiceMetaService.get_health()
        serializer = TrakServiceHealthSerializer(data)
        return Response(serializer.data)


# =============================================================================
# Filters
# =============================================================================


class ServiceAssignmentFilter(filters.FilterSet):
    """Filter for ServiceAssignment queryset."""
    
    # Date filters
    date = filters.DateFilter(field_name="scheduled_date")
    date_from = filters.DateFilter(field_name="scheduled_date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="scheduled_date", lookup_expr="lte")
    
    # Related filters
    technician_id = filters.UUIDFilter(field_name="technician__id")
    work_order_id = filters.NumberFilter(field_name="work_order__id")
    
    # Status filter (multiple values)
    status = filters.MultipleChoiceFilter(
        choices=ServiceAssignment.Status.choices,
    )
    
    # Search
    search = filters.CharFilter(method="filter_search")
    
    class Meta:
        model = ServiceAssignment
        fields = ["date", "date_from", "date_to", "technician_id", "work_order_id", "status"]
    
    def filter_search(self, queryset, name, value):
        """Search in work order number, description, and technician name."""
        return queryset.filter(
            Q(work_order__number__icontains=value) |
            Q(work_order__description__icontains=value) |
            Q(technician__user__first_name__icontains=value) |
            Q(technician__user__last_name__icontains=value) |
            Q(notes__icontains=value)
        )


class TechnicianProfileFilter(filters.FilterSet):
    """Filter for TechnicianProfile queryset."""
    
    is_active = filters.BooleanFilter()
    search = filters.CharFilter(method="filter_search")
    
    class Meta:
        model = TechnicianProfile
        fields = ["is_active"]
    
    def filter_search(self, queryset, name, value):
        """Search in user name and email."""
        return queryset.filter(
            Q(user__email__icontains=value) |
            Q(user__first_name__icontains=value) |
            Q(user__last_name__icontains=value)
        )


# =============================================================================
# ViewSets
# =============================================================================


class TechnicianProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing technician profiles.
    
    Requires: trakservice.enabled + trakservice.dispatch
    
    Endpoints:
    - GET /api/trakservice/technicians/ - List technicians
    - POST /api/trakservice/technicians/ - Create technician profile
    - GET /api/trakservice/technicians/{id}/ - Get technician detail
    - PUT/PATCH /api/trakservice/technicians/{id}/ - Update technician
    - DELETE /api/trakservice/technicians/{id}/ - Delete technician profile
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["dispatch"]
    filterset_class = TechnicianProfileFilter
    
    def get_queryset(self):
        return TechnicianProfile.objects.select_related("user").all()
    
    def get_serializer_class(self):
        if self.action == "list":
            return TechnicianProfileListSerializer
        elif self.action in ["create"]:
            return TechnicianProfileCreateSerializer
        return TechnicianProfileSerializer
    
    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get only active technicians (for dropdowns)."""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = TechnicianProfileListSerializer(queryset, many=True)
        return Response(serializer.data)


class ServiceAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing service assignments.
    
    Requires: trakservice.enabled + trakservice.dispatch
    
    Endpoints:
    - GET /api/trakservice/assignments/ - List assignments
    - POST /api/trakservice/assignments/ - Create assignment
    - GET /api/trakservice/assignments/{id}/ - Get assignment detail
    - PUT/PATCH /api/trakservice/assignments/{id}/ - Update assignment
    - DELETE /api/trakservice/assignments/{id}/ - Delete assignment
    - POST /api/trakservice/assignments/{id}/status/ - Change status
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["dispatch"]
    filterset_class = ServiceAssignmentFilter
    
    def get_queryset(self):
        return ServiceAssignment.objects.select_related(
            "work_order",
            "work_order__asset",
            "technician",
            "technician__user",
            "created_by",
        ).all()
    
    def get_serializer_class(self):
        if self.action == "create":
            return ServiceAssignmentCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return ServiceAssignmentUpdateSerializer
        elif self.action == "change_status":
            return ServiceAssignmentStatusSerializer
        return ServiceAssignmentSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new assignment and return full serialized data.
        
        Uses ServiceAssignmentCreateSerializer for input validation
        but returns ServiceAssignmentSerializer for full output.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Return with full serializer
        output_serializer = ServiceAssignmentSerializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
    
    @action(detail=True, methods=["post"], url_path="status")
    def change_status(self, request, pk=None):
        """
        Change the status of an assignment.
        
        POST /api/trakservice/assignments/{id}/status/
        Body: { "status": "en_route" | "on_site" | "done" | "canceled", "reason": "..." }
        """
        assignment = self.get_object()
        serializer = ServiceAssignmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("reason", "")
        
        # Apply status change
        if new_status == ServiceAssignment.Status.EN_ROUTE:
            assignment.set_en_route()
        elif new_status == ServiceAssignment.Status.ON_SITE:
            assignment.set_on_site()
        elif new_status == ServiceAssignment.Status.DONE:
            assignment.set_done()
        elif new_status == ServiceAssignment.Status.CANCELED:
            assignment.set_canceled(reason=reason)
        else:
            assignment.status = new_status
            assignment.save(update_fields=["status", "updated_at"])
        
        # Return updated assignment
        output_serializer = ServiceAssignmentSerializer(assignment)
        return Response(output_serializer.data)
    
    @action(detail=False, methods=["get"])
    def today(self, request):
        """Get assignments for today."""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(scheduled_date=today)
        queryset = self.filter_queryset(queryset)
        serializer = ServiceAssignmentSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def week(self, request):
        """Get assignments for the current week."""
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        queryset = self.get_queryset().filter(
            scheduled_date__gte=start_of_week,
            scheduled_date__lte=end_of_week,
        )
        queryset = self.filter_queryset(queryset)
        serializer = ServiceAssignmentSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"], url_path="by-technician/(?P<technician_id>[^/.]+)")
    def by_technician(self, request, technician_id=None):
        """Get assignments for a specific technician."""
        queryset = self.get_queryset().filter(technician_id=technician_id)
        queryset = self.filter_queryset(queryset)
        serializer = ServiceAssignmentSerializer(queryset, many=True)
        return Response(serializer.data)


# =============================================================================
# Tracking Views
# =============================================================================


class LocationPingView(APIView):
    """
    Endpoint for submitting GPS location pings from mobile devices.
    
    Requires: trakservice.enabled + trakservice.tracking
    
    POST /api/trakservice/location/pings
    
    Privacy constraints enforced:
    - Technician must have allow_tracking=True
    - Ping must be within technician's work window
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["tracking"]
    
    def post(self, request):
        """
        Submit a location ping.
        
        Body:
        {
            "latitude": -23.5505,
            "longitude": -46.6333,
            "accuracy": 10.5,
            "altitude": 760.0,       // optional
            "speed": 0.0,            // optional, m/s
            "heading": 180.0,        // optional, degrees
            "source": "gps",         // gps|network|fused|manual
            "device_id": "abc123",
            "recorded_at": "2026-01-08T10:30:00Z",
            "assignment": "uuid"     // optional, active assignment
        }
        """
        serializer = LocationPingCreateSerializer(
            data=request.data,
            context={"request": request}
        )
        
        if serializer.is_valid():
            ping = serializer.save()
            output = LocationPingSerializer(ping)
            return Response(output.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TechnicianLocationView(APIView):
    """
    Endpoints for retrieving technician location data.
    
    Requires: trakservice.enabled + trakservice.tracking
    
    GET /api/trakservice/technicians/{id}/location/latest - Latest location
    GET /api/trakservice/technicians/{id}/location?from=...&to=... - Trail
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["tracking"]
    
    def get(self, request, technician_id):
        """
        Get technician location data.
        
        If 'from' and 'to' params provided: returns trail
        Otherwise: returns latest location
        """
        # Verify technician exists
        try:
            technician = TechnicianProfile.objects.get(id=technician_id)
        except TechnicianProfile.DoesNotExist:
            return Response(
                {"detail": "Técnico não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if requesting trail or latest
        from_date = request.query_params.get("from")
        to_date = request.query_params.get("to")
        
        if from_date and to_date:
            return self._get_trail(technician, from_date, to_date)
        else:
            return self._get_latest(technician)
    
    def _get_latest(self, technician):
        """Get latest location for technician."""
        latest_ping = LocationPing.objects.filter(
            technician=technician
        ).order_by("-recorded_at").first()
        
        if not latest_ping:
            return Response(
                {"detail": "Nenhuma localização encontrada para este técnico."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate staleness
        now = timezone.now()
        time_diff = now - latest_ping.recorded_at
        minutes_ago = int(time_diff.total_seconds() / 60)
        is_stale = minutes_ago > 5  # Stale if older than 5 minutes
        
        data = {
            "technician_id": technician.id,
            "technician_name": technician.full_name,
            "latitude": latest_ping.latitude,
            "longitude": latest_ping.longitude,
            "accuracy": latest_ping.accuracy,
            "source": latest_ping.source,
            "recorded_at": latest_ping.recorded_at,
            "is_stale": is_stale,
            "minutes_ago": minutes_ago,
        }
        
        serializer = LatestLocationSerializer(data)
        return Response(serializer.data)
    
    def _get_trail(self, technician, from_date_str, to_date_str):
        """Get location trail for technician within date range."""
        from dateutil.parser import parse as parse_date
        
        try:
            from_date = parse_date(from_date_str)
            to_date = parse_date(to_date_str)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Formato de data inválido. Use ISO 8601 (ex: 2026-01-08T00:00:00Z)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit range to 24 hours max for performance
        if (to_date - from_date).total_seconds() > 86400:
            return Response(
                {"detail": "Intervalo máximo permitido é 24 horas."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pings = LocationPing.objects.filter(
            technician=technician,
            recorded_at__gte=from_date,
            recorded_at__lte=to_date,
        ).order_by("recorded_at")
        
        data = {
            "technician_id": technician.id,
            "technician_name": technician.full_name,
            "from_date": from_date,
            "to_date": to_date,
            "total_pings": pings.count(),
            "pings": LocationPingSerializer(pings, many=True).data,
        }
        
        serializer = LocationTrailSerializer(data)
        return Response(serializer.data)


# =============================================================================
# Routing & KM Views
# =============================================================================


class DailyRouteFilter(filters.FilterSet):
    """Filter for DailyRoute queryset."""
    
    date = filters.DateFilter(field_name="route_date")
    date_from = filters.DateFilter(field_name="route_date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="route_date", lookup_expr="lte")
    technician_id = filters.UUIDFilter(field_name="technician__id")
    status = filters.MultipleChoiceFilter(choices=DailyRoute.Status.choices)
    
    class Meta:
        model = DailyRoute
        fields = ["date", "date_from", "date_to", "technician_id", "status"]


class DailyRouteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing daily routes.
    
    Requires: trakservice.enabled + trakservice.routing
    
    Endpoints:
    - GET /api/trakservice/routes/ - List routes
    - GET /api/trakservice/routes/{id}/ - Get route detail
    - PUT/PATCH /api/trakservice/routes/{id}/ - Update route (status, actual_km)
    - DELETE /api/trakservice/routes/{id}/ - Delete route
    - POST /api/trakservice/routes/generate/ - Generate optimized route for technician
    - POST /api/trakservice/routes/{id}/start/ - Start route
    - POST /api/trakservice/routes/{id}/complete/ - Complete route
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["routing"]
    filterset_class = DailyRouteFilter
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]  # POST for actions
    
    def get_queryset(self):
        return DailyRoute.objects.select_related(
            "technician",
            "technician__user",
            "created_by",
        ).prefetch_related(
            "stops",
            "stops__assignment",
            "stops__assignment__work_order",
        ).order_by("-route_date", "technician__user__first_name")
    
    def get_serializer_class(self):
        if self.action == "list":
            return DailyRouteListSerializer
        elif self.action == "generate":
            return RouteGenerateSerializer
        return DailyRouteSerializer
    
    @action(detail=False, methods=["post"])
    def generate(self, request):
        """
        Generate an optimized route for a technician on a given date.
        
        POST /api/trakservice/routes/generate/
        Body:
        {
            "technician_id": "uuid",
            "route_date": "2026-01-08",
            "start_latitude": -23.5505,      // optional
            "start_longitude": -46.6333,     // optional
            "start_address": "Endereço"      // optional
        }
        
        Creates a DailyRoute with RouteStops in optimized order.
        """
        serializer = RouteGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        technician_id = data["technician_id"]
        route_date = data["route_date"]
        
        # Get technician
        try:
            technician = TechnicianProfile.objects.get(id=technician_id)
        except TechnicianProfile.DoesNotExist:
            return Response(
                {"detail": "Técnico não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if route already exists
        existing_route = DailyRoute.objects.filter(
            technician=technician,
            route_date=route_date,
        ).first()
        
        if existing_route:
            return Response(
                {
                    "detail": "Já existe uma rota para este técnico nesta data.",
                    "route_id": str(existing_route.id),
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Get start coordinates
        start_lat = data.get("start_latitude")
        start_lon = data.get("start_longitude")
        start_address = data.get("start_address", "")
        
        # Generate route using service
        try:
            route = RoutingService.generate_route(
                technician=technician,
                route_date=route_date,
                start_lat=float(start_lat) if start_lat else None,
                start_lon=float(start_lon) if start_lon else None,
                start_address=start_address,
                created_by=request.user,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if route is None:
            return Response(
                {"detail": "Nenhum atendimento encontrado para este técnico nesta data."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Reload with prefetch for proper serialization
        route = self.get_queryset().get(id=route.id)
        output_serializer = DailyRouteSerializer(route)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=["get"])
    def today(self, request):
        """Get routes for today."""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(route_date=today)
        queryset = self.filter_queryset(queryset)
        serializer = DailyRouteListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"], url_path="start")
    def start_route(self, request, pk=None):
        """
        Start a route (change status to in_progress).
        
        POST /api/trakservice/routes/{id}/start/
        """
        route = self.get_object()
        
        if route.status not in [DailyRoute.Status.DRAFT, DailyRoute.Status.CONFIRMED]:
            return Response(
                {"detail": f"Não é possível iniciar uma rota com status '{route.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        route.status = DailyRoute.Status.IN_PROGRESS
        route.save(update_fields=["status", "updated_at"])
        
        output_serializer = DailyRouteSerializer(route)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=["post"], url_path="complete")
    def complete_route(self, request, pk=None):
        """
        Complete a route (change status to completed).
        
        POST /api/trakservice/routes/{id}/complete/
        """
        route = self.get_object()
        
        if route.status != DailyRoute.Status.IN_PROGRESS:
            return Response(
                {"detail": f"Só é possível completar uma rota em progresso."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        route.status = DailyRoute.Status.COMPLETED
        route.save(update_fields=["status", "updated_at"])
        
        output_serializer = DailyRouteSerializer(route)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=["patch"], url_path="stops/(?P<stop_id>[^/.]+)")
    def update_stop(self, request, pk=None, stop_id=None):
        """
        Update a route stop (arrival/departure times).
        
        PATCH /api/trakservice/routes/{id}/stops/{stop_id}/
        Body: { "actual_arrival": "...", "actual_departure": "..." }
        """
        route = self.get_object()
        
        try:
            stop = route.stops.get(id=stop_id)
        except RouteStop.DoesNotExist:
            return Response(
                {"detail": "Parada não encontrada."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update allowed fields
        if "actual_arrival" in request.data:
            from dateutil.parser import parse as parse_date
            try:
                stop.actual_arrival = parse_date(request.data["actual_arrival"])
            except (ValueError, TypeError):
                return Response(
                    {"actual_arrival": "Formato de data inválido."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if "actual_departure" in request.data:
            from dateutil.parser import parse as parse_date
            try:
                stop.actual_departure = parse_date(request.data["actual_departure"])
            except (ValueError, TypeError):
                return Response(
                    {"actual_departure": "Formato de data inválido."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        stop.save(update_fields=["actual_arrival", "actual_departure", "updated_at"])
        
        output_serializer = RouteStopSerializer(stop)
        return Response(output_serializer.data)


class NearestTechnicianView(APIView):
    """
    Find the nearest technician to a given location.
    
    Requires: trakservice.enabled + trakservice.routing
    
    GET /api/trakservice/routes/nearest-technician?latitude=...&longitude=...&max_distance_km=...
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["routing"]
    
    def get(self, request):
        """
        Find nearest technician to given coordinates.
        
        Query params:
        - latitude (required): Reference latitude
        - longitude (required): Reference longitude  
        - max_distance_km (optional): Maximum search radius in km
        """
        serializer = NearestTechnicianRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        lat = data["latitude"]
        lon = data["longitude"]
        max_distance = data.get("max_distance_km")
        
        result = RoutingService.find_nearest_technician(
            latitude=lat,
            longitude=lon,
            max_distance_km=max_distance,
            only_active=True,
        )
        
        if result is None:
            return Response(
                {"detail": "Nenhum técnico encontrado nas proximidades."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        output_serializer = NearestTechnicianSerializer(result)
        return Response(output_serializer.data)


class KMSummaryView(APIView):
    """
    Get KM summary for a technician on a given date.
    
    Requires: trakservice.enabled + trakservice.km
    
    GET /api/trakservice/km?date=YYYY-MM-DD&technician_id=uuid
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["km"]
    
    def get(self, request):
        """
        Get KM summary comparing estimated vs actual.
        
        Query params:
        - date (required): Date to check (YYYY-MM-DD)
        - technician_id (required): Technician UUID
        """
        serializer = KMSummaryRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        date = data["date"]
        technician_id = data["technician_id"]
        
        # Get technician
        try:
            technician = TechnicianProfile.objects.get(id=technician_id)
        except TechnicianProfile.DoesNotExist:
            return Response(
                {"detail": "Técnico não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        result = RoutingService.calculate_km_summary(
            technician=technician,
            date=date,
        )
        
        output_serializer = KMSummarySerializer(result)
        return Response(output_serializer.data)


# =============================================================================
# Service Catalog Views
# =============================================================================


class ServiceCatalogFilter(filters.FilterSet):
    """Filter for ServiceCatalogItem queryset."""
    
    category = filters.CharFilter(lookup_expr="iexact")
    is_active = filters.BooleanFilter()
    search = filters.CharFilter(method="filter_search")
    min_price = filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    
    class Meta:
        model = ServiceCatalogItem
        fields = ["category", "is_active"]
    
    def filter_search(self, queryset, name, value):
        """Search in code, name, and description."""
        return queryset.filter(
            Q(code__icontains=value) |
            Q(name__icontains=value) |
            Q(description__icontains=value)
        )


class ServiceCatalogItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing service catalog items.
    
    Requires: trakservice.enabled + trakservice.quotes
    
    Endpoints:
    - GET /api/trakservice/catalog/ - List catalog items
    - POST /api/trakservice/catalog/ - Create catalog item
    - GET /api/trakservice/catalog/{id}/ - Get item detail
    - PUT/PATCH /api/trakservice/catalog/{id}/ - Update item
    - DELETE /api/trakservice/catalog/{id}/ - Delete item
    - GET /api/trakservice/catalog/active/ - Active items only
    - GET /api/trakservice/catalog/categories/ - List unique categories
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["quotes"]
    filterset_class = ServiceCatalogFilter
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    
    def get_queryset(self):
        return ServiceCatalogItem.objects.select_related("created_by").all()
    
    def get_serializer_class(self):
        if self.action == "list":
            return ServiceCatalogItemListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ServiceCatalogItemCreateSerializer
        return ServiceCatalogItemSerializer
    
    def perform_create(self, serializer):
        """Set created_by on creation."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get only active catalog items (for dropdowns)."""
        queryset = self.get_queryset().filter(is_active=True)
        queryset = self.filter_queryset(queryset)
        serializer = ServiceCatalogItemListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def categories(self, request):
        """Get list of unique categories."""
        categories = (
            ServiceCatalogItem.objects
            .filter(is_active=True)
            .exclude(category="")
            .values_list("category", flat=True)
            .distinct()
            .order_by("category")
        )
        return Response(list(categories))


# =============================================================================
# Quote Views
# =============================================================================


class QuoteFilter(filters.FilterSet):
    """Filter for Quote queryset."""
    
    status = filters.MultipleChoiceFilter(choices=Quote.Status.choices)
    work_order_id = filters.NumberFilter(field_name="work_order__id")
    work_order_number = filters.CharFilter(
        field_name="work_order__number",
        lookup_expr="icontains"
    )
    created_from = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    search = filters.CharFilter(method="filter_search")
    
    class Meta:
        model = Quote
        fields = ["status", "work_order_id"]
    
    def filter_search(self, queryset, name, value):
        """Search in quote number, work order number, and notes."""
        return queryset.filter(
            Q(number__icontains=value) |
            Q(work_order__number__icontains=value) |
            Q(notes__icontains=value) |
            Q(customer_notes__icontains=value)
        )


class QuoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quotes.
    
    Requires: trakservice.enabled + trakservice.quotes
    
    Endpoints:
    - GET /api/trakservice/quotes/ - List quotes
    - POST /api/trakservice/quotes/ - Create quote
    - GET /api/trakservice/quotes/{id}/ - Get quote detail
    - PUT/PATCH /api/trakservice/quotes/{id}/ - Update quote (draft only)
    - DELETE /api/trakservice/quotes/{id}/ - Delete quote (draft only)
    - POST /api/trakservice/quotes/{id}/send/ - Send quote
    - POST /api/trakservice/quotes/{id}/approve/ - Approve quote
    - POST /api/trakservice/quotes/{id}/reject/ - Reject quote
    - POST /api/trakservice/quotes/{id}/items/ - Add item
    - DELETE /api/trakservice/quotes/{id}/items/{item_id}/ - Remove item
    """
    
    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = ["quotes"]
    filterset_class = QuoteFilter
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    
    def get_queryset(self):
        return Quote.objects.select_related(
            "work_order",
            "created_by",
            "approved_by",
        ).prefetch_related("items").all()
    
    def get_serializer_class(self):
        if self.action == "list":
            return QuoteListSerializer
        elif self.action == "create":
            return QuoteCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return QuoteUpdateSerializer
        elif self.action == "send":
            return QuoteSendSerializer
        elif self.action == "approve":
            return QuoteApproveSerializer
        elif self.action == "reject":
            return QuoteRejectSerializer
        elif self.action == "add_item":
            return QuoteItemCreateSerializer
        return QuoteSerializer
    
    def perform_create(self, serializer):
        """Set created_by on creation."""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new quote and return full serialized data.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(created_by=request.user)
        
        # Return with full serializer
        output_serializer = QuoteSerializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def destroy(self, request, *args, **kwargs):
        """Only allow deletion of draft quotes."""
        instance = self.get_object()
        if instance.status != Quote.Status.DRAFT:
            return Response(
                {"detail": "Apenas orçamentos em rascunho podem ser excluídos."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """
        Send quote to customer.
        
        POST /api/trakservice/quotes/{id}/send/
        Body: { "notify_customer": true/false }
        """
        quote = self.get_object()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            quote.send()
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: If notify_customer, send email notification
        
        output_serializer = QuoteSerializer(quote)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Approve a quote.
        
        POST /api/trakservice/quotes/{id}/approve/
        Body: { "notes": "optional notes" }
        """
        quote = self.get_object()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            quote.approve(approved_by=request.user)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        output_serializer = QuoteSerializer(quote)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Reject a quote.
        
        POST /api/trakservice/quotes/{id}/reject/
        Body: { "reason": "optional rejection reason" }
        """
        quote = self.get_object()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data.get("reason", "")
        
        try:
            quote.reject(reason=reason)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        output_serializer = QuoteSerializer(quote)
        return Response(output_serializer.data)
    
    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):
        """
        Add an item to a quote.
        
        POST /api/trakservice/quotes/{id}/items/
        Body: QuoteItem data
        """
        quote = self.get_object()
        
        if quote.status != Quote.Status.DRAFT:
            return Response(
                {"detail": "Itens só podem ser adicionados a orçamentos em rascunho."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = QuoteItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        item = serializer.save(quote=quote)
        # Invalidate prefetch cache before recalculating
        if hasattr(quote, '_prefetched_objects_cache'):
            quote._prefetched_objects_cache.pop('items', None)
        quote.recalculate_totals()
        
        output_serializer = QuoteItemSerializer(item)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(
        detail=True,
        methods=["delete"],
        url_path="items/(?P<item_id>[^/.]+)"
    )
    def remove_item(self, request, pk=None, item_id=None):
        """
        Remove an item from a quote.
        
        DELETE /api/trakservice/quotes/{id}/items/{item_id}/
        """
        quote = self.get_object()
        
        if quote.status != Quote.Status.DRAFT:
            return Response(
                {"detail": "Itens só podem ser removidos de orçamentos em rascunho."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            item = quote.items.get(id=item_id)
            item.delete()
            # Invalidate prefetch cache before recalculating
            if hasattr(quote, '_prefetched_objects_cache'):
                quote._prefetched_objects_cache.pop('items', None)
            quote.recalculate_totals()
        except QuoteItem.DoesNotExist:
            return Response(
                {"detail": "Item não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Get quotes pending approval (status=sent)."""
        queryset = self.get_queryset().filter(status=Quote.Status.SENT)
        queryset = self.filter_queryset(queryset)
        serializer = QuoteListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"], url_path="by-work-order/(?P<work_order_id>[^/.]+)")
    def by_work_order(self, request, work_order_id=None):
        """Get quotes for a specific work order."""
        queryset = self.get_queryset().filter(work_order_id=work_order_id)
        serializer = QuoteListSerializer(queryset, many=True)
        return Response(serializer.data)