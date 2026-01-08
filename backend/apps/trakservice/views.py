"""
TrakService Views

API endpoints for TrakService module.
All endpoints are protected by TrakServiceFeatureRequired permission.
"""

import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.permissions import TrakServiceFeatureRequired

from .serializers import TrakServiceHealthSerializer, TrakServiceMetaSerializer
from .services import TrakServiceMetaService

logger = logging.getLogger(__name__)


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
# Placeholder ViewSets for Future Implementation
# =============================================================================


class BaseFeatureViewSet(viewsets.ViewSet):
    """
    Base ViewSet with TrakService feature gating.

    Subclasses should set `trakservice_features` to require specific features.
    """

    permission_classes = [IsAuthenticated, TrakServiceFeatureRequired]
    trakservice_features = []  # Override in subclass


# These ViewSets will be implemented as features are developed
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
