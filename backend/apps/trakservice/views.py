"""
TrakService Views

API endpoints for TrakService module.
All endpoints are protected by TrakServiceFeatureRequired permission.
"""

import logging
from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.permissions import TrakServiceFeatureRequired

from .models import ServiceAssignment, TechnicianProfile
from .serializers import (
    ServiceAssignmentCreateSerializer,
    ServiceAssignmentSerializer,
    ServiceAssignmentStatusSerializer,
    ServiceAssignmentUpdateSerializer,
    TechnicianProfileCreateSerializer,
    TechnicianProfileListSerializer,
    TechnicianProfileSerializer,
    TrakServiceHealthSerializer,
    TrakServiceMetaSerializer,
)
from .services import TrakServiceMetaService

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
# Each is gated by its respective feature flag

# class ServiceJobViewSet(BaseFeatureViewSet):
#     """ViewSet for service job management (requires trakservice.dispatch)."""
#     trakservice_features = ['dispatch']

# class ServiceRouteViewSet(BaseFeatureViewSet):
#     """ViewSet for route management (requires trakservice.routing)."""
#     trakservice_features = ['routing']

# class TrackingViewSet(BaseFeatureViewSet):
#     """ViewSet for GPS tracking (requires trakservice.tracking)."""
#     trakservice_features = ['tracking']

# class QuoteViewSet(BaseFeatureViewSet):
#     """ViewSet for quote management (requires trakservice.quotes)."""
#     trakservice_features = ['quotes']

# class MileageViewSet(BaseFeatureViewSet):
#     """ViewSet for mileage/km tracking (requires trakservice.km)."""
#     trakservice_features = ['km']
