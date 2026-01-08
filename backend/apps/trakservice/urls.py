"""
TrakService URLs

URL configuration for TrakService API endpoints.
Base path: /api/trakservice/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ServiceAssignmentViewSet,
    TechnicianProfileViewSet,
    TrakServiceHealthView,
    TrakServiceMetaView,
)

# Router for ViewSet-based endpoints
router = DefaultRouter()

# Dispatch (trakservice.dispatch)
router.register(r"technicians", TechnicianProfileViewSet, basename="technician")
router.register(r"assignments", ServiceAssignmentViewSet, basename="assignment")

# Future features
# router.register(r'routes', ServiceRouteViewSet, basename='service-route')
# router.register(r'tracking', TrackingViewSet, basename='tracking')
# router.register(r'quotes', QuoteViewSet, basename='quote')
# router.register(r'mileage', MileageViewSet, basename='mileage')

urlpatterns = [
    # Module metadata and health endpoints
    path("_meta/", TrakServiceMetaView.as_view(), name="trakservice-meta"),
    path("_health/", TrakServiceHealthView.as_view(), name="trakservice-health"),
    # ViewSet routes
    path("", include(router.urls)),
]
